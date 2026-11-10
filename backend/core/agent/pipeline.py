"""Map one video: Gemini watches and streams candidates, each is checked on
Google Maps in a small thread pool, and results are saved in video order.

    extract ──c0──c1──c2──c3──…            (one Gemini stream, main thread)
               │   │   │   │
               ▼   ▼   ▼   ▼
    resolve   [ thread pool × RESOLVE_CONCURRENCY ]
               │   │   │   │
               ▼   ▼   ▼   ▼
    save      c0, c1, c2, c3 …             (always in ord order)

Futures wait in a queue in candidate order. After each new submission, every
finished future at the front of the queue is saved; when extraction ends, the
rest are saved in order. A fast c2 never jumps ahead of a slow c1, so map
numbers don't shift while the trip streams in.

All I/O comes in through PipelineDeps, so the Celery task, `try_ai pipeline`
and evals plug in their own. Plain Python: no Django imports.
"""

from __future__ import annotations

from collections import deque
from collections.abc import Callable, Iterable
from concurrent.futures import Future, ThreadPoolExecutor
from dataclasses import dataclass
from typing import Literal

from core.agent.extract import ExtractionPartialError
from core.agent.resolve_graph import AgentBudget, PlaceResult, SearchBudget
from core.agent.schemas import Candidate
from core.config import RESOLVE_CONCURRENCY
from core.llm import Usage


class StaleRunError(RuntimeError):
    """This run was superseded (its run_id is no longer the video's current one). Stop writing."""


@dataclass(frozen=True)
class Job:
    video_url: str
    title: str
    description: str
    duration_sec: int


@dataclass(frozen=True)
class PipelineDeps:
    """What run_pipeline needs from outside.

    - extract(video_url, title, description, duration_sec, *, usage) -> Candidates in order
      (production: core.agent.extract.extract_candidates)
    - resolve(candidate, *, title, budget, agent_budget, usage) -> PlaceResult
      (production: resolve_candidate with `search` and `agent_model` bound)
    - set_stage(stage) and save_place(result) record progress; save_place may raise
      StaleRunError.
    - usage, budget and agent_budget are this run's shared counters; the caller
      reads them afterwards (tokens, places_calls).
    """

    extract: Callable[..., Iterable[Candidate]]
    resolve: Callable[..., PlaceResult]
    set_stage: Callable[[str], object]
    save_place: Callable[[PlaceResult], object]
    usage: Usage
    budget: SearchBudget
    agent_budget: AgentBudget


@dataclass(frozen=True)
class RunResult:
    status: Literal["done", "partial"]
    place_count: int
    error_code: str | None  # extraction_partial | places_unavailable | search_budget


def run_pipeline(job: Job, deps: PipelineDeps) -> RunResult:
    """Raises ExtractionError (nothing found before Gemini failed) and StaleRunError."""
    deps.set_stage("watching")
    pending: deque[Future[PlaceResult]] = deque()
    saved: list[PlaceResult] = []
    extraction_partial = False

    def save_finished(*, wait: bool) -> None:
        """Save futures from the front of the queue: only finished ones, or all if wait."""
        while pending and (wait or pending[0].done()):
            result = pending.popleft().result()
            deps.save_place(result)  # StaleRunError propagates and ends the run
            saved.append(result)

    pool = ThreadPoolExecutor(RESOLVE_CONCURRENCY, thread_name_prefix="resolve")
    candidates = deps.extract(
        job.video_url, job.title, job.description, job.duration_sec, usage=deps.usage
    )
    try:
        try:
            for i, c in enumerate(candidates):
                if i == 0:
                    deps.set_stage("verifying")
                pending.append(
                    pool.submit(
                        deps.resolve,
                        c,
                        title=job.title,
                        budget=deps.budget,
                        agent_budget=deps.agent_budget,
                        usage=deps.usage,
                    )
                )
                save_finished(wait=False)
        except ExtractionPartialError:
            extraction_partial = True  # keep what was found; finish checking it
        save_finished(wait=True)
    finally:
        # On any early exit (stale run, crash): stop the Gemini stream and drop
        # queued candidates. At most RESOLVE_CONCURRENCY already running finish
        # in the background and are discarded.
        close = getattr(candidates, "close", None)
        if close:
            close()
        pool.shutdown(wait=False, cancel_futures=True)

    if extraction_partial:
        code = "extraction_partial"
    elif any(r.places_error for r in saved):
        code = "places_unavailable"
    elif any(r.budget_exhausted for r in saved):
        code = "search_budget"
    else:
        code = None
    return RunResult("partial" if code else "done", len(saved), code)
