"""Videos and the places found in them (see 00-overview.md, Data model).

Writes that belong to a mapping run go through trips/repo.py, which fences
every write on `run_id`. Timestamps are set explicitly there (no auto_now),
so an admin save of `is_hidden` never moves `updated_at`.
"""

import uuid

from django.db import models
from django.utils import timezone


class Video(models.Model):
    class Platform(models.TextChoices):
        YOUTUBE = "youtube", "YouTube"

    class Status(models.TextChoices):
        PROCESSING = "processing", "Processing"
        DONE = "done", "Done"
        PARTIAL = "partial", "Partial"
        FAILED = "failed", "Failed"

    class Stage(models.TextChoices):
        QUEUED = "queued", "Queued"
        WATCHING = "watching", "Watching"
        VERIFYING = "verifying", "Verifying"
        FINISHED = "finished", "Finished"

    key = models.CharField(primary_key=True, max_length=32)  # "yt_<11-char id>"
    platform = models.CharField(max_length=16, choices=Platform.choices, default=Platform.YOUTUBE)
    url = models.URLField(max_length=500)
    title = models.CharField(max_length=300)
    channel = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    duration_sec = models.PositiveIntegerField()
    thumbnail_url = models.URLField(max_length=500, blank=True)

    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PROCESSING)
    stage = models.CharField(max_length=16, choices=Stage.choices, default=Stage.QUEUED)
    error_code = models.CharField(max_length=32, null=True, blank=True)
    place_count = models.PositiveIntegerField(default=0)
    is_hidden = models.BooleanField(default=False)
    # Listed on the home page and /trips only when the owner ticks it in /admin.
    # db_default: repo.claim_video inserts rows with raw SQL that doesn't name this column.
    is_featured = models.BooleanField("featured", default=False, db_default=False)
    run_id = models.UUIDField(default=uuid.uuid4)  # the current run; see repo.claim_video

    gemini_input_tokens = models.PositiveIntegerField(default=0)
    gemini_output_tokens = models.PositiveIntegerField(default=0)
    places_calls = models.PositiveIntegerField(default=0)
    run_ms = models.PositiveIntegerField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "videos"
        indexes = [models.Index(fields=["-created_at"], name="videos_created_idx")]

    def __str__(self) -> str:
        return self.title or self.key

    @property
    def video_id(self) -> str:
        """The platform's own id: "yt_AbC123xYz_9" -> "AbC123xYz_9"."""
        return self.key.split("_", 1)[1]


class Place(models.Model):
    class Category(models.TextChoices):
        FOOD = "food", "Food"
        STAY = "stay", "Stay"
        ATTRACTION = "attraction", "Attraction"
        ACTIVITY = "activity", "Activity"
        SHOPPING = "shopping", "Shopping"
        OTHER = "other", "Other"

    class Verification(models.TextChoices):
        VERIFIED = "verified", "Verified"
        NEEDS_REVIEW = "needs_review", "Needs review"
        UNMATCHED = "unmatched", "Unmatched"

    class ResolvedBy(models.TextChoices):
        DIRECT = "direct", "Direct"
        AGENT = "agent", "Agent"
        NONE = "none", "None"

    # id (auto) doubles as the live-update event id.
    video = models.ForeignKey(
        Video, on_delete=models.CASCADE, related_name="places", db_column="video_key"
    )
    run_id = models.UUIDField()
    ord = models.PositiveIntegerField()  # order found in the video: 0, 1, 2...
    name = models.CharField(max_length=200)  # as said in the video
    category = models.CharField(max_length=16, choices=Category.choices)
    timestamp_sec = models.PositiveIntegerField()
    description = models.TextField(blank=True)

    verification = models.CharField(max_length=16, choices=Verification.choices)
    match_score = models.FloatField(default=0.0)
    resolved_by = models.CharField(max_length=8, choices=ResolvedBy.choices)
    place_id = models.CharField(max_length=255, null=True, blank=True)  # Google; kept indefinitely
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    address = models.CharField(max_length=500, null=True, blank=True)
    fetched_at = models.DateTimeField(null=True, blank=True)  # when lat/lng/address came from Google

    class Meta:
        db_table = "places"
        ordering = ["ord"]
        constraints = [
            models.UniqueConstraint(fields=["video", "ord"], name="places_video_ord_uniq"),
        ]
        indexes = [models.Index(fields=["fetched_at"], name="places_fetched_idx")]

    def __str__(self) -> str:
        return f"{self.ord}. {self.name}"

    @property
    def maps_url(self) -> str | None:
        if not self.place_id:
            return None
        return f"https://www.google.com/maps/place/?q=place_id:{self.place_id}"
