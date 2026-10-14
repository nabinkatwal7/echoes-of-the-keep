"use client";

import { useEffect, useState } from "react";

const CONTRAST = "dnd-contrast";
const FONT = "dnd-font";

function apply(contrast: boolean, readable: boolean) {
  const root = document.documentElement;
  if (contrast) root.dataset.contrast = "high";
  else delete root.dataset.contrast;
  if (readable) root.dataset.font = "readable";
  else delete root.dataset.font;
}

/** High contrast and a plainer typeface, remembered on this browser. */
export function ReadingOptions() {
  const [contrast, setContrast] = useState(false);
  const [readable, setReadable] = useState(false);

  useEffect(() => {
    const c = localStorage.getItem(CONTRAST) === "high";
    const f = localStorage.getItem(FONT) === "readable";
    setContrast(c);
    setReadable(f);
    apply(c, f);
  }, []);

  const toggle = (which: "contrast" | "font") => {
    const nextContrast = which === "contrast" ? !contrast : contrast;
    const nextFont = which === "font" ? !readable : readable;
    setContrast(nextContrast);
    setReadable(nextFont);
    localStorage.setItem(CONTRAST, nextContrast ? "high" : "");
    localStorage.setItem(FONT, nextFont ? "readable" : "");
    apply(nextContrast, nextFont);
  };

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <button type="button" className="min-h-9 rounded border border-border px-3 text-xs underline hover:text-goldBright" aria-pressed={contrast} onClick={() => toggle("contrast")}>
        {contrast ? "High contrast on" : "High contrast"}
      </button>
      <button type="button" className="min-h-9 rounded border border-border px-3 text-xs underline hover:text-goldBright" aria-pressed={readable} onClick={() => toggle("font")}>
        {readable ? "Plain type on" : "Plain type"}
      </button>
    </div>
  );
}
