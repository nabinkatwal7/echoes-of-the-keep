"use client";

import { useRef, useState } from "react";
import { D20 } from "./ui/D20";

/** Big decorative d20 on the home page. Click (or press Enter) to roll it. */
export function HeroDie() {
  const [value, setValue] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function roll() {
    if (rolling) return;
    setRolling(true);
    let ticks = 0;
    const step = () => {
      setValue(Math.floor(Math.random() * 20) + 1);
      ticks++;
      if (ticks < 12) timer.current = setTimeout(step, 50 + ticks * 12);
      else setRolling(false);
    };
    step();
  }

  const crit = !rolling && value === 20;
  const fumble = !rolling && value === 1;

  return (
    <button
      onClick={roll}
      aria-label="Roll a d20"
      className="group relative flex h-64 w-64 items-center justify-center text-gold outline-offset-8 sm:h-80 sm:w-80"
    >
      <span className="absolute inset-6 rounded-full bg-gold/10 blur-3xl transition group-hover:bg-gold/20" />
      <D20 className={`relative h-full w-full drop-shadow-[0_0_28px_rgba(201,162,75,0.45)] transition-transform duration-500 ${rolling ? "animate-spin" : "group-hover:rotate-12"}`} />
      <span
        className={`absolute font-display text-6xl font-bold sm:text-7xl ${crit ? "text-goldBright" : fumble ? "text-danger" : "text-foreground"}`}
        aria-live="polite"
      >
        {value ?? "20"}
      </span>
      <span className="eyebrow absolute -bottom-6 whitespace-nowrap opacity-80">
        {value === null ? "Click to roll" : crit ? "Natural 20!" : fumble ? "Critical failure" : "Roll again"}
      </span>
    </button>
  );
}
