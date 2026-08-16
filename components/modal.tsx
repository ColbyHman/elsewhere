"use client";

import { useEffect, type ReactNode } from "react";
import { XIcon } from "./icons";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

export function Modal({ open, title, onClose, children, footer, maxWidth = "max-w-lg" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-2 pb-0 sm:items-center sm:p-4 sm:pb-0">
      <div
        className="absolute inset-0 bg-stone-950/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[92dvh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl ring-1 ring-stone-900/10 sm:rounded-2xl dark:bg-stone-900 dark:ring-white/10`}
      >
        <header className="flex items-center justify-between gap-4 border-b border-stone-200 px-5 py-3.5 dark:border-stone-800">
          <h2 className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </header>
        <div className="overflow-y-auto overflow-x-hidden px-5 py-4">{children}</div>
        {footer ? (
          <footer className="border-t border-stone-200 bg-stone-50 px-5 py-3 dark:border-stone-800 dark:bg-stone-900/60">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
