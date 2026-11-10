"""Turn whatever the user pasted into one canonical video key.

Every YouTube link shape (watch, youtu.be, Shorts, embed, live, mobile, with
?t=, &list=, ?si= ...) maps to the same `yt_<id>` key, so one video is one trip.
Plain Python: no Django imports.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal
from urllib.parse import parse_qs, urlparse

_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
_INSTAGRAM_RE = re.compile(r"\b(instagram\.com|instagr\.am)\b")

_YOUTUBE_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
}
_SHORT_HOSTS = {"youtu.be", "www.youtu.be"}
# /shorts/<id>, /embed/<id>, /live/<id>, /v/<id>
_PATH_ID_PREFIXES = {"shorts", "embed", "live", "v"}


@dataclass(frozen=True)
class ParsedVideo:
    platform: Literal["youtube"]
    video_id: str
    video_key: str
    canonical_url: str


@dataclass(frozen=True)
class ParseError:
    # not_a_url: plain text (the frontend runs it as a grid search instead)
    code: Literal["invalid_url", "instagram_unsupported", "not_a_url"]


def parse_video_url(text: str) -> ParsedVideo | ParseError:
    s = (text or "").strip()
    low = s.lower()

    if _INSTAGRAM_RE.search(low):
        return ParseError("instagram_unsupported")
    if not any(marker in low for marker in ("http", "www", "youtu")):
        return ParseError("not_a_url")

    try:
        parsed = urlparse(s if "://" in s else f"https://{s}")
        host = (parsed.hostname or "").lower()
    except ValueError:
        return ParseError("invalid_url")

    video_id = ""
    if host in _SHORT_HOSTS:
        video_id = parsed.path.lstrip("/").split("/")[0]
    elif host in _YOUTUBE_HOSTS:
        parts = [p for p in parsed.path.split("/") if p]
        if parts[:1] == ["watch"]:
            video_id = parse_qs(parsed.query).get("v", [""])[0]
        elif len(parts) >= 2 and parts[0] in _PATH_ID_PREFIXES:
            video_id = parts[1]

    if not _ID_RE.match(video_id):
        return ParseError("invalid_url")

    return ParsedVideo(
        platform="youtube",
        video_id=video_id,
        video_key=f"yt_{video_id}",
        canonical_url=f"https://www.youtube.com/watch?v={video_id}",
    )
