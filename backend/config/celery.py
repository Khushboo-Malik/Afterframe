"""Celery app. Settings come from Django settings keys prefixed CELERY_."""

import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("afterframe")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# Daily jobs (times are UTC). In production the scheduler runs inside the one
# worker (`celery -A config worker -B`), so there is no separate beat service.
# Keep exactly one worker replica, or each job would run once per replica.
app.conf.beat_schedule = {
    "refresh-places": {
        "task": "trips.tasks.refresh_places_task",
        "schedule": crontab(hour=3, minute=0),
    },
    "db-keepalive": {
        "task": "trips.tasks.db_keepalive_task",
        "schedule": crontab(hour=6, minute=0),
    },
}
