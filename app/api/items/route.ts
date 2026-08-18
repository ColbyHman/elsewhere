import { NextResponse } from "next/server";
import { createItem, listItems, wipeAll } from "@/lib/redis";
import { normalizeTags } from "@/lib/text";
import { isValidArea, isValidAttention, isValidDesire, isValidKind, isValidScale, isValidSort, isValidStatus } from "@/lib/validation";
import type { ListParams } from "@/lib/types";

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
    attentionParam && (isValidAttention(attentionParam) || attentionParam === "inbox")
      ? (attentionParam as ListParams["attention"])
      : undefined;
  const areaParam = sp.get("area");
  const area = areaParam && isValidArea(areaParam) ? areaParam : undefined;
  const desireParam = sp.get("desire");
  const desire = desireParam && isValidDesire(desireParam) ? desireParam : undefined;
  const statusParam = sp.get("status");
  const status =
    statusParam && (statusParam === "all" || isValidStatus(statusParam))
      ? (statusParam as ListParams["status"])
      : undefined;
  const kindParam = sp.get("kind");
  const kind = kindParam && isValidKind(kindParam) ? kindParam : undefined;
  const importanceParam = sp.get("importance");
  const importance = importanceParam && isValidScale(Number(importanceParam)) ? (Number(importanceParam) as ListParams["importance"]) : undefined;
  const energyParam = sp.get("energy");
  const energy = energyParam && isValidScale(Number(energyParam)) ? (Number(energyParam) as ListParams["energy"]) : undefined;
  const funParam = sp.get("fun");
  const fun = funParam === "true" ? true : undefined;

  const sortParam = sp.get("sort");
  const sort = sortParam && isValidSort(sortParam) ? sortParam : undefined;

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
  const kind = data.kind && isValidKind(data.kind) ? data.kind : undefined;
  const area = data.area && isValidArea(data.area) ? data.area : undefined;
  const attention = isValidAttention(data.attention) ? data.attention : undefined;
  const desire = isValidDesire(data.desire) ? data.desire : undefined;
  const importance = isValidScale(data.importance) ? data.importance : undefined;
  const energy = isValidScale(data.energy) ? data.energy : undefined;
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
  const status = isValidStatus(data.status) ? data.status : undefined;

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
