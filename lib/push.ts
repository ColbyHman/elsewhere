import { createHash, randomUUID } from "node:crypto";
import * as webpush from "web-push";
import { getRedis } from "./redis";

/**
 * Web Push subscriptions (ADR-0001).
 *
 * VAPID keys are read from the environment and never generated here. Generating
 * them per-deploy would silently invalidate every existing subscription and
 * force a re-permission prompt on every device, which is exactly the failure
 * that looks like it worked.
 */

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  createdAt: string;
}

const K = {
  subs: "push:subs",
} as const;

function subKey(endpoint: string): string {
  return `push:sub:${createHash("sha256").update(endpoint).digest("hex")}`;
}

let configured = false;

export function pushConfigured(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "mailto:admin@localhost",
      pub,
      priv,
    );
    configured = true;
  }
  return true;
}

export function publicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export async function saveSubscription(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent: string | null,
): Promise<void> {
  const r = getRedis();
  const record: PushSubscriptionRecord = {
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    userAgent,
    createdAt: new Date().toISOString(),
  };
  const key = subKey(sub.endpoint);
  await r.set(key, JSON.stringify(record));
  await r.sadd(K.subs, key);
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const r = getRedis();
  const key = subKey(endpoint);
  await r.del(key);
  await r.srem(K.subs, key);
}

async function allSubscriptions(): Promise<PushSubscriptionRecord[]> {
  const r = getRedis();
  const keys = await r.smembers(K.subs);
  if (keys.length === 0) return [];
  const raw = await r.mget(keys);
  const out: PushSubscriptionRecord[] = [];
  for (const entry of raw) {
    if (!entry) continue;
    try {
      out.push(JSON.parse(entry) as PushSubscriptionRecord);
    } catch {
      // A malformed row is worse than a missing one — drop it.
    }
  }
  return out;
}

/**
 * Send to every device. Returns how many actually received it.
 *
 * Delivery is best-effort and this never throws for a single bad endpoint:
 * push services expire subscriptions, and one dead row must not stop the rest.
 */
export async function notifyAll(payload: {
  title: string;
  body: string;
  itemId?: string;
  url?: string;
}): Promise<{ sent: number; failed: number }> {
  if (!pushConfigured()) return { sent: 0, failed: 0 };

  const subs = await allSubscriptions();
  if (subs.length === 0) return { sent: 0, failed: 0 };

  const body = JSON.stringify({ ...payload, id: randomUUID() });
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
        sent += 1;
      } catch (err) {
        failed += 1;
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410 mean the subscription is gone for good.
        if (status === 404 || status === 410) {
          await removeSubscription(sub.endpoint);
        }
      }
    }),
  );

  return { sent, failed };
}
