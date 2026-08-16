import { NextResponse } from "next/server";
import { MOODS } from "@/lib/constants";
import { chooseItems } from "@/lib/redis";
import type { Desire, Mood, Scale } from "@/lib/types";

const VALID_DESIRE: Desire[] = ["need", "like"];
const VALID_SCALE: Scale[] = [1, 2, 3];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sp = url.searchParams;

  const timeParam = sp.get("time");
  const time = timeParam ? Number(timeParam) : NaN;
  const desireParam = sp.get("desire");
  const desire = desireParam && VALID_DESIRE.includes(desireParam as Desire) ? (desireParam as Desire) : undefined;
  const moodParam = sp.get("mood");
  const mood = moodParam && MOODS.includes(moodParam as Mood) ? (moodParam as Mood) : undefined;
  const energyParam = sp.get("energy");
  const energy = energyParam && VALID_SCALE.includes(Number(energyParam) as Scale) ? (Number(energyParam) as Scale) : undefined;

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
