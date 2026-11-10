"""Shapes Gemini fills in, and the cleaned-up candidate the rest of the app uses.

Plain Python: no Django imports. `Category` mirrors the Django TextChoices enum.
No field has a default: the Gemini API rejects default values in response schemas.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, Field

Category = Literal["food", "stay", "attraction", "activity", "shopping", "other"]


class RawCandidate(BaseModel):
    """One place exactly as Gemini reports it (response_schema=list[RawCandidate])."""

    name: str = Field(description="The place's name as said or shown, in Latin script")
    category: Category
    city: str | None
    country: str | None
    timestamp: str = Field(description='First appearance, "MM:SS" or "H:MM:SS"')
    description: str = Field(
        description="1-2 English sentences, only from what is said or shown in the video"
    )


@dataclass(frozen=True)
class Candidate:
    """A validated, de-duplicated place, numbered in stream order from 0."""

    ord: int
    name: str
    category: str
    city: str | None
    country: str | None
    timestamp_sec: int
    description: str
