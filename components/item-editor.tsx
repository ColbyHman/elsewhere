"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AREAS,
  AREA_LABEL,
  DESIRE_LABEL,
  KIND_LABEL,
  desireForKind,
} from "@/lib/constants";
import { WHENS, fieldsToWhen, upcomingLabel, whenToFields, type When } from "@/lib/dates";
import { normalizeTag } from "@/lib/text";
import { useMemory } from "@/lib/store";
import type { Area, Desire, Item, ItemKind, ItemPatch, Scale } from "@/lib/types";
import { Field, inputClass, Segmented } from "./controls";
import { ArchiveIcon, ChevronDownIcon, TrashIcon } from "./icons";
import { Modal } from "./modal";

interface ItemEditorProps {
  item: Item;
  onClose: () => void;
}

const KIND_PLACEHOLDER: Record<ItemKind, string> = {
  note: "e.g. Things to ask John",
  todo: "e.g. Replace garage camera",
  idea: "e.g. Article about databases",
};

const SIMPLE_TIME_OPTIONS = [
  { value: "15", label: "15m" },
  { value: "30", label: "30m" },
  { value: "60", label: "1h" },
  { value: "180", label: "2h+" },
];

const SIMPLE_ENERGY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "1", label: "Easy" },
  { value: "2", label: "Medium" },
  { value: "3", label: "Hard" },
];

const SIMPLE_IMPORTANCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "1", label: "Low" },
  { value: "2", label: "Medium" },
  { value: "3", label: "High" },
];

function approxTimeLabel(minutes: number | null): string {
  if (!minutes) return "";
  if (minutes <= 20) return "15";
  if (minutes <= 45) return "30";
  if (minutes <= 120) return "60";
  return "180";
}

/** Reminder line under the When row, so buckets don't feel like guesswork. */
function dueDatePreview(when: When): string {
  const { dueAt } = whenToFields(when);
  if (!dueAt) return "No deadline.";
  return `Puts a due date of ${upcomingLabel(dueAt).toLowerCase()} on it.`;
}

function detailsHaveContent(item: Item): boolean {
  return !!(
    item.description ||
    item.attention ||
    item.area ||
    item.dueAt ||
    item.availableAt ||
    item.fun ||
    item.tags.length > 0
  );
}

export function ItemEditor({ item, onClose }: ItemEditorProps) {
  const { update, remove } = useMemory();
  const [name, setName] = useState(item.name);
  const [kind, setKind] = useState<ItemKind>(item.kind);
  const [description, setDescription] = useState(item.description ?? "");
  const [when, setWhen] = useState<When>(() => fieldsToWhen(item.attention, item.dueAt));
  const [desire, setDesire] = useState<Desire | "">(item.desire ?? desireForKind(item.kind) ?? "");
  const [area, setArea] = useState<Area | "">(item.area ?? "");
  const [importance, setImportance] = useState<string>(item.importance ? String(item.importance) : "");
  const [energy, setEnergy] = useState<string>(item.energy ? String(item.energy) : "");
  const [duration, setDuration] = useState<string>(item.duration ? approxTimeLabel(item.duration) : "");
  const [fun, setFun] = useState<boolean>(item.fun);
  const [availableAt, setAvailableAt] = useState(item.availableAt ?? "");
  const [tagsInput, setTagsInput] = useState(item.tags.join(", "));
  const [detailsOpen, setDetailsOpen] = useState(() => detailsHaveContent(item));
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => nameRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const tags = useMemo(
    () => tagsInput.split(",").map(normalizeTag).filter(Boolean).slice(0, 10),
    [tagsInput],
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give it a title — a few words is enough.");
      nameRef.current?.focus();
      return;
    }

    const durationMinutes = duration ? Number(duration) : null;
    const whenFields = whenToFields(when);
    const fields = {
      kind,
      description: description.trim() || null,
      attention: whenFields.attention,
      desire: (desire || null) as Desire | null,
      area: (area || null) as Area | null,
      importance: importance ? (Number(importance) as Scale) : null,
      energy: energy ? (Number(energy) as Scale) : null,
      duration: durationMinutes,
      fun,
      availableAt: availableAt || null,
      dueAt: whenFields.dueAt,
      tags,
    };

    if (item) {
      update(item.id, { ...fields, name: trimmed } as ItemPatch);
    }
    onClose();
  }

  const archived = item.status === "archived";

  return (
    <Modal
      open
      title="Edit memory"
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              remove(item.id);
              onClose();
            }}
            className="mr-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            <TrashIcon className="h-4 w-4" />
            Delete
          </button>
          {!archived ? (
            <button
              type="button"
              onClick={() => {
                update(item.id, { status: "archived" });
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
            >
              <ArchiveIcon className="h-4 w-4" />
              Archive
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="item-form"
            className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          >
            Save
          </button>
        </div>
      }
    >
      <form id="item-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Title" id="item-title">
          <input
            ref={nameRef}
            id="item-title"
            autoComplete="off"
            data-1p-ignore
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            placeholder={KIND_PLACEHOLDER[kind]}
            className={inputClass}
            maxLength={300}
          />
          {error ? (
            <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
              {error}
            </p>
          ) : null}
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Type">
            <Segmented
              label="Type"
              value={kind}
              onChange={(v) => setKind(v as ItemKind)}
              options={[
                { value: "note", label: KIND_LABEL.note },
                { value: "todo", label: KIND_LABEL.todo },
                { value: "idea", label: KIND_LABEL.idea },
              ]}
            />
          </Field>

          <Field label="Time">
            <Segmented
              label="Time"
              value={duration}
              onChange={setDuration}
              options={SIMPLE_TIME_OPTIONS}
              allowClear
            />
          </Field>
        </div>

        <Field label="When">
          <Segmented
            label="When"
            value={when}
            onChange={(v) => setWhen(v as When)}
            options={WHENS}
          />
          <p className="text-xs text-stone-400 dark:text-stone-500">
            {when === "whenever"
              ? "No deadline — pick this up whenever the moment comes."
              : dueDatePreview(when)}
          </p>
        </Field>

        <button
          type="button"
          onClick={() => setDetailsOpen((s) => !s)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-400 transition-colors hover:text-stone-800 dark:text-stone-500 dark:hover:text-stone-200"
          aria-expanded={detailsOpen}
        >
          <ChevronDownIcon
            className={`h-3.5 w-3.5 transition-transform ${detailsOpen ? "rotate-180" : ""}`}
          />
          {detailsOpen ? "Show less" : "Add details"}
        </button>

        {detailsOpen ? (
          <div className="space-y-4 border-t border-stone-200 pt-4 dark:border-stone-800">
            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Anything worth remembering…"
                rows={3}
                className={`${inputClass} resize-y`}
              />
            </Field>

            <Field label="Effort">
              <Segmented
                label="Effort"
                value={energy}
                onChange={setEnergy}
                options={SIMPLE_ENERGY_OPTIONS}
                allowClear
              />
            </Field>

            <Field label="Importance">
              <Segmented
                label="Importance"
                value={importance}
                onChange={setImportance}
                options={SIMPLE_IMPORTANCE_OPTIONS}
                allowClear
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Area" id="item-area">
                <select
                  id="item-area"
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

              <Field label="Side" id="item-side">
                <select
                  id="item-side"
                  value={desire}
                  onChange={(e) => setDesire(e.target.value as Desire | "")}
                  className={inputClass}
                >
                  <option value="">Not sure</option>
                  <option value="need">{DESIRE_LABEL.need}</option>
                  <option value="like">{DESIRE_LABEL.like}</option>
                </select>
              </Field>
            </div>

            <Field label="Available after" id="item-available">
              <input
                id="item-available"
                type="date"
                value={availableAt}
                onChange={(e) => setAvailableAt(e.target.value)}
                className={inputClass}
              />
            </Field>

            <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
              <input
                type="checkbox"
                checked={fun}
                onChange={(e) => setFun(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 accent-rose-700"
              />
              Fun — something to do for its own sake
            </label>

            <Field label="Tags">
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="comma, separated"
                className={inputClass}
              />
            </Field>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
