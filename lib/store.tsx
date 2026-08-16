"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as api from "./api";
import { DEFAULT_FILTER, EASY_WIN_ENERGY, IMPORTANT_IMPORTANCE } from "./constants";
import type { Counts, Filter, Item, ItemPatch, ListParams, NewItem } from "./types";

type QueuedOp =
  | { kind: "create"; localId: string; data: NewItem }
  | { kind: "update"; id: string; patch: ItemPatch }
  | { kind: "delete"; id: string };

const QUEUE_KEY = "memory:queue:v1";

function newLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function filterParams(q: string, filter: Filter): ListParams {
  const trimmed = q.trim();
  return {
    status: filter.status,
    kind: filter.kind ?? undefined,
    attention: filter.attention ?? undefined,
    area: filter.area ?? undefined,
    desire: filter.desire ?? undefined,
    importance: filter.important ? IMPORTANT_IMPORTANCE : undefined,
    energy: filter.easy ? EASY_WIN_ENERGY : undefined,
    fun: filter.fun ? true : undefined,
    view: filter.recent ? "recent" : undefined,
    q: trimmed || undefined,
  };
}

function mergeItems(server: Item[], localCreates: Item[], dirty: Map<string, Item>): Item[] {
  const byId = new Map<string, Item>();
  for (const item of server) byId.set(item.id, item);
  for (const item of dirty.values()) byId.set(item.id, item);
  const list = [...byId.values(), ...localCreates];
  return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

function readQueue(): QueuedOp[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedOp[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedOp[]) {
  try {
    if (queue.length === 0) localStorage.removeItem(QUEUE_KEY);
    else localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage unavailable — keep the queue in memory only.
  }
}

interface MemoryValue {
  items: Item[];
  counts: Counts | null;
  status: "loading" | "ready" | "error";
  error: string | null;
  offline: boolean;
  q: string;
  setQ: (q: string) => void;
  filter: Filter;
  setFilter: (filter: Filter) => void;
  browse: boolean;
  setBrowse: (browse: boolean) => void;
  create: (data: NewItem) => Item;
  update: (id: string, patch: ItemPatch) => void;
  toggleDone: (id: string) => void;
  remove: (id: string) => void;
  wipeAll: () => Promise<void>;
  refresh: () => void;
}

const MemoryContext = createContext<MemoryValue | null>(null);

export function MemoryProvider({ children }: { children: ReactNode }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>(DEFAULT_FILTER);
  const [browse, setBrowse] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const queueRef = useRef<QueuedOp[]>([]);
  const dirtyRef = useRef<Map<string, Item>>(new Map());
  const localCreatesRef = useRef<Map<string, Item>>(new Map());
  const qRef = useRef(q);
  const filterRef = useRef(filter);

  useEffect(() => {
    qRef.current = q;
  }, [q]);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  const loadCounts = useCallback(async () => {
    try {
      const next = await api.getCounts();
      setCounts(next);
      return true;
    } catch {
      return false;
    }
  }, []);

  const loadItems = useCallback(async (searchQ: string, f: Filter) => {
    try {
      const server = await api.listItems(filterParams(searchQ, f));
      const localCreates = [...localCreatesRef.current.values()];
      const result = mergeItems(server, localCreates, dirtyRef.current);
      setItems(result);
      setStatus("ready");
      setError(null);
    } catch {
      setStatus("error");
      setError("Couldn't reach your memory. Check the connection.");
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      setStatus("loading");
      void loadItems(q, filter);
    }, q.trim() ? 250 : 0);
    return () => clearTimeout(id);
  }, [q, filter, loadItems]);

  useEffect(() => {
    const id = setTimeout(() => void loadCounts(), 0);
    return () => clearTimeout(id);
  }, [loadCounts]);

  const flush = useCallback(async () => {
    const queue = queueRef.current;
    if (queue.length === 0) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOffline(true);
      return;
    }
    const next: QueuedOp[] = [];
    let failed = false;
    for (const op of queue) {
      try {
        if (op.kind === "create") {
          const created = await api.createItem(op.data);
          localCreatesRef.current.delete(op.localId);
          const dirty = new Map(dirtyRef.current);
          dirty.set(created.id, created);
          dirtyRef.current = dirty;
        } else if (op.kind === "update") {
          const updated = await api.updateItem(op.id, op.patch);
          if (updated) {
            const dirty = new Map(dirtyRef.current);
            dirty.set(updated.id, updated);
            dirtyRef.current = dirty;
          }
        } else {
          await api.deleteItem(op.id);
        }
      } catch {
        failed = true;
        next.push(op);
        break;
      }
    }
    queueRef.current = next;
    writeQueue(next);
    if (failed) {
      setOffline(true);
      return;
    }
    setOffline(false);
    dirtyRef.current = new Map();
    void loadCounts();
    void loadItems(qRef.current, filterRef.current);
  }, [loadCounts, loadItems]);

  useEffect(() => {
    const onOnline = () => {
      setOffline(false);
      void flush();
      void loadItems(qRef.current, filterRef.current);
      void loadCounts();
    };
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [flush, loadItems, loadCounts]);

  useEffect(() => {
    queueRef.current = readQueue();
    const id = setTimeout(() => {
      if (typeof navigator !== "undefined" && navigator.onLine && queueRef.current.length > 0) {
        void flush();
      }
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enqueue = useCallback(
    (op: QueuedOp) => {
      queueRef.current = [...queueRef.current, op];
      writeQueue(queueRef.current);
      void flush();
    },
    [flush],
  );

  const create = useCallback(
    (data: NewItem): Item => {
      const now = new Date().toISOString();
      const localId = newLocalId();
      const local: Item = {
        id: localId,
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
        status: "open",
        tags: data.tags ?? [],
        dueAt: data.dueAt ?? null,
        createdAt: now,
        updatedAt: now,
      };
      localCreatesRef.current = new Map(localCreatesRef.current).set(localId, local);
      setItems((prev) => [local, ...prev]);
      enqueue({ kind: "create", localId, data });
      return local;
    },
    [enqueue],
  );

  const update = useCallback(
    (id: string, patch: ItemPatch) => {
      const existing = items.find((i) => i.id === id) ?? localCreatesRef.current.get(id);
      if (!existing) return;
      const merged: Item = {
        ...existing,
        ...patch,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      setItems((prev) => prev.map((item) => (item.id === id ? merged : item)));
      dirtyRef.current = new Map(dirtyRef.current).set(id, merged);
      enqueue({ kind: "update", id, patch });
    },
    [items, enqueue],
  );

  const toggleDone = useCallback(
    (id: string) => {
      const target = items.find((i) => i.id === id);
      if (!target) return;
      const patch: ItemPatch = { status: target.status === "done" ? "open" : "done" };
      update(id, patch);
    },
    [items, update],
  );

  const remove = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((i) => i.id !== id));
      dirtyRef.current = new Map(dirtyRef.current);
      dirtyRef.current.delete(id);
      localCreatesRef.current = new Map(localCreatesRef.current);
      localCreatesRef.current.delete(id);
      enqueue({ kind: "delete", id });
    },
    [enqueue],
  );

  const wipeAll = useCallback(async () => {
    setItems([]);
    setCounts(null);
    dirtyRef.current = new Map();
    localCreatesRef.current = new Map();
    queueRef.current = [];
    writeQueue([]);
    try {
      await api.wipeAll();
    } catch {
      // already cleared locally
    }
    void loadCounts();
  }, [loadCounts]);

  const refresh = useCallback(() => {
    void loadItems(qRef.current, filterRef.current);
    void loadCounts();
  }, [loadItems, loadCounts]);

  const value = useMemo<MemoryValue>(
    () => ({
      items,
      counts,
      status,
      error,
      offline,
      q,
      setQ,
      filter,
      setFilter,
      browse,
      setBrowse,
      create,
      update,
      toggleDone,
      remove,
      wipeAll,
      refresh,
    }),
    [items, counts, status, error, offline, q, setQ, filter, setFilter, browse, setBrowse, create, update, toggleDone, remove, wipeAll, refresh],
  );

  return <MemoryContext.Provider value={value}>{children}</MemoryContext.Provider>;
}

export function useMemory(): MemoryValue {
  const ctx = useContext(MemoryContext);
  if (!ctx) throw new Error("useMemory must be used within <MemoryProvider>");
  return ctx;
}
