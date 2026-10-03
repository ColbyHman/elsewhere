"use client";

import { useRef, useState, type FormEvent } from "react";
import { AREAS, AREA_LABEL, KIND_LABEL, desireForKind } from "@/lib/constants";
import { humanDay } from "@/lib/dates";
import { LANES, laneOf } from "@/lib/lanes";
import { useMemory } from "@/lib/store";
import type { Area, Attention, Desire, Item, ItemKind, ItemPatch, Scale } from "@/lib/types";
import { Field, inputClass, Segmented } from "./controls";
import { TrashIcon, XIcon } from "./icons";

const HORIZONS: Array<{ value: Attention | ""; label: string }> = [
  { value: "", label: "No horizon" },
  { value: "now", label: "Now" },
  { value: "soon", label: "Soon" },
  { value: "later", label: "Later" },
  { value: "whenever", label: "Whenever" },
];

const DURATIONS: Array<{ value: string; label: string }> = [
  { value: "15", label: "15m" },
  { value: "30", label: "30m" },
  { value: "60", label: "1h" },
  { value: "180", label: "3h" },
  { value: "360", label: "6h+" },
];

const SCALES: Array<{ value: string; label: string }> = [
  { value: "1", label: "Low" },
  { value: "2", label: "Medium" },
  { value: "3", label: "High" },
];

/**
 * Due date and horizon are deliberately independent controls here (ADR-0002).
 * The previous version collapsed them into one row and wrote a bucket-derived
 * date over the real due date, which destroyed genuine deadlines.
 */
export function DetailSheet({ item, onClose }: { item: Item; onClose: () => void }) {
  const { update, remove } = useMemory();
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [kind, setKind] = useState<ItemKind>(item.kind);
  const [dueAt, setDueAt] = useState(item.dueAt ?? "");
  const [attention, setAttention] = useState<Attention | "">(item.attention ?? "");
  const [duration, setDuration] = useState(item.duration != null ? String(item.duration) : "");
  const [desire] = useState<Desire | "">(item.desire ?? desireForKind(item.kind) ?? "");
  const [area, setArea] = useState<Area | "">(item.area ?? "");
  const [energy, setEnergy] = useState(item.energy ? String(item.energy) : "");
  const [tagsInput, setTagsInput] = useState(item.tags.join(", "));
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  function save(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    update(item.id, {
      name: trimmed,
      description: description.trim() || null,
      kind,
      dueAt: dueAt || null,
      attention: attention || null,
      duration: duration ? Number(duration) : null,
      desire: desire || null,
      area: area || null,
      energy: energy ? (Number(energy) as Scale) : null,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
        .filter(Boolean)
        .slice(0, 10),
    } as ItemPatch);
    onClose();
  }

  const lane = LANES.find((l) => l.id === laneOf(item));

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-stone-900/40 p-0 sm:items-center sm:p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edit item"
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-stone-200 bg-stone-50 shadow-xl sm:rounded-2xl dark:border-stone-800 dark:bg-stone-950"
      >
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 dark:border-stone-800">
          <span className="text-xs font-medium uppercase tracking-wide text-stone-400">{lane?.label}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Title"
              maxLength={300}
              autoFocus
              className={`${inputClass} text-[15px] font-medium`}
            />

            {/* Real deadline. Rare but consequential, so always visible. */}
            <Field label="Due date" id="v2-due">
              <input
                id="v2-due"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-stone-400 dark:text-stone-500">
                A real deadline. Only this triggers a reminder.
              </p>
            </Field>

            {/* Soft planning horizon. Never writes the due date. */}
            <Field label="When you'd get to it" id="v2-horizon">
              <Segmented
                label="When you'd get to it"
                value={attention}
                onChange={setAttention}
                options={HORIZONS}
                allowClear
              />
            </Field>

            <Field label="How long">
              <Segmented
                label="How long"
                value={duration}
                onChange={setDuration}
                options={DURATIONS}
                allowClear
              />
              <p className="text-xs text-stone-400 dark:text-stone-500">
                Over an hour and it becomes a project instead of a chore.
              </p>
            </Field>

            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="text-sm font-medium text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
              aria-expanded={open}
            >
              {open ? "Fewer details" : "More details"}
            </button>

            {open ? (
              <div className="space-y-4 border-t border-stone-200 pt-4 dark:border-stone-800">
                <Field label="Notes" id="v2-desc">
                  <textarea
                    id="v2-desc"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Anything worth remembering…"
                    className={`${inputClass} resize-y`}
                  />
                </Field>

                <Field label="Type" id="v2-kind">
                  <Segmented
                    label="Type"
                    value={kind}
                    onChange={(v) => setKind(v as ItemKind)}
                    options={(["note", "todo", "idea"] as ItemKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Area" id="v2-area">
                    <select
                      id="v2-area"
                      value={area}
                      onChange={(e) => setArea(e.target.value as Area | "")}
                      className={inputClass}
                    >
                      <option value="">None</option>
                      {AREAS.map((a) => (
                        <option key={a} value={a}>
                          {AREA_LABEL[a]}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Effort" id="v2-energy">
                    <select
                      id="v2-energy"
                      value={energy}
                      onChange={(e) => setEnergy(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">None</option>
                      {SCALES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Tags" id="v2-tags">
                  <input
                    id="v2-tags"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="comma, separated"
                    className={inputClass}
                  />
                </Field>

                {item.dueAt ? (
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    Reminder set for {humanDay(item.dueAt)}.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 border-t border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900">
            <button
              type="button"
              onClick={() => {
                remove(item.id);
                onClose();
              }}
              aria-label="Delete"
              className="mr-auto rounded-lg p-2 text-stone-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-600"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
