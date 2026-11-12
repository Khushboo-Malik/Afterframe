"""AfterFrame limits and env access.

Plain Python: no Django imports anywhere in `core/`.
Env reads happen inside functions, so importing this module never needs
secrets (CI and Docker builds run without a backend/.env).
"""

import os

# --- Limits (see 00-overview.md, Global Constraints) ---
MAX_VIDEO_SECONDS = 1800
GLOBAL_DAILY_NEW = 10
MAX_CANDIDATES = 20
MAX_SEARCHES_PER_VIDEO = 26
MAX_AGENT_SEARCHES_PER_CANDIDATE = 2
AGENT_MAX_TURNS = 4
MAX_AGENT_CANDIDATES_PER_VIDEO = 6
RESOLVE_CONCURRENCY = 3
CELERY_CONCURRENCY = 2
STALE_PROCESSING_SECONDS = 900
PARTIAL_RETRY_SECONDS = 86400
SSE_POLL_SECONDS = 1.0
SSE_MAX_SECONDS = 25
PLACES_REFRESH_DAYS = 29
PLACES_REFRESH_PER_DAY = 100
GRID_PAGE_SIZE = 24

_TRUE = {"1", "true", "yes", "on"}


class MissingEnvError(RuntimeError):
    """A required env var is unset or blank."""


def require_env(name: str) -> str:
    """Return a non-empty env var or fail with a message that says where to set it."""
    value = os.getenv(name, "").strip()
    if not value:
        raise MissingEnvError(
            f"{name} is not set. Add it to backend/.env (see backend/.env.example)."
        )
    return value


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    return raw.strip().lower() in _TRUE


def env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    return int(raw) if raw else default


def is_debug() -> bool:
    return env_bool("DEBUG", False)


# --- Env overrides ---
def global_daily_new() -> int:
    """Site-wide new videos per UTC day. Override with GLOBAL_DAILY_NEW for heavy test days."""
    return env_int("GLOBAL_DAILY_NEW", GLOBAL_DAILY_NEW)


def rate_limit_disabled() -> bool:
    """RATE_LIMIT_DISABLED is honored only when DEBUG=true, so it can never switch off limits in prod."""
    return is_debug() and env_bool("RATE_LIMIT_DISABLED", False)
