import { randomUUID } from "node:crypto";
import Redis from "ioredis";
import { AREAS, ATTENTIONS, DESIRES, EASY_WIN_ENERGY, IMPORTANT_IMPORTANCE, KINDS, RECENT_WINDOW_DAYS } from "./constants";
import { isLike } from "./items";
import { normalizeTags, parseTagParam, tokenize } from "./text";
import type {
  Area,
  Attention,
  ChooseParams,
  Counts,
  Desire,
  Item,
  ItemKind,
  ItemPatch,
  ItemStatus,
  ListParams,
  NewItem,
  Scale,
} from "./types";

let client: Redis | null = null;

const K = {
  items: "memory:items",
  attention: (a: Attention | "none") => `memory:attention:${a}`,
  status: (s: ItemStatus) => `memory:status:${s}`,
  area: (a: Area) => `memory:area:${a}`,
  importance: (v: Scale) => `memory:importance:${v}`,
  energy: (v: Scale) => `memory:energy:${v}`,
  tag: (t: string) => `memory:tag:${t}`,
  kind: (k: ItemKind) => `memory:kind:${k}`,
  desire: (d: Desire) => `memory:desire:${d}`,
  fun: "memory:fun",
  due: "memory:due",
  search: (t: string) => `memory:search:${t}`,
  item: (id: string) => `memory:item:${id}`,
};

export function getRedis(): Redis {
  if (client) return client;
  client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
  });
  return client;
}

function nowISO(): string {
  return new Date().toISOString();
}

function toMs(iso: string): number {
  return new Date(iso).getTime();
}

function tokensFor(item: Pick<Item, "name" | "description" | "area" | "tags">): string[] {
  const parts = [item.name, item.description ?? ""];
  if (item.area) parts.push(item.area);
  parts.push(...item.tags);
  return tokenize(parts.join(" "));
}

interface IndexKeys {
  zscores: Record<string, number>;
  sets: string[];
}

function indexKeys(item: Item | null): IndexKeys {
  const zscores: Record<string, number> = {};
  const sets: string[] = [];
  if (!item) return { zscores, sets };

  const created = toMs(item.createdAt);
  zscores[K.items] = created;
  zscores[K.status(item.status)] = created;
  zscores[K.kind(item.kind)] = created;

  if (item.status === "open") {
    zscores[K.attention(item.attention ?? "none")] = created;
    if (item.area) zscores[K.area(item.area)] = created;
    if (item.desire) zscores[K.desire(item.desire)] = created;
    if (item.importance) zscores[K.importance(item.importance)] = created;
    if (item.energy) zscores[K.energy(item.energy)] = created;
    if (item.fun) zscores[K.fun] = created;
  }
  for (const t of item.tags) zscores[K.tag(t)] = created;
  for (const t of tokensFor(item)) sets.push(K.search(t));

  if (item.dueAt) zscores[K.due] = toMs(item.dueAt);
  return { zscores, sets };
}

function hydrate(id: string, fields: Record<string, string> | undefined | null): Item | null {
  if (!fields || !fields.name) return null;
  return {
    id,
    name: fields.name,
    description: fields.description || null,
    kind: (fields.kind as ItemKind) || "note",
    area: (fields.area as Area | null) || null,
    attention: (fields.attention as Attention | null) || null,
    desire: (fields.desire as Desire | null) || null,
    importance: fields.importance ? (Number(fields.importance) as Scale) : null,
    energy: fields.energy ? (Number(fields.energy) as Scale) : null,
    duration: fields.duration ? Number(fields.duration) : null,
    fun: fields.fun === "1",
    availableAt: fields.availableAt || null,
    status: (fields.status as ItemStatus) || "open",
    tags: fields.tags ? (JSON.parse(fields.tags) as string[]) : [],
    dueAt: fields.dueAt || null,
    createdAt: fields.createdAt,
    updatedAt: fields.updatedAt,
  };
}

export async function getItem(id: string): Promise<Item | null> {
  const r = getRedis();
  const fields = await r.hgetall(K.item(id));
  return hydrate(id, fields);
}

function fieldsOf(item: Item): Record<string, string> {
  return {
    name: item.name,
    description: item.description ?? "",
    kind: item.kind,
    area: item.area ?? "",
    attention: item.attention ?? "",
    desire: item.desire ?? "",
    importance: item.importance ? String(item.importance) : "",
    energy: item.energy ? String(item.energy) : "",
    duration: item.duration ? String(item.duration) : "",
    fun: item.fun ? "1" : "0",
    availableAt: item.availableAt ?? "",
    status: item.status,
    tags: JSON.stringify(item.tags),
    dueAt: item.dueAt ?? "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function createItem(data: NewItem): Promise<Item> {
  const r = getRedis();
  const now = nowISO();
  const item: Item = {
    id: randomUUID(),
    name: data.name,
    description: data.description ?? null,
    kind: data.kind ?? "note",
    area: data.area ?? null,
    attention: data.attention ?? null,
    desire: data.desire ?? null,
    importance: data.importance ?? null,
    energy: data.energy ?? null,
    duration: data.duration ?? null,
    fun: data.fun ?? false,
    availableAt: data.availableAt ?? null,
    status: data.status ?? "open",
    tags: normalizeTags(data.tags ?? []),
    dueAt: data.dueAt ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const pipe = r.multi();
  pipe.hset(K.item(item.id), fieldsOf(item));
  for (const [key, score] of Object.entries(indexKeys(item).zscores)) pipe.zadd(key, score, item.id);
  for (const key of indexKeys(item).sets) pipe.sadd(key, item.id);
  await pipe.exec();
  return item;
}

export async function updateItem(id: string, patch: ItemPatch): Promise<Item | null> {
  const r = getRedis();
  const existing = await getItem(id);
  if (!existing) return null;

  const next: Item = {
    ...existing,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
    ...(patch.area !== undefined ? { area: patch.area } : {}),
    ...(patch.attention !== undefined ? { attention: patch.attention } : {}),
    ...(patch.desire !== undefined ? { desire: patch.desire } : {}),
    ...(patch.importance !== undefined ? { importance: patch.importance } : {}),
    ...(patch.energy !== undefined ? { energy: patch.energy } : {}),
    ...(patch.duration !== undefined ? { duration: patch.duration } : {}),
    ...(patch.fun !== undefined ? { fun: patch.fun } : {}),
    ...(patch.availableAt !== undefined ? { availableAt: patch.availableAt } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.dueAt !== undefined ? { dueAt: patch.dueAt } : {}),
    ...(patch.tags !== undefined ? { tags: normalizeTags(patch.tags) } : {}),
    updatedAt: nowISO(),
  };

  const pipe = r.multi();
  pipe.hset(K.item(id), fieldsOf(next));
  const oldKeys = indexKeys(existing);
  const newKeys = indexKeys(next);
  for (const [key, score] of Object.entries(newKeys.zscores)) pipe.zadd(key, score, id);
  for (const key of Object.keys(oldKeys.zscores)) {
    if (!(key in newKeys.zscores)) pipe.zrem(key, id);
  }
  for (const key of newKeys.sets) pipe.sadd(key, id);
  for (const key of oldKeys.sets) {
    if (!newKeys.sets.includes(key)) pipe.srem(key, id);
  }
  await pipe.exec();
  return next;
}

export async function deleteItem(id: string): Promise<boolean> {
  const r = getRedis();
  const existing = await getItem(id);
  if (!existing) return false;
  const pipe = r.multi();
  pipe.del(K.item(id));
  for (const [key] of Object.entries(indexKeys(existing).zscores)) pipe.zrem(key, id);
  for (const key of indexKeys(existing).sets) pipe.srem(key, id);
  await pipe.exec();
  return true;
}

interface ResolvedFilters {
  ids: string[] | null;
  checks: string[];
  isRecent: boolean;
}

function viewKey(view?: ListParams["view"]): string | null {
  switch (view) {
    case "today":
      return K.attention("now");
    case "inbox":
      return K.attention("none");
    case "soon":
      return K.attention("soon");
    case "later":
      return K.attention("later");
    case "important":
      return K.importance(IMPORTANT_IMPORTANCE);
    case "easy":
      return K.energy(EASY_WIN_ENERGY);
    case "fun":
      return K.fun;
    default:
      return null;
  }
}

async function resolveFilters(params: ListParams): Promise<ResolvedFilters> {
  const checks: string[] = [];
  const push = (key: string | null | undefined) => {
    if (key) checks.push(key);
  };

  const q = params.q?.trim();
  const tag = parseTagParam(params.tag);
  const statusKey = params.status && params.status !== "all" ? K.status(params.status) : null;

  let primary: string | null = null;

  if (q) {
    const keys = tokenize(q).map((t) => K.search(t));
    const r = getRedis();
    const ids = keys.length > 0 ? await r.sinter(...keys) : [];
    if (keys.length > 0) push(viewKey(params.view));
    if (params.attention) push(params.attention === "inbox" ? K.attention("none") : K.attention(params.attention));
    if (params.area) push(K.area(params.area));
    if (params.desire) push(K.desire(params.desire));
    push(statusKey);
    if (params.importance) push(K.importance(params.importance));
    if (params.energy) push(K.energy(params.energy));
    if (params.fun) push(K.fun);
    if (tag) push(K.tag(tag));
    return { ids, checks, isRecent: false };
  }

  if (tag) {
    primary = K.tag(tag);
    push(viewKey(params.view));
    if (params.attention) push(params.attention === "inbox" ? K.attention("none") : K.attention(params.attention));
    if (params.area) push(K.area(params.area));
    if (params.desire) push(K.desire(params.desire));
    push(statusKey);
    if (params.importance) push(K.importance(params.importance));
    if (params.energy) push(K.energy(params.energy));
    if (params.fun) push(K.fun);
  } else if (params.attention) {
    primary = params.attention === "inbox" ? K.attention("none") : K.attention(params.attention);
    if (params.area) push(K.area(params.area));
    if (params.desire) push(K.desire(params.desire));
    push(statusKey);
    if (params.importance) push(K.importance(params.importance));
    if (params.energy) push(K.energy(params.energy));
    if (params.fun) push(K.fun);
  } else if (params.area) {
    primary = K.area(params.area);
    if (params.desire) push(K.desire(params.desire));
    push(statusKey);
    if (params.importance) push(K.importance(params.importance));
    if (params.energy) push(K.energy(params.energy));
    if (params.fun) push(K.fun);
  } else if (params.desire) {
    primary = K.desire(params.desire);
    push(statusKey);
    if (params.importance) push(K.importance(params.importance));
    if (params.energy) push(K.energy(params.energy));
    if (params.fun) push(K.fun);
  } else if (params.importance) {
    primary = K.importance(params.importance);
    push(statusKey);
    if (params.energy) push(K.energy(params.energy));
    if (params.fun) push(K.fun);
  } else if (params.energy) {
    primary = K.energy(params.energy);
    push(statusKey);
    if (params.fun) push(K.fun);
  } else if (params.fun) {
    primary = K.fun;
    push(statusKey);
  } else {
    const vk = viewKey(params.view);
    if (params.view === "recent") {
      primary = null;
      const r = getRedis();
      const since = Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      const ids = await r.zrevrangebyscore(K.items, "+inf", since);
      return { ids, checks: [], isRecent: true };
    }
    if (params.status === "all") {
      const r = getRedis();
      const [open, done] = await Promise.all([
        r.zrevrange(K.status("open"), 0, -1),
        r.zrevrange(K.status("done"), 0, -1),
      ]);
      const seen = new Set<string>();
      const ids: string[] = [];
      for (const id of [...open, ...done]) {
        if (!seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
      return { ids, checks, isRecent: false };
    }
    primary = vk ?? K.status(params.status ?? "open");
  }

  if (primary) {
    const r = getRedis();
    const ids = await r.zrevrange(primary, 0, -1);
    return { ids, checks, isRecent: false };
  }
  return { ids: [], checks, isRecent: false };
}

export async function listItems(params: ListParams = {}): Promise<Item[]> {
  const r = getRedis();
  const { ids: candidates, checks, isRecent } = await resolveFilters(params);

  let ids = candidates ?? [];
  if (checks.length > 0) {
    const pipe = r.pipeline();
    for (const id of ids) {
      for (const key of checks) {
        pipe.zscore(key, id);
      }
    }
    const results = (await pipe.exec()) ?? [];
    const ok: boolean[] = new Array(ids.length).fill(true);
    let idx = 0;
    for (let i = 0; i < ids.length; i++) {
      for (let j = 0; j < checks.length; j++) {
        const res = results[idx];
        const score = Array.isArray(res) ? res[1] : null;
        if (!score) ok[i] = false;
        idx++;
      }
    }
    ids = ids.filter((_, i) => ok[i]);
  }

  const items: Item[] = [];
  if (ids.length > 0) {
    const pipe = r.pipeline();
    for (const id of ids) pipe.hgetall(K.item(id));
    const results = (await pipe.exec()) ?? [];
    for (let i = 0; i < ids.length; i++) {
      const res = results[i];
      const fields = Array.isArray(res) ? (res[1] as Record<string, string>) : null;
      const item = hydrate(ids[i], fields);
      if (item) items.push(item);
    }
  }

  const filtered = isRecent
    ? items.filter((i) => i.status !== "archived")
    : items.filter((i) => {
        if (params.status && params.status !== "all") {
          if (i.status !== params.status) return false;
        } else if (i.status === "archived") {
          return false;
        }
        if (params.kind && i.kind !== params.kind) return false;
        if (params.fun && !i.fun) return false;
        if (params.attention && i.attention !== params.attention) return false;
        return true;
      });

  const sorted = [...filtered];
  switch (params.sort) {
    case "due":
      sorted.sort((a, b) => {
        if (!a.dueAt && !b.dueAt) return toMs(b.createdAt) - toMs(a.createdAt);
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        return toMs(a.dueAt) - toMs(b.dueAt);
      });
      break;
    case "updated":
      sorted.sort((a, b) => toMs(b.updatedAt) - toMs(a.updatedAt));
      break;
    default:
      sorted.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  }

  const start = params.offset ?? 0;
  const end = typeof params.limit === "number" ? start + params.limit : undefined;
  return end === undefined ? sorted.slice(start) : sorted.slice(start, end);
}

export async function chooseItems(params: ChooseParams = {}): Promise<Item[]> {
  const r = getRedis();
  const open = await r.zrevrange(K.status("open"), 0, -1);

  const items: Item[] = [];
  if (open.length > 0) {
    const pipe = r.pipeline();
    for (const id of open) pipe.hgetall(K.item(id));
    const results = (await pipe.exec()) ?? [];
    for (let i = 0; i < open.length; i++) {
      const res = results[i];
      const fields = Array.isArray(res) ? (res[1] as Record<string, string>) : null;
      const item = hydrate(open[i], fields);
      if (item) items.push(item);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const plus2 = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const mood = params.mood ?? "anything";

  const candidates = items.filter((i) => {
    if (i.status !== "open") return false;
    if (i.availableAt && i.availableAt > today) return false;
    if (params.energy && i.energy && i.energy !== params.energy) return false;
    if (params.time && i.duration && i.duration > params.time) return false;
    if (params.desire === "need" && isLike(i)) return false;
    if (params.desire === "like" && !isLike(i)) return false;
    switch (mood) {
      case "productive":
        if (
          !(
            i.importance === IMPORTANT_IMPORTANCE ||
            i.attention === "now" ||
            (i.dueAt && i.dueAt <= plus2)
          )
        )
          return false;
        break;
      case "easy":
        if (!(i.energy === 1 || (i.duration && i.duration <= 15))) return false;
        break;
      case "fun":
        if (!(i.fun || i.attention === "whenever" || i.desire === "like")) return false;
        break;
      case "creative":
        if (!(i.kind === "idea" || i.area === "ideas" || (i.desire === "like" && i.area === "personal")))
          return false;
        break;
      case "errands":
        if (!(i.area === "finance" || i.area === "health" || i.area === "home")) return false;
        break;
    }
    return true;
  });

  const score = (item: Item): number => {
    let s = 0;
    if (params.time) {
      if (item.duration && item.duration <= params.time) s += 3;
      if (item.duration && item.duration <= params.time / 2) s += 1;
      if (params.time <= 30 && item.energy === 1) s += 1;
    }
    if (item.importance === IMPORTANT_IMPORTANCE) s += 2;
    if (item.attention === "now") s += 1;
    if (item.dueAt) {
      if (item.dueAt < today) s += 2;
      else if (item.dueAt <= plus2) s += 1;
    }
    return s;
  };

  const sorted = candidates
    .map((item) => ({ item, s: score(item) }))
    .sort((a, b) => b.s - a.s || toMs(b.item.createdAt) - toMs(a.item.createdAt));

  const needList = sorted.filter(({ item }) => !isLike(item));
  const likeList = sorted.filter(({ item }) => isLike(item));

  const merged: Item[] = [];
  const max = Math.max(needList.length, likeList.length);
  for (let i = 0; i < max && merged.length < 5; i++) {
    if (needList[i] && merged.length < 5) merged.push(needList[i].item);
    if (likeList[i] && merged.length < 5) merged.push(likeList[i].item);
  }
  return merged;
}

export async function getCounts(): Promise<Counts> {
  const r = getRedis();
  const pipe = r.pipeline();
  for (const a of ATTENTIONS) pipe.zcard(K.attention(a));
  pipe.zcard(K.attention("none"));
  pipe.zcard(K.status("open"));
  pipe.zcard(K.status("done"));
  pipe.zcard(K.fun);
  for (const k of KINDS) pipe.zcard(K.kind(k));
  for (const a of AREAS) pipe.zcard(K.area(a));
  for (const d of DESIRES) pipe.zcard(K.desire(d));

  const results = (await pipe.exec()) ?? [];
  let i = 0;
  const val = (idx: number): number => {
    const res = results[idx];
    return Number(Array.isArray(res) ? res[1] : 0);
  };
  const counts: Counts = {
    attentions: { now: 0, soon: 0, later: 0, whenever: 0 },
    inbox: 0,
    open: 0,
    done: 0,
    fun: 0,
    kinds: { note: 0, todo: 0, idea: 0 },
    areas: { home: 0, work: 0, personal: 0, finance: 0, health: 0, ideas: 0, other: 0 },
    desire: { need: 0, like: 0 },
  };
  for (const a of ATTENTIONS) counts.attentions[a] = val(i++);
  counts.inbox = val(i++);
  counts.open = val(i++);
  counts.done = val(i++);
  counts.fun = val(i++);
  for (const k of KINDS) counts.kinds[k] = val(i++);
  for (const a of AREAS) counts.areas[a] = val(i++);
  for (const d of DESIRES) counts.desire[d] = val(i++);
  return counts;
}

export async function wipeAll(): Promise<number> {
  const r = getRedis();
  const ids: string[] = [];
  let cursor = "0";
  do {
    const [next, keys] = await r.scan(cursor, "MATCH", "memory:item:*", "COUNT", 200);
    cursor = next;
    for (const key of keys) {
      const id = key.replace("memory:item:", "");
      ids.push(id);
    }
  } while (cursor !== "0");

  if (ids.length === 0) return 0;

  const pipe = r.multi();
  for (const id of ids) {
    const existing = await getItem(id);
    if (existing) {
      pipe.del(K.item(id));
      for (const [key] of Object.entries(indexKeys(existing).zscores)) pipe.zrem(key, id);
      for (const key of indexKeys(existing).sets) pipe.srem(key, id);
    }
  }
  await pipe.exec();
  return ids.length;
}
