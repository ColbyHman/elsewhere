import { NextResponse } from "next/server";
import { publicKey, pushConfigured, removeSubscription, saveSubscription } from "@/lib/push";

export const dynamic = "force-dynamic";

/** GET — hand the browser the VAPID public key so it can subscribe. */
export async function GET() {
  if (!pushConfigured()) {
    return NextResponse.json({ configured: false, publicKey: null }, { status: 503 });
  }
  return NextResponse.json({ configured: true, publicKey: publicKey() });
}

/** POST — register a device subscription. */
export async function POST(req: Request) {
  if (!pushConfigured()) {
    return NextResponse.json({ error: "Push is not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sub = body as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (
    typeof sub?.endpoint !== "string" ||
    typeof sub.keys?.p256dh !== "string" ||
    typeof sub.keys?.auth !== "string"
  ) {
    return NextResponse.json({ error: "Malformed subscription" }, { status: 400 });
  }

  await saveSubscription(
    { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
    req.headers.get("user-agent"),
  );

  return NextResponse.json({ ok: true });
}

/** DELETE — drop this device's subscription. */
export async function DELETE(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const endpoint = (body as { endpoint?: unknown }).endpoint;
  if (typeof endpoint !== "string") {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }
  await removeSubscription(endpoint);
  return NextResponse.json({ ok: true });
}
