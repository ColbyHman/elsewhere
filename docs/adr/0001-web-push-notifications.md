# 0001 — Web Push for due-date reminders

Date: 2026-10-03
Status: Accepted

## Context

The app needs to tell Colby about things with a due date — the electricity bill,
the tax estimate — without him having to open the app and look.

Two notification mechanisms exist in the browser:

1. **Local notifications** (`Notification` + `setTimeout` in a page or SW).
   Only fire while the app is open or the SW is alive. Useless for a 9am
   reminder about something noticed the night before.

2. **Web Push** (VAPID). A push service holds the subscription and wakes the
   service worker with no app running. This is the only mechanism that can
   reach someone who has closed the app.

So: Web Push, or nothing.

## Constraints

- **iOS requires the PWA to be installed to the Home Screen.** There is no
  browser-PWA push on iOS without it. Standalone display mode is a prerequisite,
  not a nicety.
- **Permission can be denied and is per-origin.** There is no re-prompt. If the
  user declines, reminders are silently unavailable and the UI must say so
  rather than fail quietly.
- **Delivery is best-effort.** Push services may delay or coalesce. A push
  must never be treated as a guaranteed deadline alert.
- **No third-party push service.** Self-hosted means the VAPID private key
  lives on Colby's own server. Losing it invalidates every existing
  subscription and requires re-permission on all devices.

## Decision

Implement Web Push with VAPID, self-hosted.

- Keys generated once, stored in env as `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`.
  Generating them per-deploy would silently break every subscription.
- A `push_subscriptions` set in Redis keyed by endpoint, holding the p256dh and
  auth secrets and a `userAgent` for identifying stale rows.
- A service-worker `push` handler that parses the payload, shows a
  `notification`, and focuses or opens the app on click.
- A client-side `pushManager.subscribe()` flow behind an explicit "Remind me"
  action — never an unsolicited permission prompt on load.
- Due dates are the only trigger for v1. The soft "when" horizon is a planning
  aid and must never generate a notification.

## Consequences

- Reminders work reliably only from the installed Home Screen app. The app must
  detect standalone mode and explain this rather than silently doing nothing.
- Enabling this adds the `web-push` dependency and VAPID secrets to the
  deployment. It cannot run on the same compose file without them.
- Because delivery is best-effort, the in-app dashboard remains the source of
  truth. Push is a nudge, never the system of record.
- If the private key is lost, all subscriptions must be cleared and re-granted.
  This is documented rather than automated, deliberately — silently regenerating
  keys would look like it worked while stranding every device.

## Alternatives considered

- **Email / SMS reminders.** Reliable and server-independent, but require
  contact details, an outbound provider, and a sending domain. Rejected as a
  poor fit for a local-first app with no cloud dependency.
- **Local notifications only.** Rejected: cannot notify a closed app.
- **No reminders.** Rejected: explicitly requested.
