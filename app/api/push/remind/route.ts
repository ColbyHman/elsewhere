import { NextResponse } from "next/server";
import { runReminders } from "@/lib/reminders";
import { pushConfigured } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Runs the due-date reminder sweep.
 *
 * Meant to be hit by a cron on the host (or by the compose healthcheck loop),
 * not by the browser. Guarded so an unauthenticated caller can't use it to
 * spam every registered device.
 */
export async function POST(req: Request) {
  const token = process.env.REMINDER_TOKEN;
  if (token) {
    const provided = req.headers.get("x-reminder-token") ?? new URL(req.url).searchParams.get("token");
    if (provided !== token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    return NextResponse.json(
      { error: "REMINDER_TOKEN is not set; refusing to run unauthenticated" },
      { status: 503 },
    );
  }

  if (!pushConfigured()) {
    return NextResponse.json({ error: "Push is not configured" }, { status: 503 });
  }

  try {
    const result = await runReminders();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reminder run failed" },
      { status: 500 },
    );
  }
}
