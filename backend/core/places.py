"""Google Places API (New): text search and the 30-day coordinate refresh.

Field masks stay on the cheap SKUs: Text Search asks only for id, name,
address, location and types; Details asks only for the Essentials fields
`location,formattedAddress`. Never add rating/photos/hours (Enterprise).
Plain Python: no Django imports.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import httpx

from core.config import require_env

SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
DETAILS_URL = "https://places.googleapis.com/v1/places/{place_id}"
SEARCH_FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,places.location,places.types"
)
DETAILS_FIELD_MASK = "location,formattedAddress"
TIMEOUT = httpx.Timeout(10.0)


@dataclass(frozen=True)
class PlaceHit:
    place_id: str
    name: str
    address: str
    lat: float
    lng: float
    types: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class PlaceDetails:
    address: str
    lat: float
    lng: float


class PlacesError(RuntimeError):
    def __init__(self, status: int):
        super().__init__(f"Places API returned HTTP {status}")
        self.status = status


def _headers(field_mask: str) -> dict[str, str]:
    return {
        "X-Goog-Api-Key": require_env("GOOGLE_SERVER_API_KEY"),
        "X-Goog-FieldMask": field_mask,
    }


def search_places(query: str) -> list[PlaceHit]:
    resp = httpx.post(
        SEARCH_URL,
        headers=_headers(SEARCH_FIELD_MASK),
        json={"textQuery": query, "languageCode": "en", "pageSize": 5},
        timeout=TIMEOUT,
    )
    if not resp.is_success:
        raise PlacesError(resp.status_code)

    hits = []
    for p in resp.json().get("places") or []:
        loc = p.get("location") or {}
        if not p.get("id") or "latitude" not in loc or "longitude" not in loc:
            continue
        hits.append(
            PlaceHit(
                place_id=p["id"],
                name=(p.get("displayName") or {}).get("text", ""),
                address=p.get("formattedAddress", ""),
                lat=loc["latitude"],
                lng=loc["longitude"],
                types=list(p.get("types") or []),
            )
        )
    return hits


def get_place_details(place_id: str) -> PlaceDetails | None:
    """Fresh address + coordinates for a stored place_id; None if Google dropped it."""
    resp = httpx.get(
        DETAILS_URL.format(place_id=place_id),
        params={"languageCode": "en"},
        headers=_headers(DETAILS_FIELD_MASK),
        timeout=TIMEOUT,
    )
    if resp.status_code == 404:
        return None
    if not resp.is_success:
        raise PlacesError(resp.status_code)

    data = resp.json()
    loc = data.get("location") or {}
    if "latitude" not in loc or "longitude" not in loc:
        return None
    return PlaceDetails(
        address=data.get("formattedAddress", ""),
        lat=loc["latitude"],
        lng=loc["longitude"],
    )
