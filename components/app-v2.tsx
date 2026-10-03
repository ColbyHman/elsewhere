"use client";

import { useMemo, useState } from "react";
import { LANES, laneOf, type Lane } from "@/lib/lanes";
import { useMemory } from "@/lib/store";
import type { Item } from "@/lib/types";
import { CaptureBar } from "./capture-bar";
import { DetailSheet } from "./detail-sheet";
import { LaneItem } from "./lane-item";
import { SettingsSheet } from "./settings-sheet";

/**
 * Four lanes, switched rather than stacked. No dashboard: a dashboard presents
 * everything at once and asks the user to parse it, and its sections were the
 * app's invention rather than the user's vocabulary.
 *
 * Search overrides the lanes — when you're recalling something, you want a
 * result list, not four buckets to check.
 */
export function AppV2() {
  const { items, q, setQ, toggleDone } = useMemory();
  const [lane, setLane] = useState<Lane>("chores");
  const [openId, setOpenId] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);

  const searching = q.trim().length > 0;

  const visible = useMemo(() => {
    const open = items.filter((i) => i.status === "open");
    if (searching) return open;
    return open.filter((i) => laneOf(i) === lane);
  }, [items, lane, searching]);

  const counts = useMemo(() => {
    const open = items.filter((i) => i.status === "open");
    const out = {} as Record<Lane, number>;
    for (const l of LANES) out[l.id] = 0;
    for (const item of open) out[laneOf(item)] += 1;
    return out;
  }, [items]);

  const active = LANES.find((l) => l.id === lane) ?? LANES[0];
  const openItem = items.find((i) => i.id === openId) ?? null;

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 text-stone-900 transition-colors dark:bg-stone-950 dark:text-stone-100">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Lane rail — a tab row on mobile, a sidebar on desktop. One tree. */}
        <nav
          aria-label="Lanes"
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-stone-200 px-3 py-2 md:w-52 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-3 md:py-4"
        >
          {LANES.map((l) => {
            const isActive = !searching && l.id === lane;
            return (
              <button
                key={l.id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  setLane(l.id);
                  setQ("");
                }}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors md:w-full ${
                  isActive
                    ? "bg-stone-800 font-medium text-white dark:bg-stone-100 dark:text-stone-900"
                    : "text-stone-600 hover:bg-stone-200/70 dark:text-stone-400 dark:hover:bg-stone-800/70"
                }`}
              >
                <span className="whitespace-nowrap">{l.label}</span>
                <span
                  className={`ml-auto hidden text-xs tabular-nums md:inline ${
                    isActive ? "opacity-70" : "text-stone-400 dark:text-stone-600"
                  }`}
                >
                  {counts[l.id]}
                </span>
              </button>
            );
          })}
        <button
              type="button"
              aria-label="Settings"
              onClick={() => setSettings(true)}
              className="mt-auto hidden shrink-0 rounded-lg px-3 py-2 text-left text-sm text-stone-500 transition-colors hover:bg-stone-200/70 dark:text-stone-400 dark:hover:bg-stone-800/70 md:block"
            >
              Settings
            </button>
          </nav>

        <main className="mx-auto w-full max-w-3xl flex-1 px-3 pb-4 pt-4 sm:px-5">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search everything…"
            aria-label="Search everything"
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-[15px] shadow-sm transition-colors placeholder:text-stone-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500"
          />

          <header className="mt-5 flex items-baseline justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-tight">
              {searching ? `${visible.length} result${visible.length === 1 ? "" : "s"}` : active.label}
            </h1>
            <div className="flex items-center gap-2">
              {!searching ? (
                <p className="hidden truncate text-sm text-stone-500 dark:text-stone-400 sm:block">
                  {active.blurb}
                </p>
              ) : null}
              <button
                type="button"
                aria-label="Settings"
                onClick={() => setSettings(true)}
                className="rounded-lg px-2 py-1 text-sm font-medium text-stone-400 hover:text-stone-900 md:hidden dark:hover:text-stone-100"
              >
                Settings
              </button>
            </div>
          </header>

          {visible.length === 0 ? (
            <p className="mt-8 rounded-xl border border-dashed border-stone-300 px-4 py-10 text-center text-sm text-stone-500 dark:border-stone-800 dark:text-stone-500">
              {searching ? "Nothing matches that." : active.empty}
            </p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {visible.map((item: Item) => (
                <LaneItem
                  key={item.id}
                  item={item}
                  showLane={searching}
                  onOpen={() => setOpenId(item.id)}
                  onToggleDone={() => toggleDone(item.id)}
                />
              ))}
            </ul>
          )}
        </main>
      </div>

      <CaptureBar initialKind={lane === "ideas" ? "idea" : "todo"} />

      {openItem ? <DetailSheet item={openItem} onClose={() => setOpenId(null)} /> : null}
      {settings ? <SettingsSheet onClose={() => setSettings(false)} /> : null}
    </div>
  );
}
