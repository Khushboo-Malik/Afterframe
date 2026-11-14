"""One Redis connection pool per process, shared by every Django cache object.

Under ASGI, Django gives each request its own cache object (caches are
context-local), and Django's RedisCache gives each object its own pool. So
every request opened a brand-new Redis connection (DNS lookup + connect +
AUTH). On Railway's private network that cost ~1.7 s per throttled request.
`from_url` here hands back the same pool for the same URL, so connections are
opened once and reused. redis-py resets a pool by itself after a fork, so
Celery's prefork children are safe.
"""

import threading

import redis


class SharedConnectionPool(redis.ConnectionPool):
    _pools: dict[str, "SharedConnectionPool"] = {}
    _lock = threading.Lock()

    @classmethod
    def from_url(cls, url, **kwargs):
        # Keyed by URL only: Django passes the same options every time (they
        # come from settings), but some of them are fresh objects on each call.
        with cls._lock:
            pool = cls._pools.get(url)
            if pool is None:
                pool = super().from_url(url, **kwargs)
                cls._pools[url] = pool
            return pool
