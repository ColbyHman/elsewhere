import type { Item } from "./types";

/**
 * The four lanes. A second brain should not require the user to understand a
 * taxonomy — but it also should not be a tag soup. These four cover what gets
 * written down, and every item lands in exactly one.
 *
 * Chores and projects deliberately share `kind: "todo"` and are separated only
 * by duration. The distinction is "can I do this in half an hour?", which is
 * how it gets decided anyway, and it avoids inventing a field for it.
 */

export const PROJECT_MIN_MINUTES = 60;

export type Lane = "chores" | "projects" | "someday" | "ideas";

export interface LaneDef {
  id: Lane;
  label: string;
  blurb: string;
  empty: string;
}

export const LANES: LaneDef[] = [
  {
    id: "chores",
    label: "Chores",
    blurb: "Quick things to get done",
    empty: "Nothing outstanding. Type below to add one.",
  },
  {
    id: "projects",
    label: "Projects",
    blurb: "Bigger things worth doing properly",
    empty: "No projects yet. Anything you'd call a project goes here.",
  },
  {
    id: "someday",
    label: "Someday",
    blurb: "Worth considering, no deadline",
    empty: "Nothing waiting for you. Ideas you might act on later land here.",
  },
  {
    id: "ideas",
    label: "Ideas",
    blurb: "Thoughts worth keeping",
    empty: "No ideas yet. Jot them below — they'll be here when you need them.",
  },
];

export function isProject(item: Pick<Item, "duration">): boolean {
  return item.duration != null && item.duration >= PROJECT_MIN_MINUTES;
}

/**
 * Which lane does this item belong to?
 *
 * Order matters. Ideas are claims; then soft horizons take undated chores and
 * projects; only then does duration split chores from projects.
 */
export function laneOf(item: Item): Lane {
  if (item.kind === "idea") return "ideas";

  const soft = item.attention === "later" || item.attention === "whenever";
  const dated = item.dueAt != null;

  // Anything parked in a soft horizon stays in Someday even if it looks like a
  // chore, because "I'll get to it" is the whole point of parking it.
  if (soft && !dated) return "someday";

  return isProject(item) ? "projects" : "chores";
}

export function matchesLane(item: Item, lane: Lane): boolean {
  return laneOf(item) === lane;
}
