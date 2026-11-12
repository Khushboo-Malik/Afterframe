"""Seed the home grid with example trips (owner only; skips the daily limit).

    python manage.py seed_examples <youtube-url> [<youtube-url> ...]

On the server (Session Manager shell, as root in /opt/afterframe):

    docker compose -f deploy/docker-compose.prod.yml exec web \\
        python manage.py seed_examples <url1> <url2> ...

Each link goes through the same path as the website (YouTube checks, claim,
Celery job), but without checking or counting the site-wide daily limit.
Links are mapped one at a time, and the command waits for each to finish, so
the worker is never flooded. Seeded trips are NOT featured: tick "featured" for
each one in /admin so it shows on the home page and /trips.
"""

from __future__ import annotations

import time

from django.core.management.base import BaseCommand

from core.config import STALE_PROCESSING_SECONDS
from trips import repo
from trips.models import Video
from trips.services import ApiError, submit_video

POLL_SECONDS = 5


class Command(BaseCommand):
    help = "Map example vlogs for the home grid, skipping the daily limit, one at a time."

    def add_arguments(self, parser):
        parser.add_argument("urls", nargs="+", help="Public YouTube links (≤ 30 min each)")

    def handle(self, *args, urls: list[str], **opts):
        results: list[tuple[str, str, str]] = []  # (url, key or "-", outcome)
        for i, url in enumerate(urls, 1):
            self.stdout.write(f"\n[{i}/{len(urls)}] {url}")
            outcome = submit_video(url, skip_limit=True)
            if isinstance(outcome, ApiError):
                self.stdout.write(self.style.ERROR(f"  ✗ {outcome.code}: {outcome.message}"))
                results.append((url, "-", outcome.code))
                continue

            key = outcome.video_key
            if outcome.status != "processing":
                self.stdout.write(f"  already mapped: {key} ({outcome.status})")
            else:
                self.stdout.write(f"  queued {key}; waiting for the worker…")
                self._wait(key)
            video = Video.objects.get(key=key)
            line = f"  {video.status}: {video.place_count} places · {video.title[:60]}"
            style = self.style.SUCCESS if video.status == Video.Status.DONE else self.style.WARNING
            self.stdout.write(style(line))
            results.append((url, key, f"{video.status}, {video.place_count} places"))

        self.stdout.write("\nSummary:")
        for url, key, outcome in results:
            self.stdout.write(f"  {key:<16} {outcome:<22} {url}")
        self.stdout.write(
            self.style.NOTICE(
                "\nNext: open /admin → Videos and tick “featured” for each trip you want "
                "on the home page and /trips."
            )
        )

    def _wait(self, key: str) -> None:
        """Poll the DB until the run leaves `processing` (or goes stale)."""
        last_stage = None
        deadline = time.monotonic() + STALE_PROCESSING_SECONDS + 60
        while time.monotonic() < deadline:
            video = Video.objects.get(key=key)
            if video.stage != last_stage:
                self.stdout.write(f"    stage: {video.stage}")
                last_stage = video.stage
            if video.status != Video.Status.PROCESSING:
                return
            if repo.is_stale(video):
                self.stdout.write(self.style.WARNING("    stalled (no progress for 15 min)"))
                return
            time.sleep(POLL_SECONDS)
        self.stdout.write(self.style.WARNING("    gave up waiting; check the worker logs"))
