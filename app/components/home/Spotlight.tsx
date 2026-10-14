"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { SearchHit } from "@/lib/search";

const EXAMPLES = ["fireball", "owlbear", "grappled", "longsword", "cover", "bard", "potion of healing"];
const TYPE_STYLE: Record<string, string> = {
  Spell: "text-arcane", Creature: "text-danger", Condition: "text-ember", Equipment: "text-gold", Class: "text-emerald", Race: "text-emerald", Feat: "text-emerald", Background: "text-emerald", Rule: "text-muted",
};

/** A command-palette style search that queries the real rules database: spells, creatures, items, conditions and rules. */
export function Spotlight() {
  const router = useRouter();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const [ghost, setGhost] = useState("");

  // a typewriter placeholder while the box is empty
  useEffect(() => {
    if (q) return;
    let i = 0;
    let n = 0;
    let dir = 1;
    const t = setInterval(() => {
      const word = EXAMPLES[i % EXAMPLES.length];
      n += dir;
      setGhost(word.slice(0, n));
      if (n >= word.length + 8) dir = -1;
      if (n <= 0) {
        dir = 1;
        i++;
      }
    }, 110);
    return () => clearInterval(t);
  }, [q]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    const ctl = new AbortController();
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        const json = (await res.json()) as { hits: SearchHit[] };
        setHits(json.hits.slice(0, 8));
        setActive(0);
      } catch {
        /* a newer search replaced this one */
      } finally {
        setBusy(false);
      }
    }, 160);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  const go = (h?: SearchHit) => h && router.push(h.href);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(hits.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") go(hits[active]);
    else if (e.key === "Escape") setQ("");
  };

  return (
    <div className="mx-auto max-w-3xl">
      <motion.div
        className="panel relative overflow-hidden p-0"
        animate={{ boxShadow: ["0 0 0 0 rgba(246,196,69,0)", "0 0 40px 2px rgba(246,196,69,0.28)", "0 0 0 0 rgba(246,196,69,0)"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span aria-hidden className="text-xl text-gold">⌕</span>
          <div className="relative flex-1">
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              role="combobox"
              aria-expanded={hits.length > 0}
              aria-controls={`${id}-list`}
              aria-activedescendant={hits.length ? `${id}-${active}` : undefined}
              aria-label="Search spells, creatures, items, conditions and rules"
              autoComplete="off"
              className="w-full bg-transparent py-2 text-xl text-foreground outline-none"
            />
            {!q && <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-xl text-muted">{ghost}<span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-gold" /></span>}
          </div>
          <kbd className="hidden rounded border border-border px-2 py-0.5 text-xs text-muted sm:inline">Ctrl K anywhere</kbd>
        </div>

        <ul id={`${id}-list`} role="listbox" aria-label="Results" className="max-h-[22rem] overflow-y-auto">
          <AnimatePresence initial={false}>
            {hits.map((h, i) => (
              <motion.li
                key={h.href + h.title}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === active}
                layout
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ type: "spring", stiffness: 260, damping: 24, delay: i * 0.03 }}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(h)}
                className={`flex cursor-pointer items-baseline gap-3 border-l-2 px-4 py-2.5 ${i === active ? "border-goldBright bg-gold/10" : "border-transparent"}`}
              >
                <span className={`w-20 shrink-0 font-display text-[0.65rem] uppercase tracking-[0.16em] ${TYPE_STYLE[h.type] ?? "text-muted"}`}>{h.type}</span>
                <span className="font-semibold">{h.title}</span>
                <span className="truncate text-sm text-muted">{h.subtitle}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {!hits.length && (
          <p className="px-4 py-6 text-center text-muted" role="status">
            {busy ? "Searching the Tome…" : q.trim().length >= 2 ? "Nothing found. Try another word." : "Type two letters to search every spell, creature, item, condition and rule."}
          </p>
        )}
      </motion.div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {EXAMPLES.slice(0, 5).map((w) => (
          <motion.button key={w} type="button" whileHover={{ y: -3, scale: 1.06 }} whileTap={{ scale: 0.94 }} onClick={() => { setQ(w); input.current?.focus(); }} className="rounded-full border border-border px-3 py-1 text-sm text-muted hover:border-gold hover:text-goldBright">
            {w}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
