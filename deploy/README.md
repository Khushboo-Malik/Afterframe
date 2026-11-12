# Running AfterFrame in production

```
Browser ──HTTPS──▶ Vercel (Next.js) ──HTTP rewrite /api /admin /django-static /mcp──▶ EC2 :80
                                                                                     Nginx ─▶ web (gunicorn + uvicorn)
                                                                                           worker + beat (Celery)
                                                                                           Redis (queue, throttle)
                                                         Supabase Postgres (session pooler, SSL) ◀── web / worker / beat
```

- **Frontend:** Vercel builds `frontend/` on every push that changes it.
- **Backend:** `.github/workflows/deploy.yml` runs on pushes to `main` that change `backend/`, `deploy/` or the workflow. It builds `afterframe-backend:<sha>` + `:latest` for amd64, pushes to ECR, then uses SSM Run Command on the instance to `git pull`, `docker compose pull`, `up -d` and `migrate`.
- **No SSH, no AWS keys anywhere.** GitHub assumes an OIDC role. The server pulls from ECR with its instance role. You open a shell with **EC2 → Instances → Connect → Session Manager**.

## Files on the server (both gitignored, written by hand)

| File | Holds |
|---|---|
| `/opt/afterframe/deploy/.env` | `ECR_REGISTRY=<account-id>.dkr.ecr.<region>.amazonaws.com` |
| `/opt/afterframe/backend/.env` | App settings and secrets. Template: `deploy/prod.env.example` |

After changing `backend/.env`, recreate the containers (a plain restart doesn't re-read `env_file`):

```bash
sudo -i
cd /opt/afterframe
docker compose -f deploy/docker-compose.prod.yml up -d --force-recreate web worker beat
```

## Everyday commands (Session Manager shell, after `sudo -i` and `cd /opt/afterframe`)

```bash
C="docker compose -f deploy/docker-compose.prod.yml"
$C ps                                   # what's running
$C logs -f --tail 100 web worker        # live logs
docker stats --no-stream                # memory per container (t3.micro has 1 GB + 2 GB swap)
$C exec web python manage.py createsuperuser
$C exec web python manage.py seed_examples <url1> <url2> ...   # skips the daily limit
curl -s localhost/api/healthz/db        # {"ok":true} = Django can reach Supabase
```

## Supabase keep-alive, and what to do if it pauses

Free Supabase projects pause after 7 days without activity, and a paused project does **not** wake up on its own.
- **Primary:** the Celery Beat job `db_keepalive_task` runs `SELECT 1` daily at 06:00 UTC on the server.
- **Backup:** `.github/workflows/db-keepalive.yml` GETs `$SITE_URL/api/healthz/db` daily at 06:00 UTC. GitHub disables scheduled workflows after 60 days without repo activity, so if it shows as disabled, re-enable it in the Actions tab.
- **If it pauses anyway:** Supabase dashboard → the project → **Restore**. It takes a few minutes, and the data is kept.

## After 6 months

The AWS free plan (credits) lasts 6 months. Before it ends, pick one:
1. **Upgrade the AWS account** to the paid plan (Billing console). Nothing else changes, and the instance keeps running at normal prices.
2. **Move the containers** to any other Docker host. The data lives on Supabase, so nothing needs migrating:
   - Install Docker, clone the repo to `/opt/afterframe`, and copy both `.env` files.
   - Build the image there (`docker build -t afterframe-backend:latest backend`) or push it to another registry, and set `ECR_REGISTRY` to match.
   - Run `docker compose -f deploy/docker-compose.prod.yml up -d`.
   - Point Vercel's `BACKEND_URL` at the new host and redeploy the frontend.
   - Update `ALLOWED_HOSTS` with the new IP, and point the deploy workflow at the new host (or deploy by hand with `git pull` + the commands above).
