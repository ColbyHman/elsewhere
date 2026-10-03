"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Opt-in to reminders (ADR-0001).
 *
 * Never prompts on load — iOS allows exactly one permission prompt per origin
 * and burns it whether the timing is right or not. An explicit action means a
 * denial costs nothing, and the iOS install requirement is explained up front
 * rather than silently failing after the fact.
 */

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalised);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

type State = "idle" | "working" | "on" | "off" | "unsupported" | "blocked";

export function ReminderToggle() {
  const [state, setState] = useState<State>("idle");
  // Read once at mount rather than via an effect: this can never change while
  // the page is open, and setState-in-effect causes a cascading render.
  const [standalone] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as { standalone?: boolean }).standalone === true),
  );
  const [detail, setDetail] = useState("");

  useEffect(() => {
    // Unsupported is decided synchronously here so no setState is needed on
    // the unsupported path; the async work only sets state in a callback.
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      queueMicrotask(() => setState("unsupported"));
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  const enable = useCallback(async () => {
    setState("working");
    setDetail("");
    try {
      const res = await fetch("/api/push/subscribe");
      if (!res.ok) throw new Error("Server has no VAPID keys configured");
      const { publicKey } = (await res.json()) as { publicKey: string | null };
      if (!publicKey) throw new Error("No VAPID public key");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("blocked");
        setDetail("Permission was declined. To turn it back on, use the site settings in your browser.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const saved = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!saved.ok) throw new Error("Could not save the subscription");

      setState("on");
    } catch (err) {
      setState("blocked");
      setDetail(err instanceof Error ? err.message : "Could not enable reminders");
    }
  }, []);

  const disable = useCallback(async () => {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
      setDetail("");
    } catch {
      setState("off");
    }
  }, []);

  if (state === "unsupported") {
    return <p className="text-xs text-stone-400">This browser can&rsquo;t show push reminders.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Due-date reminders</p>
          <p className="text-xs text-stone-500">
            {state === "on" ? "On — you\u2019ll be nudged about due dates." : "Off"}
          </p>
        </div>
        <button
          type="button"
          disabled={state === "working"}
          onClick={() => (state === "on" ? void disable() : void enable())}
          className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
            state === "on"
              ? "border border-stone-300 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400"
              : "bg-rose-700 text-white hover:bg-rose-600"
          }`}
        >
          {state === "working" ? "…" : state === "on" ? "Turn off" : "Turn on"}
        </button>
      </div>

      {state === "blocked" && detail ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">{detail}</p>
      ) : null}

      {state !== "on" && !standalone ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          On iPhone, add this to your Home Screen first — push only works from the
          installed app.
        </p>
      ) : null}
    </div>
  );
}
