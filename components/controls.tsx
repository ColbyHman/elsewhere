"use client";

import type { ReactNode } from "react";

interface SegmentedProps<T extends string> {
  label: string;
  value: T | "";
  onChange: (value: T | "") => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  allowClear?: boolean;
}

export function Segmented<T extends string>({ label, value, onChange, options, allowClear = false }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(selected && allowClear ? "" : opt.value)}
            aria-pressed={selected}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              selected
                ? "border-rose-700 text-rose-700 dark:border-rose-500 dark:text-rose-400"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function Field({ label, id, children }: { label: string; id?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 transition-colors placeholder:text-stone-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500";
