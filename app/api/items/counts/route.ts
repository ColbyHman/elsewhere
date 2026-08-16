import { NextResponse } from "next/server";
import { getCounts } from "@/lib/redis";

export async function GET() {
  try {
    const counts = await getCounts();
    return NextResponse.json({ counts });
  } catch {
    return NextResponse.json({ error: "Could not read memory" }, { status: 503 });
  }
}
