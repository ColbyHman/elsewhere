import type { Area, Attention, Desire, Filter, ItemKind, Mood } from "./types";

// ── Areas ──────────────────────────────────────────────────────────────────

export const AREAS: Area[] = [
  "home",
  "work",
  "personal",
  "finance",
  "health",
  "ideas",
  "other",
];

export const AREA_LABEL: Record<Area, string> = {
  home: "Home",
  work: "Work",
  personal: "Personal",
  finance: "Finance",
  health: "Health",
  ideas: "Ideas",
  other: "Other",
};

// ── Attention levels ───────────────────────────────────────────────────────

export const ATTENTIONS: Attention[] = ["now", "soon", "later", "whenever"];

export const ATTENTION_LABEL: Record<Attention, string> = {
  now: "Now",
  soon: "Soon",
  later: "Later",
  whenever: "Whenever",
};

// ── Desire ─────────────────────────────────────────────────────────────────

export const DESIRE_LABEL: Record<Desire, string> = {
  need: "Need to do",
  like: "Would like to do",
};

// ── Status ─────────────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<"open" | "done" | "archived", string> = {
  open: "Open",
  done: "Done",
  archived: "Archived",
};

// ── Item kinds ─────────────────────────────────────────────────────────────

export const KINDS: ItemKind[] = ["note", "todo", "idea"];

export const KIND_LABEL: Record<ItemKind, string> = {
  note: "Memory",
  todo: "To do",
  idea: "Idea",
};

// ── Moods ──────────────────────────────────────────────────────────────────

export const MOODS: Mood[] = ["anything", "productive", "easy", "fun", "creative", "errands"];

export const MOOD_LABEL: Record<Mood, string> = {
  anything: "Anything",
  productive: "Productive",
  easy: "Easy",
  fun: "Fun",
  creative: "Creative",
  errands: "Errands",
};

// ── Scoring thresholds ─────────────────────────────────────────────────────

export const IMPORTANT_IMPORTANCE = 3;
export const EASY_WIN_ENERGY = 1;

// ── Duration / time options ────────────────────────────────────────────────

export const DURATION_OPTIONS: Array<{ minutes: number; label: string }> = [
  { minutes: 15, label: "~15 min" },
  { minutes: 30, label: "~30 min" },
  { minutes: 60, label: "~1 hr" },
  { minutes: 180, label: "~3 hrs" },
  { minutes: 360, label: "~6 hrs" },
];

export const CHOOSE_TIME_BUCKETS: Array<{ minutes: number; label: string }> = [
  { minutes: 15, label: "15 minutes" },
  { minutes: 30, label: "30 minutes" },
  { minutes: 60, label: "1 hour" },
  { minutes: 180, label: "A few hours" },
  { minutes: 360, label: "Most of the day" },
];

// ── Config ─────────────────────────────────────────────────────────────────

export const RECENT_WINDOW_DAYS = 7;

export const DEFAULT_FILTER: Filter = {
  status: "all",
  kind: null,
  attention: null,
  area: null,
  desire: null,
  important: false,
  easy: false,
  fun: false,
  recent: false,
};
