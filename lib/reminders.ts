import { relativeDay } from "./dates";
import { getRedis, listDueSoon } from "./redis";
import { notifyAll } from "./push";

/**
 * Fire reminders for anything with a real due date (ADR-0002).
 *
 * Only `dueAt` triggers this. The soft horizon never does — "sometime this
 * week" must not produce a notification, or the app becomes noise and gets
 * muted.
 *
 * Safe to run repeatedly: the Redis key below is a 24h dedupe marker per item
 * per due date, so a restart or a double-trigger cannot spam.
 */

const DEDUPE_PREFIX = "push:reminded";

function dedupeKey(itemId: string, dueAt: string): string {
  return `${DEDUPE_PREFIX}:${itemId}:${dueAt}`;
}

export interface ReminderRun {
  checked: number;
  sent: number;
  skipped: number;
  failed: number;
}

export async function runReminders(now = new Date()): Promise<ReminderRun> {
  const today = relativeDay(now.toISOString());
  const dueToday = await listDueSoon(today);
  const r = getRedis();

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of dueToday) {
    if (!item.dueAt) continue;

    const marker = dedupeKey(item.id, item.dueAt);
    if (await r.exists(marker)) {
      skipped += 1;
      continue;
    }

    const when = item.dueAt === today ? "today" : "overdue";
    const result = await notifyAll({
      title: item.name,
      body: `Due ${when}`,
      itemId: item.id,
      url: "/",
    });

    if (result.sent > 0) {
      sent += 1;
      // 24 hours: enough that a genuinely long-running day still nudges once.
      await r.set(marker, "1", "EX", 60 * 60 * 24);
    } else {
      failed += 1;
    }
  }

  return { checked: dueToday.length, sent, skipped, failed };
}
