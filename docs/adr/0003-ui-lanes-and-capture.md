# 0003 — Four lanes, capture at the bottom

Date: 2026-10-03
Status: Accepted

## Context

The v1 interface was a dashboard: two columns of cards, a grid of decision
prompts, a timeline, and a capture form at the top of the screen. It presented
everything at once and asked the user to parse it.

Two problems:

1. **The top of the screen is the worst place to capture from on a phone.**
   It sits under the browser chrome, requires a reach or a scroll, and the
   input competes with everything else on the page.

2. **A dashboard has no vocabulary.** Items were sorted into sections the app
   invented. Colby's actual mental model has four kinds of thing — chores,
   projects, things to consider, ideas — and they are not views of one list,
   they are different places to put something.

## Decision

### Capture lives at the bottom

A persistent input pinned to the bottom of the viewport. Always in the same
place, one-handed, reachable on a phone without scrolling or reaching. It
creates immediately on Enter, with no modal and no required metadata.

### Four lanes, switched not stacked

| Lane | Meaning | Data |
| --- | --- | --- |
| Chores | things to get done | `kind: todo`, not a project |
| Projects | things worth doing properly | `kind: todo`, `duration` above a threshold |
| Someday | worth considering, no date | `attention: later \| whenever` |
| Ideas | thoughts worth keeping | `kind: idea` |

A flat list per lane, not a grid, not cards. Lanes are switched with a tab row.
No lane shows content belonging to another.

Chores and projects share a `kind` and are distinguished by `duration`: a chore
fits in 30 minutes, a project does not. This avoids a new field and matches how
the distinction is actually made — by asking how long it takes.

Ideas take no metadata at all. They are jotted and recalled via search. Asking
for structure at the moment of inspiration is the fastest way to lose the idea.

### No decision-prompt grid

The "What can I do?" chooser is removed from v2. It depended on effort,
importance, and area — fields that measured as unset in real use, which made
the feature return empty or arbitrary results. Retrieval is by lane and search.

## Consequences

- Capturing is one gesture from any screen, which is the thing that has to feel
  effortless for a second brain to be used at all.
- Four lanes is a real commitment to a model, not a generic tag soup. Items that
  don't clearly belong anywhere stay in Someday.
- Losing the chooser removes a feature. Accepted: it was measurably not working,
  and a list the user can scan is a more predictable way to decide than a
  scored shortlist built from fields nobody fills in.
- The mobile and desktop layouts share one component tree. Desktop widens the
  lane list and puts the tab row in a sidebar; it is not a separate design.
