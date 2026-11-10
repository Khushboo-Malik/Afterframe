"""Keep stored Google data fresh (Google Maps Platform terms).

`place_id` may be stored forever; coordinates and address must be refreshed
within 30 days. Every day, Celery Beat re-reads up to PLACES_REFRESH_PER_DAY
places whose data is older than PLACES_REFRESH_DAYS, oldest first, with the
Place Details Essentials field mask (location, formattedAddress).
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import datetime, timedelta

import httpx

from core import places
from core.config import PLACES_REFRESH_DAYS, PLACES_REFRESH_PER_DAY

from .models import Place

log = logging.getLogger(__name__)


def refresh_stale_places(
    *,
    details: Callable[[str], places.PlaceDetails | None] = places.get_place_details,
    now: datetime,
    limit: int = PLACES_REFRESH_PER_DAY,
) -> int:
    """Returns how many places were updated. Stops early if the Places API
    errors (quota, bad key, outage); the rest wait for tomorrow."""
    cutoff = now - timedelta(days=PLACES_REFRESH_DAYS)
    due = Place.objects.filter(place_id__isnull=False, fetched_at__lt=cutoff).order_by("fetched_at")
    updated = 0
    for p in due[:limit]:
        try:
            d = details(p.place_id)
        except (places.PlacesError, httpx.HTTPError):
            log.exception("refresh: Places Details failed for place %s; stopping for today", p.pk)
            break
        if d is None:
            # Google no longer knows this place: it drops off the map.
            Place.objects.filter(pk=p.pk).update(
                place_id=None, lat=None, lng=None, address=None,
                verification=Place.Verification.UNMATCHED, fetched_at=now,
            )
        else:
            Place.objects.filter(pk=p.pk).update(
                address=d.address, lat=d.lat, lng=d.lng, fetched_at=now
            )
        updated += 1
    return updated
