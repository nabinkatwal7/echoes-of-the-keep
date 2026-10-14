"use client";

import { useState } from "react";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Select } from "@/app/components/ui/Input";
import { castCounterspell, castInCombat, endCombatConcentration } from "@/lib/combat/spellActions";
import type { Spellbook } from "@/lib/combat/spellList";
import type { CombatantView } from "@/lib/combat/view";

type Run = (fn: () => Promise<{ ok: boolean; errors?: string[]; id?: string }>, after?: (id?: string) => void) => void;

/** Spell browser for a hero in combat: what they can cast now, what it does, and a way to aim it. */
export function SpellPanel({
  actor, book, others, aim, aiming, setAiming, run, pending,
}: {
  actor: CombatantView;
  book: Spellbook;
  others: CombatantView[];
  aim: { x: number; y: number } | null;
  aiming: boolean;
  setAiming: (b: boolean) => void;
  run: Run;
  pending: boolean;
}) {
  const [index, setIndex] = useState("");
  const [targets, setTargets] = useState<string[]>([]);
  const [slot, setSlot] = useState(0);
  const [pact, setPact] = useState(false);
  const [filter, setFilter] = useState<"castable" | "all">("castable");
  const [metamagic, setMetamagic] = useState("");

  const spell = book.spells.find((s) => s.index === index);
  const canCast = (s: Spellbook["spells"][number]) => {
    if (s.time === "long") return false;
    if (s.level === 0) return true;
    return book.slots.some((x) => x.level >= s.level && x.left > 0) || (!!book.pact && book.pact.left > 0 && book.pact.slotLevel >= s.level);
  };
  const list = book.spells.filter((s) => filter === "all" || canCast(s));
  const slotOptions = spell && spell.level > 0 ? book.slots.filter((x) => x.level >= spell.level && x.left > 0) : [];
  const timeText = (t: string) => (t === "bonus" ? "bonus action" : t);

  const cast = () => {
    if (!spell) return;
    run(
      () => castInCombat({ casterId: actor.id, spell: spell.index, slotLevel: pact ? book.pact?.slotLevel : slot || slotOptions[0]?.level, pact, targetIds: targets, point: aim ?? undefined, metamagic: metamagic || undefined }),
      () => {
        setTargets([]);
        setAiming(false);
      },
    );
  };

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex items-center justify-between">
        <p className="rune-label">Spells</p>
        <div className="flex gap-1 text-xs">
          <Button variant={filter === "castable" ? "primary" : "ghost"} className="min-h-8 px-2" onClick={() => setFilter("castable")}>Castable</Button>
          <Button variant={filter === "all" ? "primary" : "ghost"} className="min-h-8 px-2" onClick={() => setFilter("all")}>All</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 text-xs">
        {book.slots.map((s) => <Badge key={s.level} tone={s.left ? "arcane" : "neutral"}>L{s.level}: {s.left}</Badge>)}
        {book.pact && <Badge tone="arcane">Pact L{book.pact.slotLevel}: {book.pact.left}</Badge>}
      </div>
      <Select aria-label="Spell" value={index} onChange={(e) => { setIndex(e.target.value); setTargets([]); setSlot(0); setPact(false); setAiming(false); }}>
        <option value="">Choose a spell…</option>
        {list.map((s) => <option key={s.index} value={s.index}>{s.level === 0 ? "Cantrip" : `L${s.level}`} · {s.name} ({timeText(s.time)})</option>)}
      </Select>
      {spell && (
        <div className="flex flex-col gap-2 rounded border border-border p-2 text-sm">
          <p className="text-muted">{spell.summary}{spell.concentration ? " · concentration" : ""}</p>
          <Select aria-label="Metamagic" value={metamagic} onChange={(e) => setMetamagic(e.target.value)}>
            <option value="">No metamagic</option>
            {["careful", "distant", "empowered", "extended", "heightened", "quickened", "subtle", "twinned"].map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          {spell.level > 0 && (slotOptions.length > 0 || (book.pact && book.pact.left > 0)) && (
            <Select aria-label="Spell slot" value={pact ? "pact" : String(slot || slotOptions[0]?.level || "")} onChange={(e) => { if (e.target.value === "pact") setPact(true); else { setPact(false); setSlot(Number(e.target.value)); } }}>
              {slotOptions.map((s) => <option key={s.level} value={s.level}>Level {s.level} slot ({s.left} left)</option>)}
              {book.pact && book.pact.left > 0 && book.pact.slotLevel >= spell.level && <option value="pact">Pact slot (level {book.pact.slotLevel})</option>}
            </Select>
          )}
          {spell.aim === "targets" && (
            <fieldset className="flex flex-col gap-1">
              <legend className="rune-label">Targets{spell.maxTargets > 1 ? ` (up to ${spell.maxTargets})` : ""}</legend>
              {others.filter((o) => !o.defeated || spell.delivery === "heal").map((o) => (
                <label key={o.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={targets.includes(o.id)}
                    onChange={(e) => setTargets(e.target.checked ? [...targets, o.id] : targets.filter((t) => t !== o.id))}
                  />
                  {o.name}
                </label>
              ))}
            </fieldset>
          )}
          {spell.aim === "point" && (
            <div className="flex items-center gap-2">
              <Button variant={aiming ? "primary" : "secondary"} className="px-3" onClick={() => setAiming(!aiming)}>{aiming ? "Click the map…" : "Aim on map"}</Button>
              <span className="text-muted">{aim ? `Square ${aim.x},${aim.y}` : "No point chosen"}</span>
            </div>
          )}
          <Button disabled={pending || (spell.aim === "targets" && !targets.length) || (spell.aim === "point" && !aim) || !canCast(spell)} onClick={cast}>
            Cast {spell.name}
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {actor.concentrating && <Button variant="ghost" className="min-h-9 px-2" disabled={pending} onClick={() => run(() => endCombatConcentration(actor.id))}>Drop concentration ({actor.concentrating})</Button>}
        {book.spells.some((s) => s.index === "counterspell") && (
          <Button
            variant="secondary"
            className="min-h-9 px-3"
            disabled={pending || !actor.turn?.reaction}
            onClick={() => {
              const lvl = Number(prompt("Level of the spell being cast (1-9)?"));
              const slotLvl = Number(prompt("Counterspell slot level (3-9)?", "3"));
              if (lvl && slotLvl) run(() => castCounterspell(actor.id, slotLvl, lvl));
            }}
          >
            Counterspell
          </Button>
        )}
      </div>
    </div>
  );
}
