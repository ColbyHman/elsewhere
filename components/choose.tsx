"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "@/lib/api";
import { CHOOSE_TIME_BUCKETS, DESIRE_LABEL, MOOD_LABEL, MOODS } from "@/lib/constants";
import type { ChooseParams, Desire, Item, Mood } from "@/lib/types";
import { ArrowLeftIcon } from "./icons";
import { ItemCard } from "./item-card";
import { Modal } from "./modal";
import { useMemory } from "@/lib/store";

interface ChooseModalProps {
  onClose: () => void;
  onOpenItem: (item: Item) => void;
  initial?: ChooseParams;
}

type Stage = "time" | "desire" | "mood" | "results";

function initialStage(initial?: ChooseParams): Stage {
  if (initial?.mood) return "results";
  if (initial?.desire) return "mood";
  if (initial?.time) return "desire";
  return "time";
}

export function ChooseModal({ onClose, onOpenItem, initial }: ChooseModalProps) {
  const { toggleDone } = useMemory();
  const [time, setTime] = useState<string>(() => (initial?.time ? String(initial.time) : ""));
  const [desire, setDesire] = useState<Desire | "">(() => initial?.desire ?? "");
  const [mood, setMood] = useState<Mood | "">(() => initial?.mood ?? "");
  const [stage, setStage] = useState<Stage>(() => initialStage(initial));
  const [suggestions, setSuggestions] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const seqRef = useRef(0);

  const run = useCallback((t: string, d: Desire | null, m: Mood | null) => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError(false);
    setSuggestions(null);
    api
      .chooseItems({
        time: t ? Number(t) : undefined,
        desire: d ?? undefined,
        mood: m ?? undefined,
      })
      .then((items) => {
        if (seq !== seqRef.current) return;
        setSuggestions(items);
      })
      .catch(() => {
        if (seq !== seqRef.current) return;
        setError(true);
      })
      .finally(() => {
        if (seq === seqRef.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (initial?.mood) {
      const t = setTimeout(() => run(time, desire || null, initial.mood!), 0);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startOver = useCallback(() => {
    seqRef.current++;
    setTime("");
    setDesire("");
    setMood("");
    setSuggestions(null);
    setLoading(false);
    setError(false);
    setStage("time");
  }, []);

  const selectTime = (t: string) => {
    setTime(t);
    setDesire("");
    setMood("");
    setSuggestions(null);
    setStage("desire");
  };

  const selectDesire = (d: Desire | "") => {
    setDesire(d);
    setMood("");
    setSuggestions(null);
    setStage("mood");
  };

  const selectMood = (m: Mood) => {
    setMood(m);
    run(time, desire || null, m);
    setStage("results");
  };

  const timeLabel = time
    ? CHOOSE_TIME_BUCKETS.find((b) => b.minutes === Number(time))?.label
    : null;
  const desireLabel = desire ? DESIRE_LABEL[desire] : null;
  const moodLabel = mood ? MOOD_LABEL[mood] : null;

  const selectedChips: Array<{ label: string; go: () => void }> = [];
  if (timeLabel) selectedChips.push({ label: timeLabel, go: () => setStage("time") });
  if (desireLabel) selectedChips.push({ label: desireLabel, go: () => setStage("desire") });
  if (moodLabel) selectedChips.push({ label: moodLabel, go: () => setStage("mood") });

  const stepBack: Record<Stage, Stage | null> = {
    time: null,
    desire: "time",
    mood: "desire",
    results: "mood",
  };

  return (
    <Modal open title="What could I do?" onClose={onClose}>
      <div className="space-y-5">
        {stage === "time" ? (
          <div className="space-y-4">
            <StepHeading
              title="How much time do you have?"
              hint="A rough amount is enough — I'll fit things to it."
            />
            <div role="group" aria-label="How much time" className="space-y-2">
              {CHOOSE_TIME_BUCKETS.map((b) => (
                <button
                  key={b.minutes}
                  type="button"
                  onClick={() => selectTime(String(b.minutes))}
                  className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:border-rose-400 hover:bg-rose-50/40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-rose-500/50 dark:hover:bg-rose-950/30"
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {stage === "desire" ? (
          <div className="space-y-4">
            <BackLink onClick={() => setStage("time")} label="Change the time" />
            <StepHeading
              title="What kind of thing?"
              hint="Responsibilities, or things you'd enjoy spending time on."
            />
            {timeLabel ? <SelectedChip label={timeLabel} /> : null}
            <div role="group" aria-label="What kind of thing" className="flex flex-wrap gap-2">
              {(Object.keys(DESIRE_LABEL) as Desire[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => selectDesire(d)}
                  className="rounded-full border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
                >
                  {DESIRE_LABEL[d]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => selectDesire("")}
                className="rounded-full border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
              >
                Either
              </button>
            </div>
          </div>
        ) : null}

        {stage === "mood" ? (
          <div className="space-y-4">
            <BackLink onClick={() => setStage("desire")} label="Change what kind of thing" />
            <StepHeading
              title="What sounds right?"
              hint="Anything is fine — this just steers the shortlist."
            />
            <div className="flex flex-wrap items-center gap-1.5">
              {timeLabel ? <SelectedChip label={timeLabel} /> : null}
              {desireLabel ? <SelectedChip label={desireLabel} /> : null}
            </div>
            <div role="group" aria-label="Mood" className="flex flex-wrap gap-1.5">
              {MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => selectMood(m)}
                  className="rounded-full border border-stone-200 px-3.5 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
                >
                  {MOOD_LABEL[m]}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {stage === "results" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedChips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={chip.go}
                    className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={startOver}
                className="text-sm font-medium text-rose-700 hover:underline dark:text-rose-400"
              >
                Start over
              </button>
            </div>

            <StepHeading title="Here are a few good options" hint="Tap one to open it, or pick different filters." />

            <div aria-live="polite" className="space-y-2">
              {error ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Couldn&apos;t reach your memory right now. Check the connection and try again.
                </p>
              ) : loading ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">Looking…</p>
              ) : suggestions === null ? null : suggestions.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Nothing in the backlog fits that right now. Try another time, kind of thing, or mood — or capture something new.
                </p>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((item) => (
                    <ItemCard key={item.id} item={item} onOpen={onOpenItem} onToggleDone={toggleDone} />
                  ))}
                </div>
              )}
            </div>

            {stepBack.results ? (
              <BackLink onClick={() => setStage("mood")} label="Adjust the mood" />
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function StepHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
      <p className="text-sm text-stone-500 dark:text-stone-400">{hint}</p>
    </div>
  );
}

function SelectedChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
      {label}
    </span>
  );
}

function BackLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-400 transition-colors hover:text-stone-900 dark:text-stone-500 dark:hover:text-stone-100"
    >
      <ArrowLeftIcon className="h-4 w-4" />
      {label}
    </button>
  );
}
