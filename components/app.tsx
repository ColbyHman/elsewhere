"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AREA_LABEL, ATTENTION_LABEL, DEFAULT_FILTER, DESIRE_LABEL, KIND_LABEL, STATUS_LABEL } from "@/lib/constants";
import { upcomingLabel } from "@/lib/dates";
import { isLike } from "@/lib/items";
import { useMemory } from "@/lib/store";
import type { ChooseParams, Desire, Filter, Item, ItemKind } from "@/lib/types";
import { PlusIcon, SearchIcon, SettingsIcon, SlidersIcon, XIcon } from "./icons";
import { ChooseModal } from "./choose";
import { Dashboard } from "./dashboard";
import { FilterPanel } from "./filter-panel";
import { ItemCard } from "./item-card";
import { ItemEditor } from "./item-editor";
import { Modal } from "./modal";
import { EmptyState, ErrorState, LoadingState } from "./states";
import { ThemeToggle } from "./theme";

interface EditorPreset {
  kind?: ItemKind;
  desire?: Desire;
}

interface EditorState {
  item: Item | null;
  initialName?: string;
  preset?: EditorPreset;
}

const QUICK_ADDS: Array<{ label: string; preset: EditorPreset }> = [
  { label: "To do", preset: { kind: "todo", desire: "need" } },
  { label: "Would like to do", preset: { kind: "todo", desire: "like" } },
  { label: "Idea", preset: { kind: "idea" } },
];

const BROWSE_CHIPS: Array<{ key: string; label: string; filter: Filter }> = [
  { key: "all", label: "All", filter: DEFAULT_FILTER },
  { key: "need", label: "Need to do", filter: { ...DEFAULT_FILTER, desire: "need" } },
  { key: "like", label: "Would like to do", filter: { ...DEFAULT_FILTER, desire: "like" } },
  { key: "recent", label: "Recently added", filter: { ...DEFAULT_FILTER, recent: true } },
  { key: "important", label: "Important", filter: { ...DEFAULT_FILTER, important: true } },
  { key: "ideas", label: "Ideas", filter: { ...DEFAULT_FILTER, kind: "idea" } },
  { key: "whenever", label: "Whenever", filter: { ...DEFAULT_FILTER, status: "open", attention: "whenever" } },
  { key: "quick", label: "Quick wins", filter: { ...DEFAULT_FILTER, easy: true } },
  { key: "fun", label: "Fun", filter: { ...DEFAULT_FILTER, fun: true } },
];

function filtersEqual(a: Filter, b: Filter): boolean {
  return (
    a.status === b.status &&
    a.kind === b.kind &&
    a.attention === b.attention &&
    a.area === b.area &&
    a.desire === b.desire &&
    a.important === b.important &&
    a.easy === b.easy &&
    a.fun === b.fun &&
    a.recent === b.recent
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

function greetingForHour(hour: number): string {
  if (hour < 5) return "Still up.";
  if (hour < 12) return "Good morning.";
  if (hour < 17) return "Good afternoon.";
  return "Good evening.";
}

export function App() {
  const { items, q, setQ, filter, setFilter, browse, setBrowse, toggleDone, wipeAll, refresh, status, error, offline } = useMemory();
  const [name, setName] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chooseOpen, setChooseOpen] = useState(false);
  const [choosePreset, setChoosePreset] = useState<ChooseParams | null>(null);
  const [wipeConfirm, setWipeConfirm] = useState(false);
  const captureRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const openCapture = useCallback((initialName?: string) => {
    setEditor({ item: null, initialName });
  }, []);

  const openQuickAdd = useCallback(
    (preset: EditorPreset) => {
      setEditor({ item: null, initialName: name.trim() || undefined, preset });
      setName("");
    },
    [name],
  );

  const openItem = useCallback((item: Item) => {
    setEditor({ item, initialName: undefined });
  }, []);

  const backToDashboard = useCallback(() => {
    setBrowse(false);
    setFilter(DEFAULT_FILTER);
    setQ("");
    setFilterOpen(false);
  }, [setBrowse, setFilter, setQ]);

  const browseTo = useCallback(
    (f: Filter) => {
      setFilter(f);
      setBrowse(true);
    },
    [setFilter, setBrowse],
  );

  const openPrompt = useCallback((params: ChooseParams) => {
    setChoosePreset(params);
    setChooseOpen(true);
  }, []);

  const facets = useMemo<Array<{ label: string; clear: () => void }>>(() => {
    const out: Array<{ label: string; clear: () => void }> = [];
    if (filter.status !== "all") {
      out.push({ label: STATUS_LABEL[filter.status], clear: () => setFilter({ ...filter, status: "all" }) });
    }
    if (filter.kind) {
      out.push({ label: KIND_LABEL[filter.kind], clear: () => setFilter({ ...filter, kind: null }) });
    }
    if (filter.attention) {
      const label = filter.attention === "inbox" ? "Inbox" : ATTENTION_LABEL[filter.attention];
      out.push({ label, clear: () => setFilter({ ...filter, attention: null }) });
    }
    if (filter.area) {
      out.push({ label: AREA_LABEL[filter.area], clear: () => setFilter({ ...filter, area: null }) });
    }
    if (filter.desire) {
      out.push({ label: DESIRE_LABEL[filter.desire], clear: () => setFilter({ ...filter, desire: null }) });
    }
    if (filter.important) {
      out.push({ label: "Important", clear: () => setFilter({ ...filter, important: false }) });
    }
    if (filter.easy) {
      out.push({ label: "Quick wins", clear: () => setFilter({ ...filter, easy: false }) });
    }
    if (filter.fun) {
      out.push({ label: "Fun", clear: () => setFilter({ ...filter, fun: false }) });
    }
    return out;
  }, [filter, setFilter]);

  function handleCapture(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    openCapture(trimmed);
    setName("");
  }

  const isDashboard = !browse && q.trim() === "" && filtersEqual(filter, DEFAULT_FILTER);

  const dashboard = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const plus7 = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const plus14 = new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 10);
    const open = items.filter((i) => i.status === "open");

    const needCol = open
      .filter((i) => !isLike(i))
      .sort((a, b) => {
        const aUrgent = a.attention === "now" || (a.dueAt && a.dueAt <= today) ? 0 : 1;
        const bUrgent = b.attention === "now" || (b.dueAt && b.dueAt <= today) ? 0 : 1;
        if (aUrgent !== bUrgent) return aUrgent - bUrgent;
        if (a.dueAt && b.dueAt) return a.dueAt < b.dueAt ? -1 : a.dueAt > b.dueAt ? 1 : 0;
        if (a.dueAt) return -1;
        if (b.dueAt) return 1;
        if (a.importance && b.importance) return b.importance - a.importance;
        if (a.importance) return -1;
        if (b.importance) return 1;
        return a.createdAt > b.createdAt ? -1 : 1;
      })
      .slice(0, 6);

    const likeCol = open
      .filter(isLike)
      .sort((a, b) => {
        if (a.importance && b.importance) return b.importance - a.importance;
        if (a.importance) return -1;
        if (b.importance) return 1;
        return a.createdAt > b.createdAt ? -1 : 1;
      })
      .slice(0, 6);

    const needIds = new Set(needCol.map((i) => i.id));
    const likeIds = new Set(likeCol.map((i) => i.id));

    const recentlyCaptured = open
      .filter((i) => !needIds.has(i.id) && !likeIds.has(i.id))
      .slice(0, 5);

    const overdue = open.filter((i) => i.dueAt && i.dueAt < today).length;
    const dueThisWeek = open.filter((i) => i.dueAt && i.dueAt > today && i.dueAt <= plus7).length;
    const needSummary = overdue > 0 ? `${overdue} overdue · ${dueThisWeek} due this week` : `${dueThisWeek} due this week`;

    const likeTotal = open.filter(isLike).length;
    const likeIdeas = open.filter((i) => isLike(i) && i.kind === "idea").length;
    const likeSummary = likeIdeas > 0 ? `${likeTotal} things to enjoy · ${likeIdeas} ideas` : `${likeTotal} things to enjoy`;

    const groups: Array<{ label: string; items: Item[] }> = [];
    const comingUpDated = open
      .filter((i) => i.dueAt && i.dueAt > today && i.dueAt <= plus14)
      .sort((a, b) => (a.dueAt! < b.dueAt! ? -1 : 1));
    const byDate = new Map<string, Item[]>();
    for (const item of comingUpDated) {
      const list = byDate.get(item.dueAt!) ?? [];
      list.push(item);
      byDate.set(item.dueAt!, list);
    }
    for (const [date, list] of byDate) groups.push({ label: upcomingLabel(date), items: list });

    const undatedLike = open.filter((i) => !i.dueAt && isLike(i) && !needIds.has(i.id) && !likeIds.has(i.id)).slice(0, 6);
    if (undatedLike.length > 0) {
      groups.push({ label: "This weekend", items: undatedLike.slice(0, 3) });
      if (undatedLike.length > 3) groups.push({ label: "Next week", items: undatedLike.slice(3) });
    }

    const undatedSoon = open.filter((i) => !i.dueAt && !isLike(i) && i.attention === "soon" && !needIds.has(i.id)).slice(0, 4);
    if (undatedSoon.length > 0) groups.push({ label: "Soon", items: undatedSoon });

    return { needCol, likeCol, recentlyCaptured, needSummary, likeSummary, comingUpGroups: groups };
  }, [items]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        if (editor || chooseOpen) return;
        if (filterOpen) {
          e.preventDefault();
          setFilterOpen(false);
          return;
        }
        if (q) {
          e.preventDefault();
          setQ("");
          return;
        }
        if (browse) {
          e.preventDefault();
          backToDashboard();
        }
        return;
      }
      if (isEditableTarget(e.target)) return;
      if (e.key === "n") {
        e.preventDefault();
        captureRef.current?.focus();
      } else if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor, chooseOpen, filterOpen, q, browse, setQ, backToDashboard]);

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 text-stone-900 transition-colors dark:bg-stone-950 dark:text-stone-100">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-stone-50/95 backdrop-blur dark:border-stone-800/80 dark:bg-stone-950/95">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            <svg viewBox="0 0 64 64" className="h-6 w-6 shrink-0" aria-hidden="true">
              <path d="M8 4h28c2.2 0 3.8.8 4.6 2L58 30.6c.8.8.8 2.2 0 3L41 50.6c-.8.8-2.4 1.4-4.6 1.4H12c-2.2 0-4-1.8-4-4V8c0-2.2 1.8-4 4-4z" fill="currentColor"/>
              <path d="M36 4h8c2.2 0 3.8.8 4.6 2L58 20.6c.8.8.8 2.2 0 3L36 4z" fill="currentColor" fillOpacity="0.4"/>
            </svg>
            <span>Elsewhere</span>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            title="Settings"
            className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <SettingsIcon className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 sm:px-6">
        <div className="space-y-4 pt-5">
          {offline ? (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300">
              <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
              Offline — changes are queued and will sync when you reconnect.
            </div>
          ) : null}

          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-stone-400" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the memory…"
              aria-label="Search the memory…"
              className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-10 pr-10 text-[15px] text-stone-900 shadow-sm transition-colors placeholder:text-stone-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500"
            />
            {q ? (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-stone-400 transition-colors hover:text-stone-900 dark:hover:text-stone-100"
              >
                <XIcon className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <form onSubmit={handleCapture} className="flex items-center gap-2">
            <input
              ref={captureRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What's on your mind?"
              aria-label="What's on your mind?"
              maxLength={300}
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-stone-900 shadow-sm transition-colors placeholder:text-stone-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500"
            />
            <button
              type="button"
              onClick={() => {
                openCapture(name.trim() || undefined);
                setName("");
              }}
              aria-label="Capture with details"
              title="Add details"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </form>

          <div
            role="group"
            aria-label="Quick add"
            className="flex flex-wrap items-center gap-1.5"
          >
            {QUICK_ADDS.map((qa) => (
              <button
                key={qa.label}
                type="button"
                onClick={() => openQuickAdd(qa.preset)}
                className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:border-rose-400 hover:text-rose-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:border-rose-500/50 dark:hover:text-rose-400"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                {qa.label}
              </button>
            ))}
          </div>

          {status === "loading" ? (
            <LoadingState />
          ) : status === "error" ? (
            <ErrorState message={error ?? undefined} onRetry={refresh} />
          ) : isDashboard ? (
            items.length === 0 ? (
              <EmptyState
                title="Nothing here yet"
                message="Capture a first memory above — anything you don't want to have to remember."
                onCapture={() => captureRef.current?.focus()}
                captureLabel="Capture something"
              />
            ) : (
              <Dashboard
                greeting={greetingForHour(new Date().getHours())}
                needCol={dashboard.needCol}
                likeCol={dashboard.likeCol}
                recentlyCaptured={dashboard.recentlyCaptured}
                needSummary={dashboard.needSummary}
                likeSummary={dashboard.likeSummary}
                comingUpGroups={dashboard.comingUpGroups}
                onOpen={openItem}
                onPrompt={openPrompt}
                onBrowse={browseTo}
              />
            )
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={backToDashboard}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-400 transition-colors hover:text-stone-900 dark:text-stone-500 dark:hover:text-stone-100"
              >
                <XIcon className="h-3.5 w-3.5" />
                Back to dashboard
              </button>

              <div
                role="group"
                aria-label="Browse"
                className="flex flex-wrap items-center gap-1.5"
              >
                {BROWSE_CHIPS.map((chip) => {
                  const active = filtersEqual(filter, chip.filter);
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilter(chip.filter)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? "border border-rose-700 text-rose-700 dark:border-rose-500 dark:text-rose-400"
                          : "border border-stone-200 text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-400 dark:hover:bg-stone-800"
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setFilterOpen((o) => !o)}
                  aria-expanded={filterOpen}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    facets.length > 0
                      ? "border border-rose-700 text-rose-700 hover:bg-rose-50 dark:border-rose-500 dark:text-rose-400 dark:hover:bg-rose-950/30"
                      : "border border-stone-200 text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-400 dark:hover:bg-stone-800"
                  }`}
                >
                  <SlidersIcon className="h-4 w-4" />
                  Filter
                </button>
                {facets.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setFilter(DEFAULT_FILTER)}
                    className="text-sm font-medium text-rose-700 hover:underline dark:text-rose-400"
                  >
                    Clear
                  </button>
                ) : null}
              </div>

              {filterOpen ? (
                <FilterPanel />
              ) : facets.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {facets.map((facet) => (
                    <button
                      key={facet.label}
                      type="button"
                      onClick={facet.clear}
                      className="inline-flex items-center gap-1 rounded-full bg-stone-200/70 px-2.5 py-1 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                    >
                      {facet.label}
                      <XIcon className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              ) : null}

              {q.trim() ? (
                <p className="text-xs font-medium text-stone-400 dark:text-stone-500">
                  {items.length} {items.length === 1 ? "result" : "results"}
                </p>
              ) : null}

              <section aria-label="Memories">
                {items.length === 0 ? (
                  q.trim() ? (
                    <EmptyState
                      title="No matches"
                      message={`Nothing matches "${q.trim()}". Try a different word or tag.`}
                      onCapture={() => setQ("")}
                      captureLabel="Clear search"
                    />
                  ) : facets.length > 0 ? (
                    <EmptyState
                      title="Nothing here"
                      message="Nothing matches this filter yet."
                      onCapture={() => setFilter(DEFAULT_FILTER)}
                      captureLabel="Clear filters"
                    />
                  ) : (
                    <EmptyState
                      title="Nothing here yet"
                      message="Capture a first memory above — anything you don't want to have to remember."
                      onCapture={() => captureRef.current?.focus()}
                      captureLabel="Capture something"
                    />
                  )
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <ItemCard key={item.id} item={item} onOpen={openItem} onToggleDone={toggleDone} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>

      {editor ? (
        <ItemEditor
          item={editor.item}
          initialName={editor.initialName}
          preset={editor.preset}
          onClose={() => setEditor(null)}
        />
      ) : null}

      {chooseOpen ? (
        <ChooseModal
          initial={choosePreset ?? undefined}
          onClose={() => {
            setChooseOpen(false);
            setChoosePreset(null);
          }}
          onOpenItem={(item) => {
            setChooseOpen(false);
            setChoosePreset(null);
            openItem(item);
          }}
        />
      ) : null}

      <Modal open={settingsOpen} title="Settings" onClose={() => { setSettingsOpen(false); setWipeConfirm(false); }} maxWidth="max-w-sm">
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Appearance</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">Light or dark</p>
            </div>
            <ThemeToggle />
          </div>
          <div className="border-t border-stone-200 pt-4 dark:border-stone-800">
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Keyboard</p>
            <ul className="mt-2 space-y-1.5 text-xs text-stone-500 dark:text-stone-400">
              <li className="flex items-center gap-2">
                <kbd className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[11px] text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                  n
                </kbd>
                Capture
              </li>
              <li className="flex items-center gap-2">
                <kbd className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[11px] text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                  /
                </kbd>
                Search
              </li>
              <li className="flex items-center gap-2">
                <kbd className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[11px] text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                  Esc
                </kbd>
                Back to dashboard
              </li>
            </ul>
          </div>
          <div className="border-t border-stone-200 pt-4 dark:border-stone-800">
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Danger zone</p>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
              Permanently delete every memory. This can&apos;t be undone.
            </p>
            {wipeConfirm ? (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-500/30 dark:bg-rose-950/40">
                <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
                  Are you sure? All {items.length} memories will be deleted.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await wipeAll();
                      setWipeConfirm(false);
                      setSettingsOpen(false);
                    }}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-rose-500"
                  >
                    Yes, delete everything
                  </button>
                  <button
                    type="button"
                    onClick={() => setWipeConfirm(false)}
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setWipeConfirm(true)}
                className="mt-3 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-950/40"
              >
                Wipe everything
              </button>
            )}
          </div>
          <p className="text-xs text-stone-400 dark:text-stone-500">
            Changes are saved instantly and sync automatically when you reconnect.
          </p>
        </div>
      </Modal>
    </div>
  );
}
