"use client";

import { AREA_LABEL, EASY_WIN_ENERGY } from "@/lib/constants";
import { formatDuration, formatRelative } from "@/lib/dates";
import type { Item } from "@/lib/types";
import { LightbulbIcon, SparkleIcon } from "./icons";

interface MiniItemProps {
  item: Item;
  onOpen: (item: Item) => void;
}

export function MiniItem({ item, onOpen }: MiniItemProps) {
  const done = item.status === "done";
  const like = item.desire === "like" || item.fun;

  const meta: string[] = [];
  if (item.area) meta.push(AREA_LABEL[item.area]);
  const duration = formatDuration(item.duration);
  if (duration && !done) meta.push(duration);
  if (item.fun && !done) meta.push("Fun");
  if (item.importance === 3 && !done) meta.push("Important");
  if (item.energy === EASY_WIN_ENERGY && !done) meta.push("Easy win");
  if (item.dueAt && !done) meta.push(item.dueAt < new Date().toISOString().slice(0, 10) ? "overdue" : formatRelative(item.dueAt));

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`block w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 dark:hover:bg-stone-800/60 ${
        done ? "opacity-60" : ""
      }`}
    >
      <span className="flex items-start gap-2">
        {item.kind === "idea" ? (
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center ${
              done ? "text-stone-300 dark:text-stone-600" : "text-rose-500"
            }`}
          >
            <LightbulbIcon className="h-4 w-4" strokeWidth={1.8} />
          </span>
        ) : like ? (
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center ${
              done ? "text-stone-300 dark:text-stone-600" : "text-rose-500"
            }`}
          >
            <SparkleIcon className="h-4 w-4" strokeWidth={1.8} />
          </span>
        ) : (
          <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-300 dark:bg-stone-600" />
        )}
        <span className="min-w-0 flex-1 space-y-0.5">
          <span
            className={`block truncate text-[15px] leading-snug ${
              done
                ? "text-stone-400 line-through decoration-stone-300 dark:text-stone-500 dark:decoration-stone-600"
                : "font-medium text-stone-900 dark:text-stone-100"
            }`}
          >
            {item.name}
          </span>
          {item.description && !done ? (
            <span className="block truncate text-[13px] text-stone-500 dark:text-stone-400">
              {item.description}
            </span>
          ) : null}
          {meta.length > 0 && !done ? (
            <span className="block truncate text-xs text-stone-400 dark:text-stone-500">
              {meta.join(" · ")}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}
