"use client";

import { useRef, useState, type FormEvent } from "react";
import { desireForKind } from "@/lib/constants";
import { useMemory } from "@/lib/store";
import type { ItemKind } from "@/lib/types";
import { LightbulbIcon, NoteIcon, PlusIcon } from "./icons";

/**
 * Pinned to the bottom of the viewport on purpose: on a phone the top of the
 * screen is the worst place to capture from. This is the one gesture that has
 * to feel effortless for a second brain to get used at all, so it is always in
 * the same place, reachable by a thumb, from any lane.
 *
 * Enter creates immediately. No modal, no required metadata.
 */

const KINDS: Array<{ value: ItemKind; label: string; hint: string }> = [
  { value: "todo", label: "Task", hint: "Something to do" },
  { value: "idea", label: "Idea", hint: "A thought to keep" },
  { value: "note", label: "Note", hint: "Something to remember" },
];

function KindIcon({ kind, className }: { kind: ItemKind; className?: string }) {
  if (kind === "idea") return <LightbulbIcon className={className} strokeWidth={1.8} />;
  if (kind === "note") return <NoteIcon className={className} strokeWidth={1.8} />;
  return null;
}

export function CaptureBar({ initialKind = "todo" }: { initialKind?: ItemKind }) {
  const { create } = useMemory();
  const [kind, setKind] = useState<ItemKind>(initialKind);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const name = text.trim();
    if (!name) return;
    create({ name, kind, desire: desireForKind(kind) });
    setText("");
    // Keep focus so several thoughts can be jotted in a row without re-tapping.
    inputRef.current?.focus();
  }

  const armed = KINDS.find((k) => k.value === kind) ?? KINDS[0];

  return (
    <div className="border-t border-stone-200 bg-stone-50/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95">
      {/* Keep the pinned bar clear of the iOS home indicator. */}
      <form
        onSubmit={submit}
        className="mx-auto flex w-full max-w-3xl items-center gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5"
      >
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
            <KindIcon kind={kind} className="h-4 w-4" />
          </span>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={armed.hint + "…"}
            aria-label="Capture"
            enterKeyHint="done"
            maxLength={300}
            autoComplete="off"
            data-1p-ignore
            className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-9 pr-3 text-[15px] text-stone-900 shadow-sm transition-colors placeholder:text-stone-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500"
          />
        </div>
        <button
          type="submit"
          aria-label="Save"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-700 text-white transition-colors hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 dark:bg-rose-600 dark:hover:bg-rose-500"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </form>

      <div className="mx-auto flex w-full max-w-3xl items-center gap-1.5 px-3 pb-2 sm:px-5">
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            aria-pressed={kind === k.value}
            onClick={() => setKind(k.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              kind === k.value
                ? "bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900"
                : "text-stone-500 hover:text-stone-900 dark:text-stone-500 dark:hover:text-stone-200"
            }`}
          >
            {k.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-stone-400 dark:text-stone-600">
          {armed.label} · Enter to save
        </span>
      </div>
    </div>
  );
}
