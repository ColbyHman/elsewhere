# 0002 — Due date and "when" are separate concepts

Date: 2026-10-03
Status: Accepted

## Context

The previous editor collapsed scheduling into a single row of buckets —
Today / This week / Later / Whenever — and wrote a concrete `dueAt` derived from
the bucket. That was convenient and wrong.

Colby occasionally has genuine deadlines: a tax estimate due 15 November is not
"Later", it is a specific date. Mapping a soft planning bucket onto the real
due-date field meant choosing "Later" silently overwrote 15 November with
"today + 30 days", and the original deadline was unrecoverable.

The two things mean different things:

- **Due date** — a real commitment with a real date. Earns a notification.
  Rare, but consequential when it exists.
- **When** — a soft horizon. "Sometime this week." No notification, no alarm.
  This is the common case and the one that should be trivial to set.

Overloading one field for both meant the common case corrupted the rare,
important one.

## Decision

Keep them separate and never let one overwrite the other.

- `dueAt` — an explicit `YYYY-MM-DD` date, set only by deliberate action.
  Removable. The only field that produces a notification.
- `attention` — the soft horizon, four buckets. Never writes to `dueAt`.

The editor surfaces `dueAt` as a single optional date input, always visible
because it is rare and consequential. The soft horizon is a compact chip row
that is easy to sweep past. Neither field reads from the other.

An item may have both: "Quarterly tax estimate" with a real due date *and*
attention `now`, because you are doing it today and it is also overdue.

## Consequences

- Two controls instead of one. Deliberate: the single control was only simpler
  by destroying information.
- Items with a real deadline are discoverable and greppable, which the derived
  dates were not.
- Anything reading `dueAt` — the dashboard timeline, the reminder scheduler —
  now receives only genuine deadlines, so notification spam is not possible by
  accident.
- Existing items whose `dueAt` was written by the previous bucket logic are
  indistinguishable from real deadlines. No migration is performed: the data is
  plausible either way and rewriting it would risk destroying real dates.
