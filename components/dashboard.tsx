"use client";

import { DEFAULT_FILTER } from "@/lib/constants";
import type { ChooseParams, Filter, Item } from "@/lib/types";
import { MiniItem } from "./mini-item";

interface Prompt {
  label: string;
  hint: string;
  params: ChooseParams;
}

const PROMPTS: Prompt[] = [
  { label: "15-30 minutes", hint: "Quick wins and small errands", params: { time: 30 } },
  { label: "A few hours", hint: "Make progress on something real", params: { time: 180 } },
  { label: "I want something fun", hint: "Hobbies, games and good times", params: { mood: "fun" } },
  { label: "Something creative", hint: "Projects, learning and making things", params: { mood: "creative" } },
  { label: "Help me catch up", hint: "Urgent and due soon", params: { mood: "productive" } },
  { label: "Run some errands", hint: "Quick chores and admin", params: { mood: "errands" } },
];

interface DashboardProps {
  greeting: string;
  needCol: Item[];
  likeCol: Item[];
  recentlyCaptured: Item[];
  needSummary: string;
  likeSummary: string;
  comingUpGroups: Array<{ label: string; items: Item[] }>;
  onOpen: (item: Item) => void;
  onPrompt: (params: ChooseParams) => void;
  onBrowse: (filter: Filter) => void;
}

export function Dashboard({
  greeting,
  needCol,
  likeCol,
  recentlyCaptured,
  needSummary,
  likeSummary,
  comingUpGroups,
  onOpen,
  onPrompt,
  onBrowse,
}: DashboardProps) {
  return (
    <div className="space-y-6 pt-1">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
          {greeting}
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Everything you&apos;re holding, at a glance.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section
          aria-label="Need to do"
          className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="shrink-0 text-sm font-semibold text-stone-800 dark:text-stone-200">Need to do</h2>
            <span className="min-w-0 truncate text-xs text-stone-400 dark:text-stone-500">{needSummary}</span>
          </div>
          {needCol.length > 0 ? (
            <div className="mt-2 space-y-0.5">
              {needCol.map((item) => (
                <MiniItem key={item.id} item={item} onOpen={onOpen} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
              Nothing urgent. You&apos;re in good shape.
            </p>
          )}
          <button
            type="button"
            onClick={() => onBrowse({ ...DEFAULT_FILTER, desire: "need" })}
            className="mt-3 text-sm font-medium text-rose-700 hover:underline dark:text-rose-400"
          >
            View all →
          </button>
        </section>

        <section
          aria-label="Would like to do"
          className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="shrink-0 text-sm font-semibold text-stone-800 dark:text-stone-200">Would like to do</h2>
            <span className="min-w-0 truncate text-xs text-stone-400 dark:text-stone-500">{likeSummary}</span>
          </div>
          {likeCol.length > 0 ? (
            <div className="mt-2 space-y-0.5">
              {likeCol.map((item) => (
                <MiniItem key={item.id} item={item} onOpen={onOpen} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
              Add something you&apos;d enjoy — a hobby, a project, anything you want to make time for.
            </p>
          )}
          <button
            type="button"
            onClick={() => onBrowse({ ...DEFAULT_FILTER, desire: "like" })}
            className="mt-3 text-sm font-medium text-rose-700 hover:underline dark:text-rose-400"
          >
            View all →
          </button>
        </section>
      </div>

      <section
        aria-label="What can I do"
        className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
      >
        <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
          What can I do?
        </h2>
        <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
          Pick a starting point and I&apos;ll put together a shortlist.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PROMPTS.map((prompt) => (
            <button
              key={prompt.label}
              type="button"
              onClick={() => onPrompt(prompt.params)}
              aria-label={prompt.label}
              className="rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-left transition-colors hover:border-rose-400 hover:bg-rose-50/40 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-rose-500/50 dark:hover:bg-rose-950/30"
            >
              <span className="block text-sm font-medium text-stone-900 dark:text-stone-100">
                {prompt.label}
              </span>
              <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
                {prompt.hint}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section
          aria-label="Coming up"
          className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
        >
          <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-200">Coming up</h2>
          {comingUpGroups.length > 0 ? (
            <div className="mt-2 space-y-3">
              {comingUpGroups.map((group) => (
                <div key={group.label} className="space-y-0.5">
                  <p className="px-1 text-xs font-medium text-stone-400 dark:text-stone-500">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <MiniItem key={item.id} item={item} onOpen={onOpen} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
              Nothing on the calendar for the next couple of weeks.
            </p>
          )}
        </section>

        <section
          aria-label="Recently captured"
          className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
        >
          <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
            Recently captured
          </h2>
          <div className="mt-1 space-y-0.5">
            {recentlyCaptured.map((item) => (
              <MiniItem key={item.id} item={item} onOpen={onOpen} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}