"""AfterFrame Django settings.

backend/.env is loaded with override=True, so project values always win over
any work variables already in the shell (DATABASE_URL, REDIS_URL, AWS_*,
GOOGLE_*...). Defaults below are local-dev only and contain no secrets, so CI
can run `manage.py check` without a .env.
"""

import os
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

from core.config import CELERY_CONCURRENCY, env_bool, env_int

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=True)

# LangSmith falls back to the legacy LANGCHAIN_* names (LANGCHAIN_TRACING_V2,
# LANGCHAIN_API_KEY...) when a LANGSMITH_* one is blank, so a work shell could
# send AfterFrame traces to a work account. Only backend/.env's LANGSMITH_* count.
for _name in [n for n in os.environ if n.startswith("LANGCHAIN_")]:
    del os.environ[_name]


def env_list(name: str, default: str = "") -> list[str]:
    return [v.strip() for v in os.getenv(name, default).split(",") if v.strip()]


DEBUG = env_bool("DEBUG", False)

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "").strip()
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DEBUG is false.")
    SECRET_KEY = "django-insecure-local-dev-only"

ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "localhost,127.0.0.1")
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")
if DEBUG:
    # Local dev: the Next.js site on :3000 proxies /admin to Django, so the admin
    # login form is posted from that origin (prod sets the Vercel origin via env).
    CSRF_TRUSTED_ORIGINS += ["http://localhost:3000", "http://127.0.0.1:3000"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "whitenoise.runserver_nostatic",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "trips",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# --- Database (Postgres: Docker locally, Supabase in prod) ---
DATABASES = {
    "default": dj_database_url.parse(
        os.getenv("DATABASE_URL")
        or "postgres://afterframe:afterframe@localhost:55432/afterframe",
        conn_max_age=env_int("DB_CONN_MAX_AGE", 0),
    )
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Redis: cache (DRF throttle counters) + Celery broker ---
REDIS_URL = os.getenv("REDIS_URL") or "redis://localhost:56379/0"

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
        "KEY_PREFIX": "afterframe",
        "OPTIONS": {
            # Reuse connections across requests (see config/redis_pool.py).
            "pool_class": "config.redis_pool.SharedConnectionPool",
            # PING a connection that sat idle > 30 s before using it, so one
            # dropped by the network is replaced instead of failing a request.
            "health_check_interval": 30,
        },
    }
}

# --- Auth / passwords (admin only) ---
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- i18n ---
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# --- Static files (served by whitenoise; the admin works through the Vercel rewrite) ---
STATIC_URL = "/django-static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# --- Email ---
MAILERS = {
    "default": {"BACKEND": "django.core.mail.backends.console.EmailBackend"},
}

# --- Django REST Framework (public API: no auth, no CSRF token needed) ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.AnonRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {"anon": "120/min"},
    "NUM_PROXIES": env_int("NUM_PROXIES", 0),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "AfterFrame API",
    "DESCRIPTION": "Turns travel vlogs into a map of places with timestamps.",
    "VERSION": "0.1.0",
}

# --- Celery (Redis is the queue) ---
CELERY_BROKER_URL = REDIS_URL
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_WORKER_CONCURRENCY = CELERY_CONCURRENCY
CELERY_TIMEZONE = "UTC"
