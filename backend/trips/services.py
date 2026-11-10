"""Submitting a link: shared by the DRF API and (later) the MCP server.

The order is fixed so that cheap checks run first and nothing that can't be
mapped (private, too long, already mapped) ever uses a daily slot:
parse → existing trip → daily limit → YouTube check → claim → queue.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Literal

import httpx

from core.video_url import ParseError, parse_video_url
from core.youtube import MetaError, YouTubeError, get_youtube_meta

from . import rate_limit, repo
from .models import Video

log = logging.getLogger(__name__)

# The user-facing copy from Screens & states. The frontend shows `message` as-is.
ERRORS: dict[str, tuple[int, str]] = {
    "invalid_url": (400, "That doesn't look like a YouTube link."),
    "instagram_unsupported": (422, "Instagram support is coming soon — try a YouTube link."),
    "not_found": (404, "We can't open that video. Is it public?"),
    "private": (403, "We can't open that video. Is it public?"),
    "too_long": (422, "That one's over 30 minutes — try a shorter vlog."),
    "rate_limited": (429, "Today's free mapping slots are used up 🎒 — explore the trips below."),
    "busy": (503, "We're a bit busy — try again in a minute."),
    "failed": (500, "Something went wrong on our side."),
}

MAX_URL_CHARS = 500


@dataclass(frozen=True)
class SubmitOk:
    video_key: str
    status: Literal["done", "partial", "processing"]
    http: Literal[200, 202]


@dataclass(frozen=True)
class ApiError:
    code: str
    message: str
    http: int


def api_error(code: str) -> ApiError:
    http, message = ERRORS[code]
    return ApiError(code, message, http)


def submit_video(url: str) -> SubmitOk | ApiError:
    # 1. parse
    if not isinstance(url, str) or len(url) > MAX_URL_CHARS:
        return api_error("invalid_url")
    parsed = parse_video_url(url)
    if isinstance(parsed, ParseError):
        code = "instagram_unsupported" if parsed.code == "instagram_unsupported" else "invalid_url"
        return api_error(code)
    key = parsed.video_key

    # 2. an existing trip (hidden ones too, so they can answer 404)
    trip = repo.get_trip(key, include_hidden=True)
    if trip:
        v = trip.video
        if v.is_hidden:
            return api_error("not_found")
        if v.status == Video.Status.DONE:
            return SubmitOk(key, "done", 200)
        if v.status == Video.Status.PARTIAL and not repo.partial_retryable(v):
            return SubmitOk(key, "partial", 200)
        if v.status == Video.Status.PROCESSING and not trip.stale:
            return SubmitOk(key, "processing", 202)
        # failed, stale processing, or an old partial: fall through and map it again

    # 3. the site-wide daily limit
    limit = rate_limit.check()
    if isinstance(limit, rate_limit.Limited):
        return api_error("busy" if limit.reason == "unavailable" else "rate_limited")

    # 4. YouTube: does it exist, is it public, is it short enough?
    try:
        meta = get_youtube_meta(parsed.video_id)
    except (YouTubeError, httpx.HTTPError):
        log.exception("submit %s: YouTube Data API failed", key)
        return api_error("busy")
    if isinstance(meta, MetaError):
        return api_error(meta.code)

    # 5. claim, count it, queue the job
    outcome, run_id = repo.claim_video(key, meta, parsed.canonical_url)
    if outcome == "processing":
        return SubmitOk(key, "processing", 202)
    if outcome == "done":
        return SubmitOk(key, "done", 200)

    rate_limit.record()
    from .tasks import map_video_task  # imported here: tasks pulls in the whole AI stack

    try:
        map_video_task.delay(key, str(run_id))
    except Exception:
        # The queue (Redis) is down: don't leave the video stuck "processing".
        log.exception("submit %s: could not queue the job", key)
        repo.finish_video(key, run_id, Video.Status.FAILED, error_code="failed")
        return api_error("busy")
    return SubmitOk(key, "processing", 202)
