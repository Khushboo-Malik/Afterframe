# AfterFrame backend image. One image runs every backend service in
# deploy/docker-compose.prod.yml: web (gunicorn + uvicorn), Celery worker and beat.
# CI builds it for linux/amd64 (the EC2 t3 server) in .github/workflows/deploy.yml.

# --- Stage 1: install dependencies with uv and collect the admin's static files ---
FROM python:3.14-slim AS build

COPY --from=ghcr.io/astral-sh/uv:0.11.3 /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/opt/venv

WORKDIR /app
# Dependencies first, so code-only changes reuse this cached layer.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project

COPY . .
# Throwaway build-time values: settings refuse to load without a secret key
# when DEBUG is off. collectstatic never touches the database.
RUN DJANGO_SECRET_KEY=build-only-not-a-secret DEBUG=false \
    /opt/venv/bin/python manage.py collectstatic --noinput

# --- Stage 2: the small runtime image (no uv, no build cache) ---
FROM python:3.14-slim

ENV PATH=/opt/venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN useradd --create-home --uid 1000 app
COPY --from=build /opt/venv /opt/venv
COPY --from=build --chown=app:app /app /app

WORKDIR /app
USER app
EXPOSE 8000

# The compose file sets each service's command; this default is the web server.
CMD ["gunicorn", "config.asgi:application", "-k", "uvicorn_worker.UvicornWorker", \
     "-w", "1", "--timeout", "120", "-b", "0.0.0.0:8000"]
