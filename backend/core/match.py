"""Name matching and match scoring. Plain Python: no Django imports.

A Google result is scored against what the video said:

    score = 0.7 * name_similarity + 0.3 * location

- name_similarity: word overlap (Jaccard) of the normalized names, 0..1.
- location: 1 if the result's address mentions the candidate's city, or
  failing that its country, else 0.

Worked examples (these must keep holding):
    "Café de Flore" vs "Cafe de Flore", Paris               -> 1.0   verified
    "Blue Door Cafe" vs "Blue Door Bakery & Cafe", Goa      -> 0.825 verified
    the same pair, no location hint                         -> 0.525 needs_review
    "Joe's" vs "Eiffel Tower", Paris                        -> 0.3   unmatched
"""

from __future__ import annotations

import re
import unicodedata
from typing import TYPE_CHECKING, Literal

if TYPE_CHECKING:
    from core.agent.schemas import Candidate
    from core.places import PlaceHit

Verification = Literal["verified", "needs_review", "unmatched"]

VERIFIED_AT = 0.75
NEEDS_REVIEW_AT = 0.45
NAME_WEIGHT = 0.7
LOCATION_WEIGHT = 0.3

_PUNCT_RE = re.compile(r"[^\w\s]|_")


def normalize_name(s: str) -> str:
    """'Café de Flore!' -> 'cafe de flore'.

    Lowercase, strip accents (NFKD, drop combining marks), turn punctuation
    and '&' into spaces, collapse whitespace.
    """
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace("&", " ")
    s = _PUNCT_RE.sub(" ", s)
    return " ".join(s.split())


def name_similarity(a: str, b: str) -> float:
    """Share of words the two names have in common (Jaccard of word sets), 0..1."""
    wa, wb = set(normalize_name(a).split()), set(normalize_name(b).split())
    if not wa or not wb:
        return 0.0
    return len(wa & wb) / len(wa | wb)


def location_match(c: Candidate, address: str) -> float:
    """1.0 if the address mentions the city, or failing that the country; else 0.0.

    The country is a fallback even when a city is given: Google often writes the
    city in the local language despite languageCode="en" ("Lisboa, Portugal" for
    Lisbon), but the country in English. Compared as whole words, so city "Rome"
    doesn't match "Romeo Street".
    """
    addr = f" {normalize_name(address)} "
    for hint in (c.city, c.country):
        hint = normalize_name(hint or "")
        if hint and f" {hint} " in addr:
            return 1.0
    return 0.0


def score_match(c: Candidate, hit: PlaceHit) -> float:
    return round(
        NAME_WEIGHT * name_similarity(c.name, hit.name)
        + LOCATION_WEIGHT * location_match(c, hit.address),
        4,
    )


def classify(score: float) -> Verification:
    if score >= VERIFIED_AT:
        return "verified"
    if score >= NEEDS_REVIEW_AT:
        return "needs_review"
    return "unmatched"


def best_hit(c: Candidate, hits: list[PlaceHit]) -> tuple[PlaceHit | None, float]:
    """The highest-scoring hit and its score; (None, 0.0) for no hits."""
    best, best_score = None, 0.0
    for hit in hits:
        score = score_match(c, hit)
        if best is None or score > best_score:
            best, best_score = hit, score
    return best, best_score
