"use client";

import { AREA_LABEL, EASY_WIN_ENERGY, IMPORTANT_IMPORTANCE } from "@/lib/constants";
import { formatDuration, formatRelative } from "@/lib/dates";
import type { Item } from "@/lib/types";
import { CheckIcon, LightbulbIcon } from "./icons";

const ATTENTION_DOT: Record<string, string> = {
  now: "bg-rose-500",
  soon: "bg-rose-300",
  later: "bg-stone-300 dark:bg-stone-600",
  whenever: "bg-stone-400",
};

interface ItemCardProps {
  item: Item;
  onOpen: (item: Item) => void;
  onToggleDone: (id: string) => void;
}

export function ItemCard({ item, onOpen, onToggleDone }: ItemCardProps) {
  const done = item.status === "done";

  const meta: string[] = [];
  if (item.area) meta.push(AREA_LABEL[item.area]);
  const duration = formatDuration(item.duration);
  if (duration && !done) meta.push(duration);
  if (item.importance === IMPORTANT_IMPORTANCE && !done) meta.push("Important");
  if (item.energy === EASY_WIN_ENERGY && !done) meta.push("Easy win");
  if (item.fun && !done) meta.push("Fun");
  if (item.dueAt && !done) meta.push(formatRelative(item.dueAt));
  for (const t of item.tags) meta.push(`#${t}`);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${item.name}. Press Enter to edit.`}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(item);
        }
      }}
      className="group relative cursor-pointer rounded-xl border border-stone-200/90 bg-white p-3.5 text-left transition-colors hover:border-stone-300 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700 dark:hover:bg-stone-800/60"
    >
      <div className="flex items-start gap-3">
        {item.kind === "todo" ? (
          <button
            type="button"
            aria-label={done ? `Mark "${item.name}" as open` : `Mark "${item.name}" as done`}
            title={done ? "Reopen" : "Done"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleDone(item.id);
            }}
            className={`mt-0.5 flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full border transition-colors ${
              done
                ? "border-rose-700 bg-rose-700 text-white"
                : "border-stone-300 text-transparent hover:border-rose-500 hover:text-rose-500 dark:border-stone-600"
            }`}
          >
            <CheckIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        ) : item.kind === "idea" ? (
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-5.5 w-5.5 shrink-0 items-center justify-center ${
              done ? "text-stone-300 dark:text-stone-600" : "text-rose-500"
            }`}
          >
            <LightbulbIcon className="h-5 w-5" strokeWidth={1.8} />
          </span>
        ) : null}

        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex items-center gap-2">
            {item.attention && !done ? (
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${ATTENTION_DOT[item.attention]}`}
              />
            ) : null}
            <span
              className={`truncate text-[15px] leading-snug ${
                done
                  ? "text-stone-400 line-through decoration-stone-300 dark:text-stone-500 dark:decoration-stone-600"
                  : "font-medium text-stone-900 dark:text-stone-100"
              }`}
            >
              {item.name}
            </span>
          </p>

          {item.description ? (
            <p
              className={`line-clamp-2 text-sm ${
                done ? "text-stone-400 dark:text-stone-500" : "text-stone-500 dark:text-stone-400"
              }`}
            >
              {item.description}
            </p>
          ) : null}

          {meta.length > 0 ? (
            <p
              className={`truncate pt-0.5 text-xs ${
                done ? "text-stone-300 dark:text-stone-600" : "text-stone-400 dark:text-stone-500"
              }`}
            >
              {meta.join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
