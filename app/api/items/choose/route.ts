import { NextResponse } from "next/server";
import { chooseItems } from "@/lib/redis";
import { isValidDesire, isValidMood, isValidScale } from "@/lib/validation";
import type { Scale } from "@/lib/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sp = url.searchParams;

  const timeParam = sp.get("time");
  const time = timeParam ? Number(timeParam) : NaN;
  const desireParam = sp.get("desire");
  const desire = desireParam && isValidDesire(desireParam) ? desireParam : undefined;
  const moodParam = sp.get("mood");
  const mood = moodParam && isValidMood(moodParam) ? moodParam : undefined;
  const energyParam = sp.get("energy");
  const energy = energyParam && isValidScale(Number(energyParam)) ? (Number(energyParam) as Scale) : undefined;

  try {
    const items = await chooseItems({
      time: Number.isInteger(time) && time > 0 ? time : undefined,
      desire,
      mood,
      energy,
    });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Could not read memory" }, { status: 503 });
  }
}
