# Workout Tracker

Mobile-first 4-day split logger. Log reps/weight per set; next time you do that day, last session’s lifts show beside the inputs.

## Stack

- Next.js (App Router) + TypeScript
- Drizzle ORM + Postgres
- Deploy: Railway (web service + Postgres plugin)

## Local setup

1. Copy env and point at Postgres:

```bash
cp .env.example .env
```

2. Create a local database (example):

```bash
createdb workout_tracker
# or Docker:
docker run --name workout-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=workout_tracker -p 5432:5432 -d postgres:16
```

3. Migrate + seed Day 1 history from the CSV:

```bash
npm install
npm run db:migrate
```

4. Run the app:

```bash
npm run dev
```

Open the printed URL on your phone (same Wi‑Fi) or localhost.

## Railway settings (web service)

With Postgres already running (public proxy `sakura.proxy.rlwy.net:55748` is for external/local tools):

On the **web** service Variables, set:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway variable reference — uses the **private** `postgres.railway.internal` host between services) |
| `APP_TZ` | e.g. `Europe/Berlin` (controls what “today” means for sessions) |

You do **not** need to paste the public proxy URL into the web service. Prefer the internal reference so traffic stays on Railway’s private network.

Optional: leave `DATABASE_SSL` unset on Railway. For local `.env`, use `DATABASE_PUBLIC_URL` from the Postgres service and `DATABASE_SSL=true` (or unset).

Also generate a public domain on **web** (`railway domain` or Dashboard → Settings → Networking).

## App behavior

- **Home**: Day 1–4 picker (routine seeded from your Fall 2026 CSV).
- **Workout**: start/resume today’s session; auto-saves set logs to Postgres.
- **Last time**: previous *completed* session for that day (Day 1 is pre-seeded with yesterday’s CSV lifts).
- **Finish workout**: marks session completed so it becomes next week’s reference.
