import { AREAS, ATTENTIONS, DESIRES, KINDS, MOODS, SCALES, STATUSES } from "./constants";
import type { Area, Attention, Desire, ItemKind, ItemStatus, ListParams, Mood, Scale } from "./types";

export function isValidArea(value: unknown): value is Area {
  return typeof value === "string" && AREAS.includes(value as Area);
}

export function isValidKind(value: unknown): value is ItemKind {
  return typeof value === "string" && KINDS.includes(value as ItemKind);
}

export function isValidAttention(value: unknown): value is Attention {
  return typeof value === "string" && ATTENTIONS.includes(value as Attention);
}

export function isValidDesire(value: unknown): value is Desire {
  return typeof value === "string" && DESIRES.includes(value as Desire);
}

export function isValidStatus(value: unknown): value is ItemStatus {
  return typeof value === "string" && STATUSES.includes(value as ItemStatus);
}

export function isValidScale(value: unknown): value is Scale {
  return typeof value === "number" && SCALES.includes(value as Scale);
}

export function isValidMood(value: unknown): value is Mood {
  return typeof value === "string" && MOODS.includes(value as Mood);
}

export function isValidView(value: unknown): value is ListParams["view"] {
  const views: ReadonlyArray<NonNullable<ListParams["view"]>> = [
    "today",
    "inbox",
    "soon",
    "later",
    "important",
    "easy",
    "fun",
    "recent",
  ];
  return typeof value === "string" && views.includes(value as NonNullable<ListParams["view"]>);
}

export function isValidSort(value: unknown): value is ListParams["sort"] {
  return value === "recent" || value === "due" || value === "updated";
}