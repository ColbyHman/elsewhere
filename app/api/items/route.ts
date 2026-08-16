import { NextResponse } from "next/server";
import { AREAS, KINDS } from "@/lib/constants";
import { createItem, listItems, normalizeTags, wipeAll } from "@/lib/redis";
import type { Area, Attention, Desire, ItemKind, ItemStatus, ListParams, Scale } from "@/lib/types";

const VALID_ATTENTION: Attention[] = ["now", "soon", "later", "whenever"];
const VALID_DESIRE: Desire[] = ["need", "like"];
const VALID_STATUS: ItemStatus[] = ["open", "done", "archived"];
const VALID_SCALE: Scale[] = [1, 2, 3];

function asInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sp = url.searchParams;

  const view = (sp.get("view") ?? undefined) as ListParams["view"];
  const attentionParam = sp.get("attention");
  const attention =
    attentionParam && (VALID_ATTENTION.includes(attentionParam as Attention) || attentionParam === "inbox")
      ? (attentionParam as Attention | "inbox")
      : undefined;
  const areaParam = sp.get("area");
  const area = areaParam && AREAS.includes(areaParam as Area) ? (areaParam as Area) : undefined;
  const desireParam = sp.get("desire");
  const desire = desireParam && VALID_DESIRE.includes(desireParam as Desire) ? (desireParam as Desire) : undefined;
  const statusParam = sp.get("status");
  const status =
    statusParam &&
    (statusParam === "all" || VALID_STATUS.includes(statusParam as ItemStatus))
      ? (statusParam as ItemStatus | "all")
      : undefined;
  const kindParam = sp.get("kind");
  const kind =
    kindParam && KINDS.includes(kindParam as ItemKind) ? (kindParam as ItemKind) : undefined;
  const importanceParam = sp.get("importance");
  const importance = importanceParam && VALID_SCALE.includes(Number(importanceParam) as Scale) ? (Number(importanceParam) as Scale) : undefined;
  const energyParam = sp.get("energy");
  const energy = energyParam && VALID_SCALE.includes(Number(energyParam) as Scale) ? (Number(energyParam) as Scale) : undefined;
  const funParam = sp.get("fun");
  const fun = funParam === "true" ? true : undefined;

  const sortParam = sp.get("sort");
  const sort =
    sortParam && ["recent", "due", "updated"].includes(sortParam)
      ? (sortParam as ListParams["sort"])
      : undefined;

  const params: ListParams = {
    view,
    attention,
    area,
    desire,
    status,
    kind,
    importance,
    energy,
    fun,
    q: sp.get("q") ?? undefined,
    tag: sp.get("tag") ?? undefined,
    sort,
    limit: asInt(sp.get("limit")),
    offset: asInt(sp.get("offset")),
  };

  try {
    const items = await listItems(params);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json(
      { error: "Could not read memory" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "A name is required" }, { status: 400 });
  }
  if (name.length > 300) {
    return NextResponse.json({ error: "Name is too long" }, { status: 400 });
  }

  const description = typeof data.description === "string" ? data.description.trim() : undefined;
  const kind = data.kind && KINDS.includes(data.kind as ItemKind) ? (data.kind as ItemKind) : undefined;
  const area = data.area && AREAS.includes(data.area as Area) ? (data.area as Area) : undefined;
  const attention = VALID_ATTENTION.includes(data.attention as Attention)
    ? (data.attention as Attention)
    : undefined;
  const desire = VALID_DESIRE.includes(data.desire as Desire) ? (data.desire as Desire) : undefined;
  const importance = VALID_SCALE.includes(data.importance as Scale) ? (data.importance as Scale) : undefined;
  const energy = VALID_SCALE.includes(data.energy as Scale) ? (data.energy as Scale) : undefined;
  const duration =
    typeof data.duration === "number" && Number.isInteger(data.duration) && data.duration > 0
      ? data.duration
      : undefined;
  const fun = typeof data.fun === "boolean" ? data.fun : undefined;
  const availableAt = typeof data.availableAt === "string" && data.availableAt ? data.availableAt : undefined;
  const tags = Array.isArray(data.tags)
    ? normalizeTags(data.tags.filter((t): t is string => typeof t === "string"))
    : undefined;
  const dueAt = typeof data.dueAt === "string" && data.dueAt ? data.dueAt : undefined;
  const status = VALID_STATUS.includes(data.status as ItemStatus)
    ? (data.status as ItemStatus)
    : undefined;

  try {
    const item = await createItem({ name, description, kind, area, attention, desire, importance, energy, duration, fun, availableAt, tags, dueAt, status });
    return NextResponse.json({ item }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save item" }, { status: 503 });
  }
}

export async function DELETE() {
  try {
    const count = await wipeAll();
    return NextResponse.json({ deleted: count });
  } catch {
    return NextResponse.json({ error: "Could not wipe items" }, { status: 503 });
  }
}
