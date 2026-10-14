"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SearchHit } from "@/lib/search";

/** Header search button and ⌘K / Ctrl+K command palette over every content type. */
export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 0);
    else {
      setQ("");
      setHits([]);
    }
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { hits: SearchHit[] };
        setHits(data.hits);
        setActive(0);
      } catch {
        // aborted or offline: keep the previous results
      }
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  function go(hit?: SearchHit) {
    if (!hit) return;
    setOpen(false);
    router.push(hit.href);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search the Tome"
        className="flex h-10 min-w-10 items-center justify-center gap-2 rounded border border-border px-2.5 text-sm text-muted transition hover:border-gold hover:text-goldBright"
      >
        <span aria-hidden>⌕</span>
        <span className="hidden 2xl:inline">Search</span>
        <kbd className="hidden rounded border border-border px-1.5 text-[0.65rem] 2xl:inline">Ctrl K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-shade/70 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Search">
          <div className="panel w-full max-w-xl overflow-hidden p-0" onClick={(e) => e.stopPropagation()}>
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(hits.length - 1, a + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(0, a - 1));
                } else if (e.key === "Enter") go(hits[active]);
              }}
              placeholder="Search spells, classes, feats, rules…"
              aria-label="Search"
              className="w-full border-b border-border bg-transparent px-5 py-4 text-lg outline-none placeholder:text-muted/60"
            />
            <ul className="max-h-[50vh] overflow-y-auto" role="listbox">
              {hits.map((h, i) => (
                <li key={`${h.type}-${h.href}-${h.title}`} role="option" aria-selected={i === active}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(h)}
                    className={`flex w-full items-center gap-3 px-5 py-2.5 text-left ${i === active ? "bg-gold/15" : ""}`}
                  >
                    <span className="w-24 shrink-0 font-display text-[0.65rem] uppercase tracking-[0.14em] text-gold">{h.type}</span>
                    <span className="flex-1 truncate">{h.title}</span>
                    <span className="truncate text-xs text-muted">{h.subtitle}</span>
                  </button>
                </li>
              ))}
              {q.trim().length >= 2 && hits.length === 0 && <li className="px-5 py-6 text-center text-muted">Nothing matched &ldquo;{q}&rdquo;.</li>}
              {q.trim().length < 2 && <li className="px-5 py-6 text-center text-sm text-muted">Type at least two letters. Esc closes.</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
