# AfterFrame: Overview (read this first)

> This is the shared foundation for every sub-plan in this folder. Work through the sub-plans in order: `01-mockups.md` → `02-project-setup.md` → … → `09-mcp-and-readme.md`. `10-future.md` holds ideas for later.
> The complete single-file plan is `AfterFrame-full-plan.md`.

---

# AfterFrame Implementation Plan (website + Django backend + AI agent + evals + MCP)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Sub-plan breakdown (for building incrementally as a beginner)

The plan is split into small sub-plans, saved as separate files in **`~/Desktop/AfterFrame plans/`**. Each one ends with something you can run and see. Every sub-plan file says "read `00-overview.md` first". The overview holds the shared sections of this document: Context, Before you start, Global Constraints, Data model, API contract, Edge cases, Screens & states, and File Structure.

| File | Sub-plan | Tasks | You end up with | Platforms touched |
|---|---|---|---|---|
| `00-overview.md` | Overview: read first | n/a | The big picture, rules and contracts | none |
| `01-mockups.md` | See the design | 0 | Clickable mockups of every screen | Claude (artifact) |
| `02-project-setup.md` | Project skeleton | 1 | Personal git setup with a push guard, Django + Next.js running locally, Postgres + Redis in Docker, CI | Docker Desktop, personal GitHub (repo + SSH key) |
| `03-gemini-and-google-apis.md` | Gemini watches a video | 2, 3 | `try_ai extract <url>` streams places from a real vlog | Google Cloud Console, Google AI Studio |
| `04-ai-agent.md` | The place-checking agent | 4, 5 | `try_ai resolve` / `try_ai pipeline` show verified places | LangSmith (optional) |
| `05-backend-api.md` | Database, background jobs, API, live updates | 6, 7, 8 | Submitting a link maps it in Celery; places stream over SSE | none (local) |
| `06-website.md` | The website | 9, 10, 11 | Home grid, search bar, map with numbered pins, loading scene | Google Cloud (Maps key, Map ID), Unsplash |
| `07-deploy.md` | Put it on the internet | 12 | Live site on Vercel + EC2 + Supabase | GitHub, Supabase, AWS, Vercel, Google Cloud, YouTube |
| `08-evals.md` | Measure AI accuracy | 13 | Eval reports comparing resolutions | Google Cloud (temporary quota raise), LangSmith (optional) |
| `09-mcp-and-readme.md` | MCP server + recruiter README | 14, 15 | Claude can use AfterFrame as a tool; polished README | MCP Inspector, Claude |
| `10-future.md` | Later (not detailed yet) | n/a | Instagram reels (sandbox) and the polished Hyperframes demo video | n/a |

A separate **platform setup guide** (an Artifact) lists, for each sub-plan, which website to open, what to click, and which value goes in which env var.

---

**Goal:** A public **website**, with no login and a YouTube-like layout:
- **Home page:** a link/search bar at the top, a big demo video, then a grid of every mapped trip.
- **Trip page:** opening a trip shows a Google Map of every place from that video. Clicking a place shows its details and the moment in the video where it appears.

**Architecture:**
- **Frontend:** Next.js on **Vercel**. Vercel provides HTTPS automatically and forwards `/api/*` to the backend, so the backend can stay plain **HTTP** with no certificates.
- **Backend:** **Django REST Framework** on an **AWS EC2** server, running in **Docker Compose** behind **Nginx**.

When someone submits a link, Django claims the video and queues a **Celery** job (**Redis** is the queue). The job does this:
1. **Gemini** watches the YouTube video by URL and streams out candidate places as structured JSON.
2. Each candidate goes through a **LangGraph** resolver: a direct Google Places lookup first, and a Gemini tool-calling agent only for vague ones.
3. Code labels each place `verified` / `needs_review` / `unmatched`.

Places are saved to **PostgreSQL (Supabase)** as they're found. The browser follows progress through **Server-Sent Events**.

**Tech Stack:**
- **Backend:** Python 3.14 (uv), Django 6, Django REST Framework, drf-spectacular (Swagger), Celery + Celery Beat, Redis, PostgreSQL, Pydantic, whitenoise, gunicorn + uvicorn workers.
- **AI:** `google-genai` (Gemini video), LangGraph + `langchain-google-genai` (agent), LangSmith (optional tracing), `mcp` Python SDK.
- **Frontend:** Next.js (latest) + TypeScript, Tailwind CSS, shadcn/ui, Motion, `@vis.gl/react-google-maps`.
- **Infra:** Docker + Docker Compose, Nginx, AWS EC2 + ECR + IAM, Supabase Postgres, Vercel, GitHub Actions CI/CD.

**Tech stack at a glance**

| Tool | Used for |
|---|---|
| Next.js + TypeScript | the website |
| Tailwind CSS · shadcn/ui · Motion | styling · UI components · animations |
| Google Maps JS API | the map with numbered pins |
| Vercel | hosts the site; HTTPS; forwards `/api` to the backend |
| Python 3.14 + uv | backend language · package manager |
| Django | backend framework, DB models, admin panel |
| Django REST Framework + drf-spectacular | the API · Swagger docs |
| Server-Sent Events | live updates while places are found |
| Celery · Celery Beat | background mapping jobs · daily scheduled jobs |
| Redis | Celery job queue + daily-limit counters |
| PostgreSQL (Supabase) | stores videos and places |
| gunicorn + uvicorn · Nginx | run Django in production · web server in front |
| Pydantic · httpx | validate AI output · call Google APIs |
| Gemini (`google-genai`) | watches the video, lists places and descriptions |
| LangGraph | the place-checking agent |
| LangSmith (optional) | traces the agent's decisions |
| MCP Python SDK | lets AI assistants use AfterFrame as a tool |
| YouTube Data API · Google Places API | video info and privacy check · verify places and coordinates |
| Docker + Docker Compose | package the backend; run it anywhere |
| AWS EC2 · ECR · IAM | backend server · Docker image storage · deploy permissions |
| GitHub Actions | CI (build checks) + auto-deploy |
| Evals (own scripts) | measure the AI's accuracy and cost |

**Spec:** There is no separate design doc. This file is self-contained: **Context**, **Global Constraints**, **Data model**, **API contract** and **Screens & states** are the spec, plus the mockups approved in Task 0. A builder who wasn't in the planning conversation needs nothing else.

---

## Before you start (for the builder)

**Machine state (checked):**
- **Installed:** macOS, Python 3.14, uv 0.11, Node + npm, Docker (daemon running), Homebrew Postgres 16 (unused; dev uses Docker).
- **Not installed:** the `gh`, `aws`, `vercel` and `supabase` CLIs, and they must **stay** uninstalled for this project (see below).
- The project folder `/Users/khushboomalik/Desktop/Project` is empty.
- **This laptop is also used for the user's internship work** (Docker, AWS, Bitbucket). See **Keep AfterFrame separate from work** below. Every task must follow it.

**Secrets rule:** never ask the user to paste keys into chat. Create `.env.example` files with empty slots. The user pastes values into `backend/.env`, `frontend/.env.local`, GitHub Secrets and Vercel env themselves.

**All cloud configuration is done by the user in the web consoles** (Google Cloud, Google AI Studio, AWS, Supabase, Vercel, GitHub, LangSmith). It's their choice, for learning and so they stay in control.
- The builder **never installs or runs cloud CLIs** on this laptop: no `aws`, `gcloud`, `vercel`, `gh` or `supabase`.
- Instead, the builder writes numbered, click-by-click console steps, says exactly which value to copy and into which file or setting, and **waits for the user to confirm** before continuing.
- CLIs that run **inside GitHub Actions** (the deploy workflow) are fine, because they run on GitHub's machines with the personal AWS account's OIDC role, never with laptop credentials.

## Keep AfterFrame separate from work (mandatory)

The user's internship uses Docker, AWS and Bitbucket on this same Mac. AfterFrame must **only** ever touch the user's **personal** GitHub, AWS, Google, Supabase, Vercel and LangSmith accounts.

**1. Separate browser profile.** The user does all AfterFrame console work in a dedicated browser profile (e.g. a Chrome profile named "AfterFrame"), signed in only to personal accounts. Before any change in a console, check the account shown in the top-right corner (the AWS account ID, the Google account avatar, the GitHub username).

**2. Personal git identity, set per repo, never globally.**
- Right after `git init`, set the identity in the **repo only**, with the user's personal name and email: `git config user.name "<personal name>"` and `git config user.email "<personal email>"`.
- **Never** run `git config --global …`, because work relies on the global settings.
- Before the first commit of every session, the builder runs `git config user.email` and checks that it shows the personal email.

**3. GitHub over a dedicated SSH key and host alias** (the user sets this up, with the builder's instructions):
- Generate a personal key: `ssh-keygen -t ed25519 -C "<personal email>" -f ~/.ssh/id_ed25519_afterframe`. Add the `.pub` key in **personal GitHub → Settings → SSH and GPG keys**.
- **Append** (don't replace anything) to `~/.ssh/config`:
  ```
  Host github-personal
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_afterframe
    IdentitiesOnly yes
  ```
- Test with `ssh -T git@github-personal`. It must greet the **personal** GitHub username.
- The remote is **only** `git remote add origin git@github-personal:<personal-username>/afterframe.git`. Never add a Bitbucket or work remote to this repo.

**4. Push guard.** A versioned hook `.githooks/pre-push`, enabled with `git config core.hooksPath .githooks` (repo-local), **refuses the push** unless the remote URL starts with `git@github-personal:<personal-username>/`. It also refuses any URL containing `bitbucket`, and prints why.

**5. Who commits and pushes.**
- The builder may make **local commits only** (after the identity check), and never pushes or adds remotes.
- The **user** runs `git push` themselves.
- If the user prefers to commit everything themselves, the builder just suggests a commit message at the end of each task.

**6. Shell environment isolation.** The user's shell may carry work variables (`AWS_PROFILE`, `AWS_ACCESS_KEY_ID`, `GOOGLE_API_KEY`, `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_GENAI_USE_VERTEXAI`, `GOOGLE_CLOUD_PROJECT`, `DATABASE_URL`, `REDIS_URL`…). AfterFrame must never pick them up:
- Settings load `backend/.env` with `load_dotenv(override=True)`, so the project's values win over the shell.
- Build the Gemini clients **explicitly**: `genai.Client(api_key=<GEMINI_API_KEY from settings>, vertexai=False)` and `ChatGoogleGenerativeAI(google_api_key=<same>)`. Never rely on the SDK reading env vars or Application Default Credentials. The Google SDK prefers `GOOGLE_API_KEY` over `GEMINI_API_KEY` when both are set, which could silently use a work key.
- No code reads `~/.aws` or uses boto3 locally. AWS is only touched from GitHub Actions (OIDC) and by the EC2 instance role.
- `smoke_gemini` prints the **last 4 characters** of the key in use and `vertexai=False`, so the user can confirm it's the personal key.

**7. Docker Desktop is shared with work.**
- Every compose file sets `name: afterframe`, so all containers, networks and volumes are prefixed `afterframe-` and never collide with work containers.
- Local host ports are **55432** (Postgres) and **56379** (Redis), not the defaults, to avoid clashing with work containers.
- **Never** run `docker system prune`, `docker volume prune` or any command that touches containers or volumes outside the `afterframe` project, because they'd delete work data. Use `docker compose -f deploy/docker-compose.dev.yml down` for this project only.

**8. Work tools in Claude.** Never use the work-connected tools or connectors available in Claude Code (Jira/Confluence, DB Explorer, HubSpot, Notion, etc.) for anything AfterFrame-related.
- Connect AfterFrame's MCP server only to a **personal** Claude account.
- If there's no personal Claude account, test with **MCP Inspector** only.

**What the user must provide, and when:**

| When | What |
|---|---|
| Before Task 2 | **One Google Cloud project `afterframe`**, with billing ON (card). Enable YouTube Data API v3, Places API (New), Maps JavaScript API and the Gemini (Generative Language) API. Create a **server key**, which goes in `GOOGLE_SERVER_API_KEY`. Create a **browser key**, which goes in `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and is restricted to `localhost` for now. Create a **Map ID** (Map Management, JavaScript, Vector), which goes in `NEXT_PUBLIC_GOOGLE_MAP_ID`. In Google AI Studio, create a **Gemini API key** under this same project; it goes in `GEMINI_API_KEY`. |
| Before Task 2 | **Budget alerts** on the billing account at **₹500 and ₹1,000**, covering all services. |
| Task 10 | Their **name**, plus GitHub and LinkedIn URLs for the footer and How it works. |
| Task 1 | **Personal GitHub** account + empty repo `afterframe` (public recommended); the `github-personal` SSH setup from **Keep AfterFrame separate from work**; personal git name and email. |
| Task 12 | **Supabase** project, a **personal AWS** account on the free plan (card, created only now so the 6-month clock isn't wasted), and a **Vercel** account (sign in with the personal GitHub). All created in the AfterFrame browser profile. |
| Task 12 | 6–8 public travel-vlog URLs (≤ 20 min) to seed the grid, plus an interim demo recording. |
| Task 13 | 8 labeled videos for evals (the builder pre-drafts them; the user corrects). |
| Optional | A **LangSmith** API key for tracing. |

---

## Context

The user is job-hunting for SDE roles and wants a resume project that shows **AI engineering**: a web version of an Android app idea seen on Reddit, which turns travel vlogs into a map of places with timestamps. The live website link goes on the resume.

Decided in conversation:
- **Own project and name.** The website is called **AfterFrame**, with code and repo slug `afterframe`. Never use the original app's name or branding.
- **A website, not an app.** It's desktop-first and works in phone browsers.
- **Backend:** Python/Django. **Frontend:** Next.js.
- **No accounts at all.** All mapped trips are public on the home grid. Django's built-in admin panel (one owner login) is only for hiding unsuitable videos.
- **Popular, in-demand tools** wherever there's a real choice, and never a tool without a real job.
- **No automated tests or linters** (the user's choice): no pytest, no ruff, no test files. Every task ends with a **manual check**. AI behavior is checked with the `try_ai` command (Task 3) and measured with **evals** (Task 13).
- **The backend stays plain HTTP.** The browser only ever talks to the Vercel site, which is HTTPS automatically.
- **AI:** Gemini only, reading public YouTube videos from the URL.
- **AI concepts in scope:**
  - an agent with tools (LangGraph)
  - structured outputs
  - streaming
  - confidence scoring with human review
  - evals
  - MCP
  - tracing

  No scraping.
- **Budget:**
  - **Gemini:** **paid (billing on) from the start**, the user's choice, so the live site is reliable. Expected cost is about ₹50–300/month, plus about ₹100 once for evals. It's bounded by the app's limits, `MAX_AGENT_CANDIDATES_PER_VIDEO`, a daily request quota cap and budget alerts at ₹500 and ₹1,000. Calls still retry with backoff on 429/503.
  - **Google Places Pro:** 5,000 free searches/month, with a card on Google Cloud.
  - **AWS:** a new-account free plan ($200 credits, 6 months). "EC2 now, move later": before it ends, upgrade or move the Docker containers elsewhere. The data stays on Supabase.
  - **Supabase and Vercel:** free plans.
- **Limits:** 5 new videos/day **site-wide only**. There's **no per-visitor limit for now**: the owner is testing, and it can be added later. Viewing is unlimited. For heavy test days, raise `GLOBAL_DAILY_NEW` in env, or set `RATE_LIMIT_DISABLED=true` locally.
- **Platforms:** YouTube videos and Shorts are in scope now. The search bar accepts Instagram links but answers "coming soon". **Instagram reels** (through an isolated sandbox) and the **polished demo video** (Hyperframes) come later, in `10-future.md`. Until then, an interim screen recording fills the demo slot.

## Global Constraints

**Layout and tooling**
- Monorepo at `/Users/khushboomalik/Desktop/Project/afterframe`, containing `backend/` (uv), `frontend/` (npm), `deploy/`, `.github/` and `.githooks/`. Run `git init` at the root, then do the repo-local git setup from **Keep AfterFrame separate from work**.
- Use the installed tools: Python 3.14, uv 0.11, npm, Docker. Local dev runs Postgres 16 and Redis 7 via `docker compose` (project name `afterframe`, host ports 55432 and 56379). Do not add pnpm or poetry, and no cloud CLIs.

**Code boundaries**
- `backend/core/` is **plain Python with no Django imports** (the AI pipeline, API clients, scoring).
- Gemini is touched only in `core/llm.py` (video streaming) and `core/agent/models.py` (the LangChain chat-model factory).
- `backend/trips/` is the Django app: models, DRF API, Celery tasks, SSE, admin.

**Networking**
- **Browser:** talks only to the Vercel site. `frontend/next.config.ts` **rewrites** `/api/:path*`, `/admin/:path*`, `/django-static/:path*` and `/mcp/:path*` to `${BACKEND_URL}`, which is `http://<EC2 Elastic IP>`.
- **Next.js server components:** fetch `${BACKEND_URL}` directly.
- **Django:** no CORS needed (everything is same-origin through Vercel). `STATIC_URL="/django-static/"` with whitenoise, so the admin works through the rewrite.
  - `ALLOWED_HOSTS` covers the Elastic IP, the Vercel domain and `localhost`.
  - `CSRF_TRUSTED_ORIGINS=https://<vercel-domain>` (env), because the admin login form is posted from the Vercel origin.
  - DRF `DEFAULT_AUTHENTICATION_CLASSES = []` and `DEFAULT_PERMISSION_CLASSES = [AllowAny]`, so the public API needs no CSRF token.

**Env**
- **Backend** (`backend/.env`, gitignored, with `.env.example` committed):

  | Variable | Notes |
  |---|---|
  | `GEMINI_API_KEY` | from AI Studio, under the billed `afterframe` Google project |
  | `GEMINI_MODEL` | |
  | `GEMINI_MEDIA_RESOLUTION` | `low`, `medium` or `high`; default `low`. Video is already low by default per current docs; check the exact enum names in Task 2 |
  | `DB_CONN_MAX_AGE` | `0` for `web` (ASGI: Django advises no persistent connections), `60` for `worker`/`beat` |
  | `GOOGLE_SERVER_API_KEY` | Places API (New) + YouTube Data API v3, from the `afterframe` Google project |
  | `DATABASE_URL` | |
  | `REDIS_URL` | |
  | `DJANGO_SECRET_KEY` | |
  | `ALLOWED_HOSTS` | |
  | `CSRF_TRUSTED_ORIGINS` | prod `https://<vercel-domain>` |
  | `DEBUG` | `true` locally, `false` in prod |
  | `NUM_PROXIES` | DRF's proxy count for its per-minute throttle; prod `2` (Vercel + Nginx), local `0` |
  | `GLOBAL_DAILY_NEW` | optional override |
  | `RATE_LIMIT_DISABLED` | honored only when `DEBUG=true` |
  | `LANGSMITH_TRACING`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT` | optional |

- **Frontend:** `BACKEND_URL` (server-only), `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAP_ID`, `NEXT_PUBLIC_DEMO_YOUTUBE_ID`. The frontend never holds Gemini, Places or YouTube Data keys.
  - `next.config.ts` uses `process.env.BACKEND_URL ?? "http://localhost:8000"`, so CI builds without secrets.
  - It sets `skipTrailingSlashRedirect: true`, so `/admin/` reaches Django with its trailing slash. If the admin still loops through Vercel, the owner uses `http://<Elastic IP>/admin/` directly.

**Implementation rules**
- Env reads are lazy (inside functions), so builds and CI run without secrets.
- **`GEMINI_MODEL`** is the current Flash ID from ai.google.dev/gemini-api/docs/models, checked in Task 2, and never hardcoded elsewhere.
- **Places Text Search (New):**
  - Field mask exactly `places.id,places.displayName,places.formattedAddress,places.location,places.types`.
  - Request with `languageCode: "en"` and `pageSize: 5`.
  - Never request Enterprise fields such as rating, photos or hours. That's why the details card shows no ratings or photos.

**Google data storage rules**
- Store `place_id` indefinitely.
- Refresh `lat`/`lng`/`address` after 30 days (Task 8).
- Build the Maps link as `https://www.google.com/maps/place/?q=place_id:<id>`.
- Show the place name as said in the video.
- The map is Google Maps JS.

**Limits** in `core/config.py`:

| Limit | Value |
|---|---|
| `MAX_VIDEO_SECONDS` | 1800 |
| `GLOBAL_DAILY_NEW` | 5 |
| `MAX_CANDIDATES` | 20 |
| `MAX_SEARCHES_PER_VIDEO` | 26 |
| `MAX_AGENT_SEARCHES_PER_CANDIDATE` | 2 |
| `AGENT_MAX_TURNS` | 4 |
| `MAX_AGENT_CANDIDATES_PER_VIDEO` | 6 |
| `RESOLVE_CONCURRENCY` | 3 |
| `CELERY_CONCURRENCY` | 2 |
| `STALE_PROCESSING_SECONDS` | 900 |
| `PARTIAL_RETRY_SECONDS` | 86400 |
| `SSE_POLL_SECONDS` | 1.0 |
| `SSE_MAX_SECONDS` | 25 |
| `PLACES_REFRESH_DAYS` | 29 |
| `PLACES_REFRESH_PER_DAY` | 100 |
| `GRID_PAGE_SIZE` | 24 |

- `SSE_MAX_SECONDS` is short on purpose: the stream ends every 25s and the browser reconnects with `Last-Event-ID`, so any proxy timeout is harmless.
- `STALE_PROCESSING_SECONDS` (900) is deliberately longer than the Celery hard time limit (600s) plus queue wait. `run_id` fencing makes a double run harmless anyway.
- `MAX_AGENT_CANDIDATES_PER_VIDEO` caps how many candidates per video may use the agent, which caps Gemini calls. Beyond the cap, a candidate keeps its direct-lookup classification.
- A "day" is the UTC calendar day.
- DRF anonymous throttle: `120/min`.

**Budget math**
- **Places:** 5 videos/day × 26 searches is about 3,900 searches/month, under the 5,000 free.
- **Gemini (paid):** a few ₹ per **new** video at low resolution (measured in Task 2). Cached views cost nothing.
  - Per video: 1 video call + at most 6 agent candidates × 4 turns, so about 7 calls typically and 25 at most.
  - At 5 new videos/day the realistic cost is about ₹50–300/month.
  - **Hard ceiling:** a daily quota cap on Generative Language requests (Task 12), plus budget alerts.
- **AWS:** about $13/month, covered by the free-plan credits. Check the balance monthly.

**API and privacy**
- **No IP addresses are stored** in Postgres or anywhere else. The only IP-related data is DRF's anonymous throttle (120 requests/min), which keeps a per-IP request counter in Redis that expires after about a minute.
- API errors are JSON `{code, message}`:

  | Code | Status |
  |---|---|
  | `invalid_url` | 400 |
  | `instagram_unsupported` | 422 |
  | `not_found` | 404 |
  | `private` | 403 |
  | `too_long` | 422 |
  | `rate_limited` | 429 |
  | `busy` | 503 (Redis down; fail closed) |
  | `failed` | 500 |

- **`message` is the user-facing copy** from **Screens & states**. The backend writes it, and the frontend shows `message` as-is.

**Accessibility**
- reduced-motion is respected
- decorative emojis get `aria-hidden`
- progress text gets `aria-live="polite"`
- keyboard-reachable controls

**Commits:** "Commit" in any task means a **local** commit, made after checking `git config user.email` shows the personal email. Builder-made commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The user pushes. The builder never pushes, never adds remotes and never touches global git config.

## Data model (PostgreSQL on Supabase)

```
videos                                   places
───────────────────────────────          ─────────────────────────────────────────
key (PK)  "yt_AbC123xYz_9"   ◄───┐       id (PK, auto)  ← also the live-update event id
platform  "youtube"              └────── video_key (FK)
url, title, channel, description         ord (order found in the video: 0,1,2…)
duration_sec, thumbnail_url              name "Café A Brasileira" (as said in the video)
                                         category food|stay|attraction|activity|shopping|other
                                         timestamp_sec 134
                                         description "Historic 1905 café in Chiado — the vlogger
                                           has a bica and pastel de nata at the outdoor tables."
status  processing|done|partial|failed   verification verified|needs_review|unmatched
stage   queued|watching|verifying|finished   match_score, resolved_by direct|agent|none
error_code, place_count, is_hidden       place_id (Google, nullable), lat, lng, address, fetched_at
run_id (uuid of the current run)         (places rows also carry run_id)
gemini_input_tokens, gemini_output_tokens, places_calls, run_ms
created_at, updated_at
```

- The video file is never stored.
- Every YouTube link shape (watch, youtu.be, Shorts, mobile) maps to one `key`.
- The daily limits are **Redis** counters.
- `category` is a Django `TextChoices` enum, mirrored as a Pydantic `Literal` for Gemini. Display labels: Food, Stay, Attraction, Activity, Shopping, Other.
- `description` comes from the **same** Gemini call that finds the place, so it costs nothing extra. It's 1–2 sentences, ≤ 240 chars, using only what's said or shown in the video.
- **Map numbers** follow the video's order: mapped places (verified + needs_review) sorted by `ord` are numbered 1, 2, 3… Unmatched places get no number.
- **`run_id` fencing:** every claim creates a new `run_id`. The Celery task receives it, and every write (`set_stage`, `save_place`, `finish_video`) has `WHERE videos.run_id = <its run_id>`. A task whose `run_id` is no longer current stops immediately. That way a slow old run, or a task Celery delivers twice after a crash, can never mix places into a newer run.
- **Hidden videos** (`is_hidden=true`) behave as if they don't exist: 404 `not_found` on GET, SSE, MCP `get_trip` and POST.

## API contract (JSON is snake_case end to end; the frontend types mirror it, with no conversion)

`VideoOut`:
```json
{"key": "yt_AbC123xYz_9", "platform": "youtube", "url": "https://www.youtube.com/watch?v=AbC123xYz_9",
 "video_id": "AbC123xYz_9", "title": "48 Hours in Lisbon", "channel": "Some Channel",
 "duration_sec": 1124, "thumbnail_url": "https://i.ytimg.com/vi/AbC123xYz_9/hqdefault.jpg",
 "status": "processing|done|partial|failed", "stage": "queued|watching|verifying|finished",
 "error_code": null, "place_count": 14, "created_at": "2026-11-07T10:00:00Z"}
```

`PlaceOut`:
```json
{"id": 101, "ord": 2, "name": "Café A Brasileira", "category": "food", "timestamp_sec": 134,
 "description": "Historic 1905 café in Chiado…", "verification": "verified|needs_review|unmatched",
 "match_score": 0.92, "place_id": "ChIJ…", "lat": 38.7107, "lng": -9.1424,
 "address": "R. Garrett 120, Lisbon, Portugal", "maps_url": "https://www.google.com/maps/place/?q=place_id:ChIJ…"}
```

Endpoints:
- **`POST /api/videos`** with body `{"url": "…"}` (max 500 chars) returns 200 or 202 `{"video_key": "…", "status": "done|partial|processing"}`, or 4xx/5xx `{"code", "message"}`. Plain text that isn't a link gives `invalid_url`; the frontend never sends it, because it searches instead.
- **`GET /api/videos/<key>`** returns 200 `{"video": VideoOut, "places": [PlaceOut…] (ordered by ord), "stale": bool}`, or 404 `{"code":"not_found"}`.
  - `stale` = `status == "processing"` and `updated_at` older than `STALE_PROCESSING_SECONDS`. The frontend shows the stalled card.
  - All routes are defined **without trailing slashes** (no DRF `DefaultRouter`).
- **`GET /api/videos?page=1&q=lisbon`** returns 200 `{"results": [VideoOut…], "has_more": bool}`. These are done or partial, not hidden, `place_count > 0`, newest first, 24 per page.
- **`GET /api/videos/<key>/events`** (SSE) sends these events, each with a JSON `data:` line:
  - `meta` → `VideoOut`
  - `stage` → `{"stage"}`
  - `place` → `PlaceOut`, with `id: <place.id>`
  - `done` → `{"status": "done|partial", "count"}`
  - `error` → `{"code": "failed|stalled|not_found"}`

  A `failed` video sends `error {code:"failed"}`, and a stale processing video sends `error {code:"stalled"}`.
- **`GET /api/healthz`** returns `{"ok": true}` with no DB access. **`GET /api/healthz/db`** runs `SELECT 1` and returns `{"ok": true}`.
- **Swagger** is at `/api/docs`.

Never-mapped trip pages (404) show the public thumbnail `https://i.ytimg.com/vi/<video_id>/hqdefault.jpg`.

## Edge cases to check by hand (before calling the project done)

1. **Link shapes:** `youtu.be/ID?si=…`, `/shorts/ID`, `m.youtube.com`, `&t=42s` and playlist params all open the same trip. Junk text searches the grid instead.
2. **Leaving mid-run:** refresh or close the tab mid-run, then reopen. The places so far are there and new ones keep arriving.
3. **Duplicates and stuck runs:** two tabs submitting the same new link start one job. A job killed mid-run shows "stalled", and Try again works.
4. **Running out mid-run:** with `MAX_SEARCHES_PER_VIDEO` temporarily set to 3 in `core/config.py` (or `Places` returning 429), the trip ends `partial` with the banner.
5. **Unusable videos:** private, unlisted, a 45-min video and a live stream each show their message and use no daily quota.

---

## Screens & states (copy and behavior; visuals from the approved Task 0 mockups)

**Approved mockups:** `afterframe/docs/mockups/mockups.html` (approved in sub-plan 01). Build the website to match them.
- **Visual identity:**
  - Fraunces headings and Inter body text.
  - An ultramarine accent.
  - Highlighter yellow for the selected pin and card.
  - Category colors: Food orange, Stay violet, Attraction red, Activity green, Shopping teal, Other slate.
- **Icons:** one drawn SVG icon set stands in for the ▶ ✓ ⚠ ↗ 📍 💡 glyphs in the copy below.
- **Theme:** the site follows the device's light/dark setting.

**Header (every page):**
- Logo on the left.
- A wide **search bar** in the center: "Paste a YouTube or Instagram link — or search mapped trips".
- "How it works" and GitHub on the right.

**Footer (every page):** "Built by ‹user's name›" · GitHub · LinkedIn.

**Search bar behavior:**
- **A link** is submitted. 200 or 202 navigates to `/v/<key>`.
- **Plain text** filters the home grid by title (navigates to `/?q=<text>`).
- **While submitting**, the bar is disabled and its button shows a spinner.
- **Errors** show under the bar (red for link problems; blue for `instagram_unsupported`, `rate_limited` and `busy`):
  - `invalid_url`: "That doesn't look like a YouTube link."
  - `instagram_unsupported`: "Instagram support is coming soon — try a YouTube link."
  - `private` / `not_found`: "We can't open that video. Is it public?"
  - `too_long`: "That one's over 30 minutes — try a shorter vlog."
  - `rate_limited`: "Today's free mapping slots are used up 🎒 — explore the trips below."
  - `busy`: "We're a bit busy — try again in a minute."

**Home `/`:**
1. **Demo video:** big, 16:9, centered, max about 1100px wide, under the header. A YouTube embed of `NEXT_PUBLIC_DEMO_YOUTUBE_ID` with the caption "See AfterFrame in action". If the env var is unset (before the demo exists), the block is hidden.
2. **"Mapped trips":** a grid of small cards, like YouTube's suggestions.
   - Each card has a thumbnail with a duration badge, a 2-line title, the channel, and "📍 14 places · 2 days ago".
   - 4 columns on desktop, 2 on tablet, 1 on phone, with "Load more" (skeleton cards while loading).
   - Shows done or partial trips, not hidden, with ≥ 1 place, newest first.
   - With `?q=`:
     - The demo video is hidden.
     - The heading reads "Results for ‘q’", with a "Clear search" link.
     - With no matches, it shows "No mapped trips match ‘q’." and "Paste a YouTube link above to map a new one."
3. Clicking a card goes to `/v/<key>`.

**Trip page `/v/<key>`:**
The **map is the star**, and there's **no embedded video player**.
- **Trip strip** (one slim row above the map): a small thumbnail, the title and channel, "14 places · 11 verified", category filter chips ("All" first, then Food / Stay / Attraction / Activity / Shopping / Other, showing only categories present), and "Watch on YouTube ↗". A chip filters both the pins and the list; numbers stay the same.
- **The map:** full width, about 70vh tall on desktop. A Google Map with **numbered pins** (①②③…), each colored by category, solid for verified and hollow for unconfirmed. It's fitted so every pin is visible.
- **Below the map, the numbered place list.** Its numbers match the pins. It's a 2-column grid of cards on desktop, and each card shows:
  - the **number** and **name**, e.g. "3. Café A Brasileira"
  - a **category** chip
  - **"▶ 2:14"**, which opens the video on YouTube at that moment in a new tab (`https://www.youtube.com/watch?v=<id>&t=134s`)
  - the **description** from the video
  - the badge "✓ Verified", or "⚠ Unconfirmed · [Looks right ✓]" (saved per viewer in localStorage)
  - "Open in Google Maps ↗"
- **Linking:**
  - Clicking a pin scrolls to its card and highlights it.
  - Clicking a card pans and zooms the map to its pin and highlights it. A "Show all pins" button then fits the map to every pin again.
- **"Mentioned but not found on the map (n)"** is a collapsible group after the list, with no numbers, keeping ▶ timestamps and descriptions.
- **Phone browser:** the trip strip, then the map (about 60vh), then the numbered list as single-column cards.
  - The chips scroll sideways in one row.
  - Close pins can overlap at the fit-all zoom; tapping a card zooms in.
- **Processing, no places yet.** A loading scene covers the map area:
  - travel photos crossfading every 6s with a slow zoom
  - drifting, blurred emojis (✈️🌴🏝️🗺️🍜🏔️⛵🎒)
  - a progress line from the real stage ("Packing your bags…" → "Watching the vlog for hidden gems…" → "Checking each spot on the map…")
  - a "📍 N places found" counter
  - a "💡 Did you know?" fact every 5s
- **After the first place:** the map appears, pins drop in as they're found, and a slim progress bar shows under the header. The count continues in the trip strip, e.g. "Checking each spot on the map… · 4 places so far".
- **Partial:** a banner: "Some places may be missing — we hit a limit while checking. Try again tomorrow."
- **Never mapped** (GET returns 404): the YouTube thumbnail, "This video hasn't been mapped yet." and [Map this video].
- **Failed or stalled:** "Something went wrong on our side." with [Try again].
- **No places found:** "No places found in this video — it might not be a travel vlog."

**`/how-it-works`:**
- an architecture diagram
- the agent flow
- the eval table
- the cost controls
- "Why no scraping"
- links to GitHub and Swagger (`/api/docs`)

---

## File Structure

```
afterframe/
  .github/workflows/ci.yml            # backend: uv sync + manage.py check; frontend: next build
  .github/workflows/deploy.yml        # main: build image → ECR (OIDC) → SSM command on EC2 → compose up + migrate
  .githooks/pre-push                  # refuses pushes to anything but git@github-personal:<user>/… (never Bitbucket)
  .github/workflows/db-keepalive.yml  # backup daily GET /api/healthz/db (primary keep-alive is Celery Beat)
  deploy/docker-compose.dev.yml       # name: afterframe; postgres:16 on :55432 + redis:7 on :56379 (no clash with work containers)
  deploy/docker-compose.prod.yml      # web, worker, beat, redis, nginx
  deploy/nginx/nginx.conf
  docs/mockups/mockups.html  docs/plans/plan-1.md
  backend/
    pyproject.toml Dockerfile manage.py .env.example
    config/settings.py urls.py asgi.py celery.py    # asgi: /mcp → MCP app, else Django
    core/
      config.py video_url.py youtube.py places.py match.py llm.py
      agent/schemas.py json_stream.py extract.py models.py resolve_graph.py pipeline.py
      evals/score.py
    trips/
      models.py repo.py rate_limit.py services.py tasks.py sse.py
      serializers.py views.py urls.py admin.py refresh.py
      management/commands/smoke_gemini.py try_ai.py seed_examples.py run_evals.py draft_labels.py
    mcp_server.py
    evals/dataset.json evals/reports/
  frontend/
    next.config.ts (rewrites)
    app/layout.tsx  app/page.tsx  app/v/[videoKey]/page.tsx  app/how-it-works/page.tsx
    components/ (shadcn/ui in components/ui) SiteHeader SearchBar DemoPlayer TripGrid TripCard
                TripView TripStrip TripMap PlaceDetailsCard PlaceList LoadingScene
                BackgroundCarousel FloatingEmojis FactTicker StateCard
    lib/ api.ts trip-state.ts confirmed.ts format.ts
    hooks/useTripEvents.ts
    data/fun-facts.json  public/backgrounds/*.webp  CREDITS.md
```

---

## Verification (end to end)

1. `uv run python manage.py check` and `npm run build` succeed, and CI is green.
2. **Local full flow:** paste a new vlog. The loading scene shows, numbered pins appear within about 60s, clicking a pin highlights its numbered card, "▶ 2:14" opens YouTube at that moment, and a reload mid-run resumes. When it's done, it appears in the home grid, and revisiting is instant.
3. All five **Edge cases to check by hand** pass on prod.
4. Prod: the home page shows the demo video and the seeded grid, `/api/docs` loads, and the MCP tool answers.
5. `run_evals` produces reports for both resolutions.


---

# AfterFrame Sub-plan 02: Project skeleton

> Read `00-overview.md` first. It holds the shared rules every task here relies on: **Keep AfterFrame separate from work**, Global Constraints, Data model, API contract, Screens & states and File Structure.
> You do all cloud setup yourself in the web consoles; Claude never runs cloud CLIs on this laptop. Claude only commits locally, and **you** push to your personal GitHub.
> Previous: `01-mockups.md` · Next: `03-gemini-and-google-apis.md`

**What you'll build:** The `afterframe` monorepo with a **personal-only** git setup (repo-local identity, an SSH host alias for personal GitHub, a push guard that blocks Bitbucket), a Django backend and a Next.js frontend that both run on your Mac, Postgres and Redis in Docker on their own ports, and a basic GitHub Actions CI.

**What you'll learn:** Keeping personal and work git separate, SSH keys and host aliases, uv (Python packages), Django project vs app, Next.js App Router, Docker Compose, `.env` files, GitHub Actions basics.

**Platforms for this step:** Docker Desktop (must be running) and **personal GitHub** (you create the repo and add your SSH key yourself, in your AfterFrame browser profile). See the Platform Setup Guide sections 00 and 02.

**Done when:** `git config user.email` shows your personal email, `ssh -T git@github-personal` greets your personal username, the first push lands on personal GitHub, `/api/healthz` returns `{"ok": true}`, and the Next.js starter page loads at `localhost:3000`.

**Using it with Claude:** open a new Claude Code tab in the `afterframe` folder and say: "Read `00-overview.md` and `02-project-setup.md` from `~/Desktop/AfterFrame plans/` and build this sub-plan with me, explaining each step."

---

### Task 1: Monorepo scaffold + CI

**Files:** `backend/` (uv project, Django project `config`, app `trips`, package `core`, `config/celery.py`), `backend/core/config.py`, `frontend/` (create-next-app + shadcn), `deploy/docker-compose.dev.yml`, `.github/workflows/ci.yml`, `.githooks/pre-push`, `.gitignore`, both `.env.example`, `docs/plans/plan-1.md`

- [ ] Step 0: **Personal git setup** (from **Keep AfterFrame separate from work**).
  - Create `/Users/khushboomalik/Desktop/Project/afterframe` and run `git init`.
  - Ask the user for their personal name, personal email and personal GitHub username. Set `git config user.name` and `git config user.email` **repo-locally**, never `--global`.
  - Write `.githooks/pre-push` (executable) to allow only `git@github-personal:<username>/…` remotes and reject anything containing `bitbucket`. Enable it with `git config core.hooksPath .githooks`.
  - Walk the user through the SSH key, the `~/.ssh/config` host alias and `ssh -T git@github-personal`, which **they** run. Then the user creates the empty repo in personal GitHub (in the AfterFrame browser profile) and runs `git remote add origin git@github-personal:<username>/afterframe.git` themselves.
  - Check that `git config user.email` shows the personal email, and that `git remote -v` shows only the `github-personal` URL.
- [ ] Step 1: Scaffold.
  - **Backend:** `uv init backend`, then `uv add django djangorestframework drf-spectacular whitenoise celery redis google-genai langgraph langchain-google-genai httpx pydantic tenacity "psycopg[binary]" dj-database-url python-dotenv gunicorn uvicorn-worker mcp`. Settings load `backend/.env` with `load_dotenv(override=True)`, so work shell variables can't override project values. Run `startproject config .`, then `startapp trips`.
  - **Dev services:** `deploy/docker-compose.dev.yml` has `name: afterframe`, `postgres:16` on host port **55432** and `redis:7` on host port **56379**, with named volumes `afterframe-pg` and `afterframe-redis`. `backend/.env.example` uses `DATABASE_URL=postgres://afterframe:afterframe@localhost:55432/afterframe` and `REDIS_URL=redis://localhost:56379/0`.
  - **Frontend:** `npx create-next-app@latest frontend --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm --yes`, then `npx shadcn@latest init` and `npm i motion @vis.gl/react-google-maps`.
- [ ] Step 2: Write `core/config.py` with the limits table, the env overrides and `require_env`.
  - **Settings:** lazy env reads, whitenoise, `STATIC_URL="/django-static/"`, DRF anon throttle `120/min` with the Redis cache.
  - **Celery:** broker `REDIS_URL`, `task_acks_late=True`, `worker_prefetch_multiplier=1`.
  - **Health checks:** `/api/healthz` (no DB) and `/api/healthz/db` (`SELECT 1`).
- [ ] Step 3: CI (no secrets, no tests) runs `uv sync && uv run python manage.py check` for the backend and `npm ci && npm run build` for the frontend. Copy this plan to `docs/plans/plan-1.md`.
- [ ] Step 4: Check.
  - Run `docker compose -f deploy/docker-compose.dev.yml up -d`. `docker compose -f deploy/docker-compose.dev.yml ps` shows only `afterframe-*` containers on ports 55432 and 56379. Work containers are untouched.
  - Run `uv run python manage.py migrate && runserver`. `/api/healthz` returns `{"ok": true}`.
  - `npm run dev` serves the Next.js page.
  - Check `git config user.email`, then make a local commit. The user runs `git push`.
  - A test `git push` to a fake bitbucket URL is rejected by the hook.
