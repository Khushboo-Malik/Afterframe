"""Live updates over Server-Sent Events: GET /api/videos/<key>/events.

    retry: 3000                       browser reconnects 3s after we close
    event: meta    data: VideoOut     once per connection
    event: stage   data: {"stage"}    whenever it changes
    id: 101
    event: place   data: PlaceOut     each place with id > Last-Event-ID
    : ping                            every 10s, keeps proxies from timing out
    event: done    data: {"status", "count"}   or
    event: error   data: {"code": "failed|stalled|not_found"}

The stream polls the database every SSE_POLL_SECONDS and ends after
SSE_MAX_SECONDS; the browser then reconnects with Last-Event-ID and only
gets newer places. Short streams make any proxy timeout harmless.
"""

from __future__ import annotations

import asyncio
import json
import time

from django.http import StreamingHttpResponse
from django.views.decorators.http import require_GET
from rest_framework.utils.encoders import JSONEncoder

from core.config import SSE_MAX_SECONDS, SSE_POLL_SECONDS

from .models import Place, Video
from .repo import is_stale
from .serializers import PlaceOutSerializer, VideoOutSerializer

PING_SECONDS = 10


def _event(name: str, data: dict, event_id: int | None = None) -> str:
    head = f"id: {event_id}\n" if event_id is not None else ""
    return f"{head}event: {name}\ndata: {json.dumps(data, cls=JSONEncoder)}\n\n"


def _last_event_id(request) -> int:
    raw = request.headers.get("Last-Event-ID", "")
    return int(raw) if raw.isdigit() else 0


async def _get_video(key: str) -> Video | None:
    return await Video.objects.filter(key=key, is_hidden=False).afirst()


async def _stream(key: str, last_id: int):
    yield "retry: 3000\n\n"
    video = await _get_video(key)
    if video is None:
        yield _event("error", {"code": "not_found"})
        return
    yield _event("meta", VideoOutSerializer(video).data)

    started = last_ping = time.monotonic()
    last_stage = None
    while True:
        # Read the video before its places: once it says done, every place
        # it counted is already committed, so none can be missed. Places go
        # out before the stage, so "finished" never arrives ahead of the last
        # places when a run ends between two polls.
        async for p in Place.objects.filter(video_id=key, id__gt=last_id).order_by("id"):
            last_id = p.id
            yield _event("place", PlaceOutSerializer(p).data, event_id=p.id)

        if video.stage != last_stage:
            last_stage = video.stage
            yield _event("stage", {"stage": video.stage})

        if video.status in (Video.Status.DONE, Video.Status.PARTIAL):
            yield _event("done", {"status": video.status, "count": video.place_count})
            return
        if video.status == Video.Status.FAILED:
            yield _event("error", {"code": "failed"})
            return
        if is_stale(video):
            yield _event("error", {"code": "stalled"})
            return

        now = time.monotonic()
        if now - started >= SSE_MAX_SECONDS:
            return  # the browser reconnects with Last-Event-ID
        if now - last_ping >= PING_SECONDS:
            last_ping = now
            yield ": ping\n\n"

        await asyncio.sleep(SSE_POLL_SECONDS)
        video = await _get_video(key)
        if video is None:  # hidden mid-stream
            yield _event("error", {"code": "not_found"})
            return


@require_GET
async def video_events(request, key: str):
    response = StreamingHttpResponse(
        _stream(key, _last_event_id(request)), content_type="text/event-stream"
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"  # tells Nginx not to buffer the stream
    return response
