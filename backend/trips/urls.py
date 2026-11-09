# Routes are defined without trailing slashes (see API contract).
from django.urls import path

from . import views

urlpatterns = [
    path("healthz", views.healthz, name="healthz"),
    path("healthz/db", views.healthz_db, name="healthz-db"),
]
