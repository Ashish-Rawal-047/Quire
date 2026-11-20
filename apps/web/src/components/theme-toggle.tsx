"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import * as React from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";

type ThemeChoice = "light" | "dark" | "system";
const KEY = "quire-theme";
const EVENT = "quire-theme-change";

function readChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === "dark" || saved === "system" ? saved : "light";
  } catch {
    return "light"; // storage unavailable (private mode, blocked site data)
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function resolve(choice: ThemeChoice): "light" | "dark" {
  if (choice !== "system") return choice;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Light (default) / Dark / System. The choice is a per-device convenience kept in localStorage. */
export function ThemeToggle({ className }: { className?: string }) {
  const choice = React.useSyncExternalStore(subscribe, readChoice, () => "light" as ThemeChoice);

  function apply(next: ThemeChoice) {
    document.documentElement.dataset.theme = resolve(next);
    try {
      if (next === "light") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      /* ignore — the theme still applies for this page view */
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <SegmentedControl
      aria-label="Colour theme"
      value={choice}
      onChange={apply}
      className={className}
      options={[
        { value: "light", label: <span className="sr-only sm:not-sr-only">Light</span>, icon: <Sun aria-hidden /> },
        { value: "dark", label: <span className="sr-only sm:not-sr-only">Dark</span>, icon: <Moon aria-hidden /> },
        { value: "system", label: <span className="sr-only sm:not-sr-only">System</span>, icon: <Monitor aria-hidden /> },
      ]}
    />
  );
}
