import type { Attention } from "./types";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatRelative(iso: string): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return formatDate(iso) ?? "";
  const diff = Math.floor((date.getTime() - Date.now()) / 86400000);
  if (diff < 0) return `${-diff}d ago`;
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return `in ${diff}d`;
}

function dayDiff(dateStr: string): number {
  const date = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return NaN;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

export function upcomingLabel(dateStr: string): string {
  const diff = dayDiff(dateStr);
  if (Number.isNaN(diff)) return dateStr;
  if (diff < 0) return diff === -1 ? "Yesterday" : `${-diff} days overdue`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(
    new Date(`${dateStr.slice(0, 10)}T00:00:00`),
  );
  if (diff <= 6) return weekday;
  if (diff <= 13) return `Next ${weekday}`;
  return formatDate(dateStr) ?? dateStr;
}

export function formatDuration(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `~${minutes} min`;
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return hours === 1 ? "~1 hr" : `~${hours} hrs`;
  return `~${hours.toFixed(1).replace(/\.0$/, "")} hrs`;
}

// ── "When" ────────────────────────────────────────────────────────────────
//
// The editor exposes four buckets instead of separate attention + due-date
// fields. They write onto the existing data model rather than replacing it:
// Today/This week/Later set a concrete dueAt (so it shows up on the dated
// timeline), Whenever sets attention only and leaves dueAt null.

export type When = "today" | "week" | "later" | "whenever";

export const WHENS: Array<{ value: When; label: string }> = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "later", label: "Later" },
  { value: "whenever", label: "Whenever" },
];

const DAY_MS = 86400000;

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
}

export interface WhenFields {
  attention: Attention;
  dueAt: string | null;
}

export function whenToFields(when: When): WhenFields {
  switch (when) {
    case "today":
      return { attention: "now", dueAt: todayISO() };
    case "week":
      return { attention: "soon", dueAt: plusDays(7) };
    case "later":
      return { attention: "later", dueAt: plusDays(30) };
    default:
      return { attention: "whenever", dueAt: null };
  }
}

/** Best-effort read: which bucket does this item already sit in? */
export function fieldsToWhen(attention: Attention | null, dueAt: string | null): When {
  if (attention === "now") return "today";
  if (attention === "soon") return "week";
  if (attention === "later") return "later";
  if (attention === "whenever") return "whenever";
  // No attention set — infer from a due date if there is one.
  if (dueAt) {
    const diff = dayDiff(dueAt);
    if (!Number.isNaN(diff)) {
      if (diff <= 0) return "today";
      if (diff <= 7) return "week";
      return "later";
    }
  }
  return "later";
}
