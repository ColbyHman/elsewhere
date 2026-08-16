import { NextResponse } from "next/server";
import { AREAS, KINDS } from "@/lib/constants";
import { deleteItem, getItem, normalizeTags, updateItem } from "@/lib/redis";
import type { Area, Attention, Desire, ItemKind, ItemStatus, Scale } from "@/lib/types";

const VALID_ATTENTION: Attention[] = ["now", "soon", "later", "whenever"];
const VALID_DESIRE: Desire[] = ["need", "like"];
const VALID_STATUS: ItemStatus[] = ["open", "done", "archived"];
const VALID_SCALE: Scale[] = [1, 2, 3];

type RouteContext = { params: Promise<{ id: string }> };

async function parseId(ctx: RouteContext): Promise<string | null> {
  const { id } = await ctx.params;
  return id && id.length <= 100 ? id : null;
}

function coercePatch(body: unknown) {
  const data = body as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) {
    if (typeof data.name !== "string" || !data.name.trim()) return { error: "Name cannot be empty" };
    patch.name = data.name.trim();
  }
  if (data.description !== undefined) {
    patch.description = typeof data.description === "string" ? data.description : null;
  }
  if (data.kind !== undefined) {
    if (KINDS.includes(data.kind as ItemKind)) patch.kind = data.kind as ItemKind;
  }
  if (data.area !== undefined) {
    patch.area = data.area && AREAS.includes(data.area as Area) ? (data.area as Area) : null;
  }
  if (data.attention !== undefined) {
    patch.attention = VALID_ATTENTION.includes(data.attention as Attention)
      ? (data.attention as Attention)
      : null;
  }
  if (data.desire !== undefined) {
    patch.desire = VALID_DESIRE.includes(data.desire as Desire) ? (data.desire as Desire) : null;
  }
  if (data.importance !== undefined) {
    patch.importance = VALID_SCALE.includes(data.importance as Scale)
      ? (data.importance as Scale)
      : null;
  }
  if (data.energy !== undefined) {
    patch.energy = VALID_SCALE.includes(data.energy as Scale) ? (data.energy as Scale) : null;
  }
  if (data.duration !== undefined) {
    patch.duration =
      typeof data.duration === "number" && Number.isInteger(data.duration) && data.duration > 0
        ? data.duration
        : null;
  }
  if (data.fun !== undefined) {
    if (typeof data.fun === "boolean") patch.fun = data.fun;
  }
  if (data.availableAt !== undefined) {
    patch.availableAt = typeof data.availableAt === "string" && data.availableAt ? data.availableAt : null;
  }
  if (data.status !== undefined) {
    patch.status = VALID_STATUS.includes(data.status as ItemStatus) ? (data.status as ItemStatus) : null;
  }
  if (data.tags !== undefined) {
    patch.tags = Array.isArray(data.tags)
      ? normalizeTags(data.tags.filter((t): t is string => typeof t === "string"))
      : [];
  }
  if (data.dueAt !== undefined) {
    patch.dueAt = typeof data.dueAt === "string" && data.dueAt ? data.dueAt : null;
  }
  return { patch };
}

export async function GET(_request: Request, ctx: RouteContext) {
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const item = await getItem(id);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "Could not read memory" }, { status: 503 });
  }
}

export async function PATCH(request: Request, ctx: RouteContext) {
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const result = coercePatch(body);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  const patch = result.patch;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  try {
    const item = await updateItem(id, patch);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "Could not update item" }, { status: 503 });
  }
}

export async function DELETE(_request: Request, ctx: RouteContext) {
  const id = await parseId(ctx);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const ok = await deleteItem(id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Could not delete item" }, { status: 503 });
  }
}
