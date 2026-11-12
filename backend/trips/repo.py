"""Every database read/write the mapping flow needs, in one place.

Run fencing: each claim gives the video a new `run_id`. The Celery task gets
that id, and every write it makes (`set_stage`, `save_place`, `finish_video`)
only lands while `videos.run_id` still equals it. Otherwise it raises
StaleRunError, so a slow old run or a redelivered task can never mix its
places into a newer run.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import timedelta
from typing import Literal

from django.db import connection, transaction
from django.db.models import F
from django.db.models.functions import Now
from django.utils import timezone

from core.agent.pipeline import StaleRunError  # shared with the pipeline
from core.agent.resolve_graph import PlaceResult
from core.config import GRID_PAGE_SIZE, PARTIAL_RETRY_SECONDS, STALE_PROCESSING_SECONDS
from core.llm import Usage
from core.youtube import YouTubeMeta

from .models import Place, Video


@dataclass(frozen=True)
class Trip:
    video: Video
    places: list[Place]  # ordered by ord
    stale: bool  # processing, but no progress for STALE_PROCESSING_SECONDS


def is_stale(video: Video, now=None) -> bool:
    now = now or timezone.now()
    return video.status == Video.Status.PROCESSING and video.updated_at < now - timedelta(
        seconds=STALE_PROCESSING_SECONDS
    )


def partial_retryable(video: Video, now=None) -> bool:
    """A partial trip may be mapped again once it's PARTIAL_RETRY_SECONDS old."""
    now = now or timezone.now()
    return video.status == Video.Status.PARTIAL and video.updated_at < now - timedelta(
        seconds=PARTIAL_RETRY_SECONDS
    )


# One statement: insert a new video, or take over an existing one only when it
# is claimable (failed, stuck processing, or an old partial). Postgres locks the
# row, so two simultaneous submits of the same link can't both claim it.
_CLAIM_SQL = """
INSERT INTO videos (
    key, platform, url, title, channel, description, duration_sec, thumbnail_url,
    status, stage, error_code, place_count, is_hidden, run_id,
    gemini_input_tokens, gemini_output_tokens, places_calls, run_ms,
    created_at, updated_at
) VALUES (
    %(key)s, 'youtube', %(url)s, %(title)s, %(channel)s, %(description)s,
    %(duration_sec)s, %(thumbnail_url)s,
    'processing', 'queued', NULL, 0, false, %(run_id)s,
    0, 0, 0, NULL,
    now(), now()
)
ON CONFLICT (key) DO UPDATE SET
    url = EXCLUDED.url,
    title = EXCLUDED.title,
    channel = EXCLUDED.channel,
    description = EXCLUDED.description,
    duration_sec = EXCLUDED.duration_sec,
    thumbnail_url = EXCLUDED.thumbnail_url,
    status = 'processing',
    stage = 'queued',
    error_code = NULL,
    place_count = 0,
    run_id = EXCLUDED.run_id,
    gemini_input_tokens = 0,
    gemini_output_tokens = 0,
    places_calls = 0,
    run_ms = NULL,
    updated_at = now()
WHERE videos.is_hidden = false AND (
    videos.status = 'failed'
    OR (videos.status = 'processing'
        AND videos.updated_at < now() - make_interval(secs => %(stale_secs)s))
    OR (videos.status = 'partial'
        AND videos.updated_at < now() - make_interval(secs => %(partial_secs)s))
)
RETURNING key, run_id
"""


def claim_video(
    key: str, meta: YouTubeMeta, url: str
) -> tuple[Literal["claimed"], uuid.UUID] | tuple[Literal["processing", "done"], None]:
    """Claim the video for a new run. Returns ("claimed", run_id), or the
    status that blocks the claim ("partial" maps to "done")."""
    run_id = uuid.uuid4()
    with transaction.atomic():
        with connection.cursor() as cur:
            cur.execute(
                _CLAIM_SQL,
                {
                    "key": key,
                    "url": url,
                    "title": meta.title,
                    "channel": meta.channel,
                    "description": meta.description,
                    "duration_sec": meta.duration_sec,
                    "thumbnail_url": meta.thumbnail_url,
                    "run_id": run_id,
                    "stale_secs": STALE_PROCESSING_SECONDS,
                    "partial_secs": PARTIAL_RETRY_SECONDS,
                },
            )
            row = cur.fetchone()
        if row:
            # Fresh run: drop the previous run's places in the same transaction.
            Place.objects.filter(video_id=key).delete()
            return "claimed", row[1]

    status = Video.objects.filter(key=key).values_list("status", flat=True).first()
    if status == Video.Status.PROCESSING:
        return "processing", None
    return "done", None


def begin_run(key: str, run_id) -> bool:
    """Called first by the Celery task. False if this run was superseded (or
    already finished): the task should exit quietly. Otherwise wipes anything
    an earlier delivery of this same run wrote, so a redelivery starts clean."""
    with transaction.atomic():
        updated = Video.objects.filter(
            key=key, run_id=run_id, status=Video.Status.PROCESSING
        ).update(stage=Video.Stage.QUEUED, place_count=0, error_code=None, updated_at=Now())
        if not updated:
            return False
        Place.objects.filter(video_id=key, run_id=run_id).delete()
    return True


def _fenced_update(key: str, run_id, **fields) -> None:
    if not Video.objects.filter(key=key, run_id=run_id).update(updated_at=Now(), **fields):
        raise StaleRunError(f"{key}: run {run_id} is no longer current")


def set_stage(key: str, run_id, stage: str) -> None:
    _fenced_update(key, run_id, stage=stage)


def save_place(key: str, run_id, r: PlaceResult) -> Place:
    """Insert one checked place and bump place_count, only if run_id is current."""
    c, hit = r.candidate, r.hit
    with transaction.atomic():
        # Locks the video row until commit, so a concurrent re-claim waits and
        # then deletes this place along with the rest of the old run.
        _fenced_update(key, run_id, place_count=F("place_count") + 1)
        return Place.objects.create(
            video_id=key,
            run_id=run_id,
            ord=c.ord,
            name=c.name[:200],
            category=c.category,
            timestamp_sec=c.timestamp_sec,
            description=c.description,
            verification=r.verification,
            match_score=round(r.match_score, 3),
            resolved_by=r.resolved_by,
            place_id=hit.place_id if hit else None,
            lat=hit.lat if hit else None,
            lng=hit.lng if hit else None,
            address=hit.address if hit else None,
            fetched_at=timezone.now() if hit else None,
        )


def finish_video(
    key: str,
    run_id,
    status: str,
    *,
    error_code: str | None,
    usage: Usage | None = None,
    places_calls: int = 0,
    run_ms: int | None = None,
) -> None:
    _fenced_update(
        key,
        run_id,
        status=status,
        stage=Video.Stage.FINISHED,
        error_code=error_code,
        gemini_input_tokens=usage.input_tokens if usage else 0,
        gemini_output_tokens=usage.output_tokens if usage else 0,
        places_calls=places_calls,
        run_ms=run_ms,
    )


def get_trip(key: str, *, include_hidden: bool = False) -> Trip | None:
    """The video and its places. Hidden videos count as missing unless
    include_hidden (services.submit_video needs to see them to answer 404)."""
    qs = Video.objects.all() if include_hidden else Video.objects.filter(is_hidden=False)
    video = qs.filter(key=key).first()
    if video is None:
        return None
    places = list(Place.objects.filter(video_id=key).order_by("ord"))
    return Trip(video=video, places=places, stale=is_stale(video))


def list_grid(page: int, q: str = "") -> tuple[list[Video], bool]:
    """The public list (home chips, /trips): trips the owner featured in /admin,
    done or partial, not hidden, with places, newest first."""
    qs = Video.objects.filter(
        status__in=[Video.Status.DONE, Video.Status.PARTIAL],
        is_hidden=False,
        is_featured=True,
        place_count__gt=0,
    ).order_by("-created_at", "key")
    if q:
        qs = qs.filter(title__icontains=q)
    start = (max(page, 1) - 1) * GRID_PAGE_SIZE
    rows = list(qs[start : start + GRID_PAGE_SIZE + 1])  # one extra row tells us has_more
    return rows[:GRID_PAGE_SIZE], len(rows) > GRID_PAGE_SIZE
