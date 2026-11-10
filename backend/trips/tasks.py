"""Celery tasks. map_video_task runs the AI pipeline for one claimed video."""

from __future__ import annotations

import logging
import time
from functools import partial

from celery import shared_task
from django.db import connection
from django.utils import timezone

from core.agent.extract import extract_candidates
from core.agent.pipeline import Job, PipelineDeps, StaleRunError, run_pipeline
from core.agent.resolve_graph import AgentBudget, SearchBudget, make_resolver_model, resolve_candidate
from core.config import MAX_SEARCHES_PER_VIDEO
from core.llm import Usage
from core.places import search_places

from . import repo
from .models import Video
from .refresh import refresh_stale_places

log = logging.getLogger(__name__)


@shared_task(acks_late=True, max_retries=0, soft_time_limit=540, time_limit=600, ignore_result=True)
def map_video_task(key: str, run_id: str) -> None:
    if not repo.begin_run(key, run_id):
        log.info("map_video %s: run %s superseded or finished; skipping", key, run_id)
        return

    start = time.monotonic()
    budget, usage = SearchBudget(MAX_SEARCHES_PER_VIDEO), Usage()
    elapsed_ms = lambda: int((time.monotonic() - start) * 1000)  # noqa: E731
    places_calls = lambda: MAX_SEARCHES_PER_VIDEO - budget.remaining  # noqa: E731

    try:
        video = Video.objects.get(key=key)
        deps = PipelineDeps(
            extract=extract_candidates,
            resolve=partial(resolve_candidate, search=search_places, agent_model=make_resolver_model()),
            set_stage=partial(repo.set_stage, key, run_id),
            save_place=partial(repo.save_place, key, run_id),
            usage=usage,
            budget=budget,
            agent_budget=AgentBudget(),
        )
        job = Job(video.url, video.title, video.description, video.duration_sec)
        result = run_pipeline(job, deps)
        status, error_code = result.status, result.error_code
        log.info("map_video %s: %s, %d places, %s", key, status, result.place_count, usage)
    except StaleRunError:
        log.info("map_video %s: run %s superseded mid-run; stopping", key, run_id)
        return
    except Exception:  # includes ExtractionError and Celery's SoftTimeLimitExceeded
        log.exception("map_video %s: run %s failed", key, run_id)
        status, error_code = Video.Status.FAILED, "failed"

    try:
        repo.finish_video(
            key, run_id, status,
            error_code=error_code, usage=usage, places_calls=places_calls(), run_ms=elapsed_ms(),
        )
    except StaleRunError:
        log.info("map_video %s: run %s superseded before finishing", key, run_id)


# --- Daily jobs (Celery Beat schedule in config/celery.py) ---
@shared_task(ignore_result=True)
def refresh_places_task() -> int:
    n = refresh_stale_places(now=timezone.now())
    log.info("refresh_places: %d places refreshed", n)
    return n


@shared_task(ignore_result=True)
def db_keepalive_task() -> None:
    """A tiny daily query, so the free Supabase project never pauses for inactivity."""
    with connection.cursor() as cur:
        cur.execute("SELECT 1")
        cur.fetchone()
    log.info("db_keepalive: ok")
