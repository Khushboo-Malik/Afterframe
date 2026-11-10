# Routes are defined without trailing slashes (see API contract).
from django.urls import path

from . import sse, views

urlpatterns = [
    path("healthz", views.healthz, name="healthz"),
    path("healthz/db", views.healthz_db, name="healthz-db"),
    path("videos", views.VideoListCreateView.as_view(), name="videos"),
    path("videos/<str:key>", views.VideoDetailView.as_view(), name="video-detail"),
    path("videos/<str:key>/events", sse.video_events, name="video-events"),
]
