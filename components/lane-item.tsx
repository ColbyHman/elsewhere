"use client";

import { formatDuration, humanDay } from "@/lib/dates";
import { LANES, laneOf } from "@/lib/lanes";
import type { Item } from "@/lib/types";
import { CheckIcon, LightbulbIcon } from "./icons";

/**
 * One row per item. Flat and boring on purpose — a second brain should be
 * readable at a glance, and the only thing competing for attention is the due
 * date, because that is the only thing with a consequence.
 */
/**
 * Today's date, computed once per module load rather than per render: calling
 * Date.now() during render is impure, and the value only needs to be as fresh
 * as the page load.
 */
const TODAY = new Date().toISOString().slice(0, 10);
const SOON = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

export function LaneItem({
  item,
  showLane,
  onOpen,
  onToggleDone,
}: {
  item: Item;
  showLane: boolean;
  onOpen: () => void;
  onToggleDone: () => void;
}) {
  const done = item.status === "done";
  const isIdea = item.kind === "idea";
  const overdue = item.dueAt != null && item.dueAt < TODAY;
  const dueSoon = item.dueAt != null && !overdue && item.dueAt <= SOON;

  const lane = LANES.find((l) => l.id === laneOf(item));

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-white px-3 py-3 text-left transition-colors hover:border-stone-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
      >
        {isIdea ? (
          <span aria-hidden="true" className="mt-0.5 shrink-0 text-amber-500">
            <LightbulbIcon className="h-5 w-5" strokeWidth={1.8} />
          </span>
        ) : (
          <button
            type="button"
            aria-label={done ? `Reopen "${item.name}"` : `Mark "${item.name}" done`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleDone();
            }}
            className={`mt-0.5 flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full border transition-colors ${
              done
                ? "border-rose-700 bg-rose-700 text-white"
                : "border-stone-300 text-transparent hover:border-rose-500 hover:text-rose-500 dark:border-stone-600"
            }`}
          >
            <CheckIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        )}

        <span className="min-w-0 flex-1">
          <span
            className={`block text-[15px] leading-snug ${
              done
                ? "text-stone-400 line-through dark:text-stone-500"
                : "font-medium text-stone-900 dark:text-stone-100"
            }`}
          >
            {item.name}
          </span>

          {item.description ? (
            <span className="mt-0.5 block truncate text-[13px] text-stone-500 dark:text-stone-400">
              {item.description}
            </span>
          ) : null}

          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            {item.dueAt ? (
              <span className={overdue ? "font-medium text-rose-600 dark:text-rose-400" : dueSoon ? "text-amber-600 dark:text-amber-400" : "text-stone-500 dark:text-stone-400"}>
                {overdue ? "Overdue · " : "Due "}
                {humanDay(item.dueAt)}
              </span>
            ) : null}

            {formatDuration(item.duration) ? (
              <span className="text-stone-400 dark:text-stone-500">{formatDuration(item.duration)}</span>
            ) : null}

            {showLane && lane ? (
              <span className="text-stone-400 dark:text-stone-500">{lane.label}</span>
            ) : null}

            {item.area ? (
              <span className="text-stone-400 dark:text-stone-500">{item.area}</span>
            ) : null}

            {item.tags.map((t) => (
              <span key={t} className="text-stone-400 dark:text-stone-500">
                #{t}
              </span>
            ))}
          </span>
        </span>
      </div>
    </li>
  );
}
