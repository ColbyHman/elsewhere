import type { ChooseParams, Counts, Item, ItemPatch, ListParams, NewItem } from "./types";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function qs(params: object): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15_000);
  let res: Response;
  try {
    res = await fetch(path, { ...init, signal: controller.signal });
  } catch {
    throw new ApiError("You're offline", 0);
  } finally {
    clearTimeout(id);
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) {
    throw new ApiError(body?.error ?? "Request failed", res.status);
  }
  return body as T;
}

export async function listItems(params: ListParams): Promise<Item[]> {
  const query: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query[key] = value as string | number;
  }
  const data = await request<{ items: Item[] }>(`/api/items${qs(query)}`);
  return data.items;
}

export async function getCounts(): Promise<Counts> {
  const data = await request<{ counts: Counts }>("/api/items/counts");
  return data.counts;
}

export async function chooseItems(params: ChooseParams): Promise<Item[]> {
  const data = await request<{ items: Item[] }>(`/api/items/choose${qs(params)}`);
  return data.items;
}

export async function createItem(data: NewItem): Promise<Item> {
  const res = await request<{ item: Item }>("/api/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.item;
}

export async function updateItem(id: string, patch: ItemPatch): Promise<Item> {
  const res = await request<{ item: Item }>(`/api/items/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return res.item;
}

export async function deleteItem(id: string): Promise<void> {
  await request<void>(`/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function wipeAll(): Promise<number> {
  const data = await request<{ deleted: number }>("/api/items", { method: "DELETE" });
  return data.deleted;
}
