"""Site-wide daily limit on NEW videos (5 per UTC day by default).

One Redis counter per day: `rl:global:2026-11-10`, INCR + EXPIRE 2 days.
No IPs or visitor data are involved. If Redis can't be reached, `check()`
answers Limited("unavailable") and the API replies `busy` (fail closed).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal

import redis
from django.conf import settings

from core.config import global_daily_new, rate_limit_disabled

log = logging.getLogger(__name__)

KEY_TTL_SECONDS = 172800  # 2 days: a day's key outlives the day, then cleans itself up


@dataclass(frozen=True)
class Allowed:
    pass


@dataclass(frozen=True)
class Limited:
    reason: Literal["global_limit", "unavailable"]


_client: redis.Redis | None = None


def _redis() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.Redis.from_url(
            settings.REDIS_URL, socket_timeout=2, socket_connect_timeout=2
        )
    return _client


def _key(now: datetime | None = None) -> str:
    return f"rl:global:{(now or datetime.now(UTC)):%Y-%m-%d}"


def check() -> Allowed | Limited:
    if rate_limit_disabled():
        return Allowed()
    try:
        used = int(_redis().get(_key()) or 0)
    except redis.RedisError:
        log.warning("rate_limit.check: Redis unavailable", exc_info=True)
        return Limited("unavailable")
    return Allowed() if used < global_daily_new() else Limited("global_limit")


def record() -> None:
    """Count one new video against today's limit."""
    try:
        pipe = _redis().pipeline()
        pipe.incr(_key())
        pipe.expire(_key(), KEY_TTL_SECONDS)
        pipe.execute()
    except redis.RedisError:
        log.warning("rate_limit.record: Redis unavailable", exc_info=True)
