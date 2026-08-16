"use client";

import { AlertIcon, InboxIcon, PlusIcon } from "./icons";

export function EmptyState({
  title,
  message,
  onCapture,
  captureLabel = "Capture something",
}: {
  title: string;
  message: string;
  onCapture?: () => void;
  captureLabel?: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500">
        <InboxIcon className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">{message}</p>
      </div>
      {onCapture ? (
        <button
          type="button"
          onClick={onCapture}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
        >
          <PlusIcon className="h-4 w-4" />
          {captureLabel}
        </button>
      ) : null}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      <div className="h-20 animate-pulse rounded-xl bg-stone-200/70 dark:bg-stone-800/70" />
      <div className="h-20 animate-pulse rounded-xl bg-stone-200/70 dark:bg-stone-800/70" />
      <div className="h-20 animate-pulse rounded-xl bg-stone-200/70 dark:bg-stone-800/70" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
        <AlertIcon className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          Couldn&apos;t reach your memory
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {message || "Something went wrong while reading what you saved."}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
      >
        Try again
      </button>
    </div>
  );
}
