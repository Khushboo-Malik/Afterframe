# Running AfterFrame in production

```
Browser ──HTTPS──▶ Vercel (Next.js) ──rewrite /api /admin /django-static /mcp──▶ Railway "web"
                                                                                 gunicorn + uvicorn
                    Railway "worker": Celery, one mapping at a time, daily jobs built in (-B)
                    Railway "Redis": queue, throttle counters, daily-limit counter (private network)
                    Supabase Postgres (session pooler, SSL) ◀── web / worker
```

- **Frontend:** Vercel builds `frontend/` on every push that changes it.
- **Backend:** Railway builds `backend/Dockerfile` on every push to `main` that changes `backend/`, and redeploys `web` and `worker`. Migrations run before the new `web` goes live.
- Region: Southeast Asia (Singapore), next to Supabase.

## Railway services (project settings live in the dashboard)

Railway no longer lets new services use a `railway.toml`, so these settings are recorded here.

| Setting | web | worker |
|---|---|---|
| Source | GitHub repo, branch `main` | same |
| Root Directory | `/backend` | `/backend` |
| Watch Paths | `/backend/**` | `/backend/**` |
| Start Command | *(empty: the Dockerfile's gunicorn command)* | `celery -A config worker -B --schedule /tmp/celerybeat-schedule --max-memory-per-child 300000 --loglevel INFO` |
| Pre-deploy Command | `python manage.py migrate --noinput` | *(empty)* |
| Healthcheck Path | `/api/healthz` | *(empty)* |
| Public domain | Settings → Networking → Generate Domain, port **8000** (`PORT=8000` is set as a variable, so the domain and the healthcheck both use it) | none |
| Replicas | 1 | **exactly 1** (the daily jobs run inside it) |

**Redis:** the Railway Redis template (+ New → Database → Redis). Other services reach it through `REDIS_URL=${{Redis.REDIS_URL}}`.

**Variables:** `web` and `worker` take the same set, from `deploy/prod.env.example`. The worker also sets `DB_CONN_MAX_AGE=60`.

## Cost guardrails (Hobby plan: $5/month, includes $5 of usage)

- **Workspace → Usage → Set Usage Limits:** custom email alert **$4.50**, hard limit **$10** (Railway's minimum). Reaching the hard limit takes every service offline until it is raised or the next cycle starts.
- Measured before launch: web ~157 MB, worker ~174 MB, Redis ~10 MB, about 2% of one vCPU while idle, which is roughly $3.80–4.10 of usage a month. Check each service's **Metrics** tab after a week. If memory keeps climbing, set per-service limits under **Settings → Deploy → Replica Limits**, a little above the peak seen there.
- Don't add a separate beat service and don't raise the worker's concurrency: each one costs real money on this plan.

## One-off commands (createsuperuser, seed_examples)

Use the Railway CLI on your own laptop (`railway login`, then `railway link` to this project):

```bash
railway ssh --service web          # a shell inside the running web container
python manage.py createsuperuser
python manage.py seed_examples <url1> <url2> ...   # skips the daily limit, one link at a time
```

Then open `/admin` → Videos and tick **featured** for each trip that should show on the home page and `/trips`.

## Supabase keep-alive, and what to do if it pauses

Free Supabase projects pause after 7 days without activity, and a paused project does **not** wake up on its own.
- **Primary:** `db_keepalive_task` runs `SELECT 1` daily at 06:00 UTC, scheduled inside the worker.
- **Backup:** `.github/workflows/db-keepalive.yml` GETs `$SITE_URL/api/healthz/db` daily at 06:00 UTC. GitHub disables scheduled workflows after 60 days without repo activity, so if it shows as disabled, re-enable it in the Actions tab.
- **If it pauses anyway:** Supabase dashboard → the project → **Restore**. It takes a few minutes, and the data is kept.

## Moving off Railway

The data lives on Supabase, and the backend is one Docker image, so any Docker host works. Run the image twice (the default command for web, the worker command above), run a Redis 7, set the same variables, and point Vercel's `BACKEND_URL` at the new host.
