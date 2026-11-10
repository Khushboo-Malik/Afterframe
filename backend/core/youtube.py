"""YouTube Data API v3: video metadata plus the privacy / length checks.

One `videos.list` call costs 1 quota unit (10,000 free per day).
The key goes in the X-Goog-Api-Key header, never in the URL, so it never
shows up in request logs. Plain Python: no Django imports.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

import httpx

from core.config import MAX_VIDEO_SECONDS, require_env

VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"
TIMEOUT = httpx.Timeout(10.0)
DESCRIPTION_MAX = 2000

_DURATION_RE = re.compile(
    r"^P(?:(?P<d>\d+)D)?(?:T(?:(?P<h>\d+)H)?(?:(?P<m>\d+)M)?(?:(?P<s>\d+)S)?)?$"
)
_THUMB_ORDER = ("maxres", "standard", "high", "medium", "default")


@dataclass(frozen=True)
class YouTubeMeta:
    title: str
    channel: str
    description: str
    duration_sec: int
    thumbnail_url: str


@dataclass(frozen=True)
class MetaError:
    code: Literal["not_found", "private", "too_long"]


class YouTubeError(RuntimeError):
    """The API itself failed (quota, bad key, outage): not a fact about the video."""

    def __init__(self, status: int):
        super().__init__(f"YouTube Data API returned HTTP {status}")
        self.status = status


def parse_iso_duration(value: str | None) -> int | None:
    """'PT1H2M3S' -> 3723. Returns None when missing or malformed."""
    if not value:
        return None
    m = _DURATION_RE.match(value)
    if not m:
        return None
    d, h, mi, s = (int(m.group(g) or 0) for g in ("d", "h", "m", "s"))
    return ((d * 24 + h) * 60 + mi) * 60 + s


def _best_thumbnail(thumbnails: dict) -> str:
    for size in _THUMB_ORDER:
        url = (thumbnails.get(size) or {}).get("url")
        if url:
            return url
    return ""


def get_youtube_meta(video_id: str) -> YouTubeMeta | MetaError:
    resp = httpx.get(
        VIDEOS_URL,
        params={"part": "snippet,contentDetails,status", "id": video_id},
        headers={"X-Goog-Api-Key": require_env("GOOGLE_SERVER_API_KEY")},
        timeout=TIMEOUT,
    )
    if not resp.is_success:
        raise YouTubeError(resp.status_code)

    items = resp.json().get("items") or []
    if not items:
        # Deleted, wrong ID, or private (the API hides private videos entirely).
        return MetaError("not_found")
    item = items[0]
    snippet = item.get("snippet") or {}

    if (item.get("status") or {}).get("privacyStatus") in ("private", "unlisted"):
        return MetaError("private")

    duration = parse_iso_duration((item.get("contentDetails") or {}).get("duration"))
    # Live streams report P0D; upcoming premieres have no real duration yet.
    if not duration or snippet.get("liveBroadcastContent") in ("live", "upcoming"):
        return MetaError("not_found")
    if duration > MAX_VIDEO_SECONDS:
        return MetaError("too_long")

    return YouTubeMeta(
        title=snippet.get("title", ""),
        channel=snippet.get("channelTitle", ""),
        description=(snippet.get("description") or "")[:DESCRIPTION_MAX],
        duration_sec=duration,
        thumbnail_url=_best_thumbnail(snippet.get("thumbnails") or {}),
    )
