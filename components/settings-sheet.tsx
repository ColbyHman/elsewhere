"use client";

import { useState } from "react";
import { ThemeToggle } from "./theme";
import { ReminderToggle } from "./reminder-toggle";
import { useMemory } from "@/lib/store";
import { XIcon } from "./icons";

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { offline, items, wipeAll } = useMemory();
  const [wipe, setWipe] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 sm:items-center sm:p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-stone-200 bg-stone-50 sm:rounded-2xl dark:border-stone-800 dark:bg-stone-950"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800">
          <span className="text-sm font-semibold">Settings</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Appearance</p>
              <p className="text-xs text-stone-500">Light or dark</p>
            </div>
            <ThemeToggle />
          </div>

          <div className="border-t border-stone-200 pt-4 dark:border-stone-800">
            <ReminderToggle />
          </div>

          <div className="border-t border-stone-200 pt-4 dark:border-stone-800">
            <p className="text-sm font-medium">Keyboard</p>
            <ul className="mt-2 space-y-1.5 text-xs text-stone-500">
              <li>
                <kbd className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[11px] dark:border-stone-700 dark:bg-stone-800">Enter</kbd>{" "}
                capture, without leaving the field
              </li>
              <li>
                <kbd className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[11px] dark:border-stone-700 dark:bg-stone-800">Esc</kbd>{" "}
                close a sheet
              </li>
            </ul>
          </div>

          <div className="border-t border-stone-200 pt-4 dark:border-stone-800">
            <p className="text-sm font-medium">Danger zone</p>
            {wipe ? (
              <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-500/30 dark:bg-rose-950/40">
                <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
                  Delete all {items.length} items?
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await wipeAll();
                      onClose();
                    }}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-500"
                  >
                    Yes, delete everything
                  </button>
                  <button
                    type="button"
                    onClick={() => setWipe(false)}
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-600 dark:border-stone-700 dark:text-stone-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setWipe(true)}
                className="mt-2 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 dark:border-rose-400"
              >
                Wipe everything
              </button>
            )}
          </div>

          {offline ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Offline — changes are queued and will sync when you reconnect.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
