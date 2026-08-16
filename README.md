# Elsewhere

A calm, self-hosted personal life dashboard. Get things out of your head, see what deserves attention, and decide what to do with the time and energy you have. Not a productivity dashboard with charts — one place to keep everything, with just enough structure to help you choose.

The experience is **capture → orient → choose → act**:

- **Capture** — one input, a few words, done. Nothing else is ever required; every detail is optional and added later.
- **Orient** — the dashboard is the home screen and answers *"what should I look at?"*: **Need to do** (obligations sorted by urgency) and **Would like to do** (hobbies, projects, fun sorted by importance), plus **What can I do?** (decision prompts), **Coming up** (dated timeline and opportunity buckets), and **Recently captured**. When nothing is urgent it simply says *"Nothing urgent. You're in good shape."* — no red badges, no anxiety.
- **Choose** — "What do you want to do?" offers starting points (*"I have 15–30 minutes"*, *"Something fun"*, *"Help me catch up"*…) and fits the decision around *your* situation: a rough amount of time, a mood, and an energy level. It returns a shortlist of a few suggestions, not a big list.
- **Act** — one collection, one space. Tasks, ideas and notes live side by side as note-like cards ("Home · ~30 min · Important"), and finishing a to-do only dims it in the stream instead of making it disappear.

Redis is the source of truth (no SQLite, no filesystem storage). Everything runs from a single `docker compose up`.

## Features

- **Capture-first** — one input, "What's on your mind?". Just a title is enough; every detail is optional.
- **Two-column dashboard** — **Need to do** (obligations sorted by urgency) and **Would like to do** (hobbies, projects, fun sorted by importance) sit side by side. Below: **What can I do?** decision prompts, **Coming up** (dated timeline plus weekend/next-week opportunity buckets), and **Recently captured**. Browse from the "View all →" links.
- **Browse, not tabs** — from the dashboard jump into contextual views: All / Need to do / Would like to do / Recently added / Important / Ideas / Whenever / Quick wins / Fun. "Back to dashboard" (or `Esc`) returns home.
- **Decision prompts** — *"15–30 minutes"*, *"A few hours"*, *"I want something fun"*, *"Something creative"*, *"Help me catch up"*, *"Run some errands"* each launch a guided choose flow pre-filled to your situation.
- **Desire as first-class signal** — every item can be tagged as Need to do / Would like to do. The dashboard and choose flow use this to balance responsibilities with desires.
- **Time horizons** — Now / Soon / Later / Whenever (Whenever is for hobbies and fun you pick up when the moment comes).
- **Progressive metadata** — title, description, type (Note / To do / Idea), area, attention, importance, **time** (≈ how long it takes), **energy** (Easy / Medium / Hard), **fun**, due date, and **available after** (don't suggest it before then). All optional, captured via compact pills in the editor.
- **Choose** — a shortlist of ~5 suggestions filtered by time, desire and mood. Urgent and overdue items get a boost; short windows prefer low-energy quick wins. Mixed need/like results keep both sides visible.
- **Done is de-emphasized** — completing a to-do keeps it in the stream (struck through), so your memory never loses a thread.
- **Areas** — home, work, personal, finance, health, ideas, other.
- **Search** — full-text over name, description, tags and area, indexed as you type (includes done items).
- **Offline-ready PWA** — installable, cached shell, optimistic UI with a persisted offline queue that syncs on reconnect.
- **Keyboard** — `n` capture, `/` search, `Esc` back to dashboard.
- **Backups** — one-command snapshots of all Redis keys, restorable in place.

## Architecture

- **Next.js 16** (App Router) with route handlers at `/api/items*` (including `/api/items/choose` for suggestions).
- **Redis** stores every item as a hash plus maintained secondary indexes:
  - z-sets by attention, status, area, importance, energy, fun, tags, kind and due date, all scored by `createdAt` (due scored by the due date) — filters are translated into a handful of indexed Redis operations, never fetch-all-and-filter. The "All" view is a union of the open and done sets.
  - sets per search token (name/description/tags/area); queries use `SINTER`.
- **Choose scoring** — the `/api/items/choose` handler ranks the candidate set with mood-aware filters (urgent, admin, home, hobby, fun) plus boosts for overdue and due-soon items, a duration-vs-window fit, and a quick-win bonus for short windows at low energy.
- **Persistence** — the Redis service runs with AOF (`appendfsync everysec`) and RDB snapshots onto a named volume.

## Run with Docker (recommended)

```bash
docker compose up -d
```

This starts both the app (http://localhost:3000) and Redis with persistence and a health check. Data survives restarts in the `redis-data` volume.

### Dev without Docker

```bash
docker compose up -d redis   # Redis only, exposed on localhost:6379
npm install
npm run dev                  # app on http://localhost:3000
```

## Backups

The app writes JSON snapshots of every Redis key (values as base64 DUMP payloads) into `./backups` and keeps the last 14 by default.

```bash
docker compose exec app node scripts/backup.mjs          # snapshot
docker compose exec app node scripts/restore.mjs         # latest snapshot
docker compose exec app node scripts/restore.mjs backups/memory-<stamp>.json

# same scripts locally (run from the repo root):
npm run backup
npm run restore
```

`BACKUP_KEEP=30 node scripts/backup.mjs` changes how many snapshots are retained.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |

## Development

```bash
npx next typegen && npx tsc --noEmit   # type-check (typegen regenerates route types)
npm run lint
npm run build
```

## Project layout

- `app/api/items*` — REST handlers (list/create, item CRUD, counts, choose).
- `lib/redis.ts` — the Redis data layer: hashes + index maintenance + query translation + choose scoring.
- `lib/store.tsx` — `MemoryProvider` / `useMemory` (filter state, optimistic mutations, offline queue).
- `components/` — app chrome, dashboard sections, browse view, item cards, item editor, filter panel, choose modal, search.
- `scripts/` — backup, restore, icon generation.
