# Workout Tracker

Mobile-first 4-day split logger. Log reps/weight per set; next time you do that day, last session’s lifts show beside the inputs.

Protected by a shared app password (session cookie). All pages and `/api/*` routes require login in production.

## Stack

- Next.js (App Router) + TypeScript
- Drizzle ORM + Postgres
- Deploy: Railway (web service + Postgres plugin)

## Local setup

1. Copy env and point at Postgres:

```bash
cp .env.example .env
```

Set a real `APP_PASSWORD` and generate `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

2. Create a local database (example):

```bash
createdb workout_tracker
# or Docker:
docker run --name workout-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=workout_tracker -p 5432:5432 -d postgres:16
```

3. Migrate + seed Day 1 history:

```bash
npm install
npm run db:migrate
```

4. Run the app:

```bash
npm run dev
```

Open the printed URL on your phone (same Wi‑Fi) or localhost, then unlock with `APP_PASSWORD`.

## Railway settings (web service)

Attach a Postgres plugin to the project. On the **web** service Variables, set:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway variable reference — private host between services) |
| `APP_TZ` | e.g. `Europe/Berlin` (controls what “today” means for sessions) |
| `APP_PASSWORD` | Shared unlock password for the app |
| `AUTH_SECRET` | Long random string (`openssl rand -base64 32`) |

Prefer the internal `DATABASE_URL` reference so traffic stays on Railway’s private network. For local tools, use the Postgres service’s public URL from the Railway dashboard (do not commit it).

Optional: leave `DATABASE_SSL` unset on Railway. For local `.env` against the public proxy, set `DATABASE_SSL=true`.

Generate a public domain on **web** (`railway domain` or Dashboard → Settings → Networking).

## App behavior

- **Login**: shared password; session cookie lasts 30 days (`Lock` in the nav clears it).
- **Home**: Day 1–4 picker (routine seeded from a Fall 2026 CSV).
- **Workout**: start/resume today’s session; auto-saves set logs to Postgres.
- **Last time**: previous *completed* session for that day (Day 1 is pre-seeded).
- **Finish workout**: marks session completed so it becomes next week’s reference.
