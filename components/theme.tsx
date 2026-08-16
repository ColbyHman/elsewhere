"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { MoonIcon, SunIcon } from "./icons";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = theme === "dark" ? "#1C1917" : "#FAF8F5";
    try {
      localStorage.setItem("taskboard:theme", theme);
    } catch {
      // Storage unavailable — theme still applies for this session.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}

const emptySubscribe = () => () => {};

function useIsClient(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const mounted = useIsClient();

  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-100"
    >
      {mounted ? (
        dark ? (
          <SunIcon className="h-4.5 w-4.5" />
        ) : (
          <MoonIcon className="h-4.5 w-4.5" />
        )
      ) : (
        <span aria-hidden="true" className="block h-4.5 w-4.5" />
      )}
    </button>
  );
}
