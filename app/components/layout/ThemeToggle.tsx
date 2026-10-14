"use client";

import { useEffect, useState } from "react";

import { parsePref, resolveTheme, THEME_KEY, type ThemePref } from "@/utils/theme";

const ORDER: ThemePref[] = ["system", "light", "dark"];
const LABEL: Record<ThemePref, string> = { system: "Auto", light: "Light", dark: "Dark" };

function readPref(): ThemePref {
  try {
    return parsePref(localStorage.getItem(THEME_KEY));
  } catch {
    return "system";
  }
}

function apply(pref: ThemePref) {
  const theme = resolveTheme(pref, window.matchMedia("(prefers-color-scheme: light)").matches);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f4ead2" : "#0f0b08");
}

function Icon({ pref }: { pref: ThemePref }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (pref === "light")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  if (pref === "dark")
    return (
      <svg {...common}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
    </svg>
  );
}

/** Cycles Auto, Light, Dark. The choice is remembered on this browser; Auto follows the device. */
export function ThemeToggle({ showLabel = false, className = "" }: { showLabel?: boolean; className?: string }) {
  const [pref, setPref] = useState<ThemePref>("system");

  useEffect(() => {
    const p = readPref();
    setPref(p);
    apply(p);
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      if (readPref() === "system") apply("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
  const choose = () => {
    try {
      if (next === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode: the choice just lasts until the page closes */
    }
    setPref(next);
    apply(next);
  };

  return (
    <button
      type="button"
      onClick={choose}
      title={`Theme: ${LABEL[pref]}. Click for ${LABEL[next]}.`}
      aria-label={`Colour theme: ${LABEL[pref]}. Switch to ${LABEL[next]}.`}
      className={`inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded border border-border px-2.5 text-gold transition hover:border-gold hover:text-goldBright ${className}`}
    >
      <Icon pref={pref} />
      {showLabel && <span className="font-display text-xs uppercase tracking-[0.14em]">{LABEL[pref]}</span>}
    </button>
  );
}
