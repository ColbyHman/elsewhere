"use client";

import type { ReactNode } from "react";
import { AREAS, AREA_LABEL, ATTENTIONS, ATTENTION_LABEL, DESIRE_LABEL, KINDS, KIND_LABEL, STATUS_LABEL } from "@/lib/constants";
import { useMemory } from "@/lib/store";
import type { Area, Attention, Desire, ItemKind, ItemStatus } from "@/lib/types";

export function FilterPanel() {
  const { filter, setFilter, counts } = useMemory();

  const attentionOptions: Array<{ value: string; label: string }> = [
    { value: "any", label: "Any" },
    { value: "inbox", label: withCount("Inbox", counts?.inbox) },
    ...ATTENTIONS.map((a) => ({
      value: a,
      label: withCount(ATTENTION_LABEL[a], counts?.attentions[a]),
    })),
  ];

  const kindOptions: Array<{ value: string; label: string }> = [
    { value: "any", label: "Any" },
    ...KINDS.map((k) => ({ value: k, label: withCount(KIND_LABEL[k], counts?.kinds[k]) })),
  ];

  const areaOptions: Array<{ value: string; label: string }> = [
    { value: "any", label: "Any" },
    ...AREAS.map((a) => ({ value: a, label: withCount(AREA_LABEL[a], counts?.areas[a]) })),
  ];

  const desireOptions: Array<{ value: string; label: string }> = [
    { value: "any", label: "Any" },
    { value: "need", label: withCount(DESIRE_LABEL.need, counts?.desire.need) },
    { value: "like", label: withCount(DESIRE_LABEL.like, counts?.desire.like) },
  ];

  return (
    <div
      role="region"
      aria-label="Filters"
      className="overflow-hidden space-y-4 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
    >
      <FilterSection label="Show">
        <PillGroup
          options={[
            { value: "all", label: "All" },
            { value: "open", label: STATUS_LABEL.open },
            { value: "done", label: STATUS_LABEL.done },
            { value: "archived", label: STATUS_LABEL.archived },
          ]}
          value={filter.status}
          onChange={(v) => setFilter({ ...filter, status: v as ItemStatus | "all" })}
        />
      </FilterSection>

      <FilterSection label="Type">
        <PillGroup
          options={kindOptions}
          value={filter.kind ?? "any"}
          onChange={(v) => setFilter({ ...filter, kind: v === "any" ? null : (v as ItemKind) })}
        />
      </FilterSection>

      <FilterSection label="Side">
        <PillGroup
          options={desireOptions}
          value={filter.desire ?? "any"}
          onChange={(v) => setFilter({ ...filter, desire: v === "any" ? null : (v as Desire) })}
        />
      </FilterSection>

      <FilterSection label="Attention">
        <PillGroup
          options={attentionOptions}
          value={filter.attention ?? "any"}
          onChange={(v) =>
            setFilter({ ...filter, attention: v === "any" ? null : (v as Attention | "inbox") })
          }
        />
      </FilterSection>

      <FilterSection label="Area">
        <PillGroup
          options={areaOptions}
          value={filter.area ?? "any"}
          onChange={(v) => setFilter({ ...filter, area: v === "any" ? null : (v as Area) })}
        />
      </FilterSection>

      <FilterSection label="Quick picks">
        <div className="flex flex-wrap gap-1.5">
          <TogglePill
            label="Important"
            active={filter.important}
            onClick={() => setFilter({ ...filter, important: !filter.important })}
          />
          <TogglePill
            label="Easy wins"
            active={filter.easy}
            onClick={() => setFilter({ ...filter, easy: !filter.easy })}
          />
          <TogglePill
            label="Fun"
            active={filter.fun}
            onClick={() => setFilter({ ...filter, fun: !filter.fun })}
          />
        </div>
      </FilterSection>
    </div>
  );
}

function withCount(label: string, count: number | undefined): string {
  return typeof count === "number" ? `${label} · ${count}` : label;
}

function FilterSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
        {label}
      </p>
      {children}
    </div>
  );
}

function PillGroup({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={selected}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              selected
                ? "border border-rose-700 text-rose-700 dark:border-rose-500 dark:text-rose-400"
                : "border border-stone-200 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function TogglePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "border border-rose-700 text-rose-700 dark:border-rose-500 dark:text-rose-400"
          : "border border-stone-200 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
      }`}
    >
      {label}
    </button>
  );
}