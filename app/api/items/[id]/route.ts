import { NextResponse } from "next/server";
import { deleteItem, getItem, updateItem } from "@/lib/redis";
import { normalizeTags } from "@/lib/text";
import { isValidArea, isValidAttention, isValidDesire, isValidKind, isValidScale, isValidStatus } from "@/lib/validation";

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
    if (isValidKind(data.kind)) patch.kind = data.kind;
  }
  if (data.area !== undefined) {
    patch.area = data.area && isValidArea(data.area) ? data.area : null;
  }
  if (data.attention !== undefined) {
    patch.attention = isValidAttention(data.attention) ? data.attention : null;
  }
  if (data.desire !== undefined) {
    patch.desire = isValidDesire(data.desire) ? data.desire : null;
  }
  if (data.importance !== undefined) {
    patch.importance = isValidScale(data.importance) ? data.importance : null;
  }
  if (data.energy !== undefined) {
    patch.energy = isValidScale(data.energy) ? data.energy : null;
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
    patch.status = isValidStatus(data.status) ? data.status : null;
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
