"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { GiSpellBook } from "react-icons/gi";
import { schoolStyle } from "@/app/components/icons";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { CASTER_KIND, type SpellLimits, type SpellSelection } from "@/engine/classes/spellcasting";
import { adjustSlot, castSpell, endConcentration, saveSpellSelection } from "@/lib/characters/playActions";
import type { SlotView } from "@/lib/characters/play";

export type SpellOption = { index: string; name: string; level: number; school: string; ritual: boolean; concentration: boolean; classes: string[] };

export type CasterView = {
  classIndex: string;
  className: string;
  level: number;
  limits: SpellLimits;
  maxSpellLevel: number;
  selection: SpellSelection;
  /** spells on this class's list up to the level it can cast */
  options: SpellOption[];
};

const titleCase = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function SpellsPanel({
  id,
  casters,
  slots,
  pact,
  concentration,
}: {
  id: string;
  casters: CasterView[];
  slots: SlotView[];
  pact: { slots: number; slotLevel: number; used: number } | null;
  concentration: { spell: string; name: string } | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; errors?: string[]; message?: string }>) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setError("");
        setMessage(r.message ?? "");
        setEditing(null);
        router.refresh();
      } else {
        setMessage("");
        setError(r.errors?.[0] ?? "Something went wrong");
      }
    });
  }

  return (
    <Card className="no-print flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg uppercase tracking-[0.12em] text-goldBright">
          <GiSpellBook /> Spellcasting
        </h2>
        {concentration && (
          <div className="flex items-center gap-2">
            <Badge tone="gold">Concentrating: {concentration.name}</Badge>
            <Button variant="ghost" className="min-h-8 px-2 text-[0.65rem]" disabled={pending} onClick={() => run(() => endConcentration(id))}>
              End
            </Button>
          </div>
        )}
      </div>

      {(slots.length > 0 || pact) && (
        <div className="flex flex-wrap gap-4">
          {slots.map((s) => (
            <SlotRow key={s.level} label={`Level ${s.level}`} total={s.total} used={s.used} disabled={pending} onSpend={() => run(() => adjustSlot(id, s.level, 1))} onRestore={() => run(() => adjustSlot(id, s.level, -1))} />
          ))}
          {pact && (
            <SlotRow label={`Pact (level ${pact.slotLevel})`} total={pact.slots} used={pact.used} disabled={pending} onSpend={() => run(() => adjustSlot(id, pact.slotLevel, 1, true))} onRestore={() => run(() => adjustSlot(id, pact.slotLevel, -1, true))} />
          )}
        </div>
      )}

      {casters.map((c) => (
        <CasterSection
          key={c.classIndex}
          caster={c}
          editing={editing === c.classIndex}
          onEdit={() => setEditing(editing === c.classIndex ? null : c.classIndex)}
          pending={pending}
          hasPact={!!pact && c.classIndex === "warlock"}
          slots={slots}
          onCast={(index, opts) => run(() => castSpell(id, index, opts))}
          onSave={(sel) => run(() => saveSpellSelection(id, c.classIndex, sel))}
        />
      ))}

      {message && <p className="rounded border border-emerald/50 bg-emerald/10 px-3 py-2 text-sm text-emerald">{message}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
    </Card>
  );
}

function SlotRow({ label, total, used, onSpend, onRestore, disabled }: { label: string; total: number; used: number; onSpend: () => void; onRestore: () => void; disabled: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="rune-label">{label}</span>
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" className="min-h-7 px-1.5" disabled={disabled || used === 0} onClick={onRestore} aria-label={`Restore a ${label} slot`}>
          −
        </Button>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-4 w-4 rotate-45 border ${i < total - used ? "border-goldBright bg-gold shadow-[0_0_8px_rgba(239,205,111,0.5)]" : "border-border"}`} />
        ))}
        <Button variant="ghost" className="min-h-7 px-1.5" disabled={disabled || used >= total} onClick={onSpend} aria-label={`Expend a ${label} slot`}>
          +
        </Button>
      </div>
    </div>
  );
}

function CasterSection({
  caster,
  editing,
  onEdit,
  pending,
  hasPact,
  slots,
  onCast,
  onSave,
}: {
  caster: CasterView;
  editing: boolean;
  onEdit: () => void;
  pending: boolean;
  hasPact: boolean;
  slots: SlotView[];
  onCast: (index: string, opts?: { slotLevel?: number; pact?: boolean; ritual?: boolean }) => void;
  onSave: (sel: SpellSelection) => void;
}) {
  const kind = CASTER_KIND[caster.classIndex];
  const [sel, setSel] = useState<SpellSelection>(caster.selection);
  const [upcast, setUpcast] = useState<Record<string, number>>({});
  const pool = kind === "known" ? sel.known : sel.prepared;
  const key = kind === "known" ? "known" : "prepared";
  const isWizard = caster.classIndex === "wizard";

  const byIndex = useMemo(() => new Map(caster.options.map((o) => [o.index, o])), [caster.options]);
  const have = (kind === "known" ? caster.selection.known : caster.selection.prepared).map((i) => byIndex.get(i)).filter(Boolean) as SpellOption[];
  const cantrips = pool.filter((i) => byIndex.get(i)?.level === 0).length;
  const leveled = pool.length - cantrips;

  const toggle = (list: "known" | "prepared" | "spellbook", index: string) =>
    setSel((s) => ({ ...s, [list]: s[list].includes(index) ? s[list].filter((x) => x !== index) : [...s[list], index] }));

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display uppercase tracking-[0.12em]">
          {caster.className} <span className="text-sm normal-case tracking-normal text-muted">(level {caster.level})</span>
        </h3>
        <Button variant="secondary" className="min-h-8 px-3 text-[0.65rem]" onClick={onEdit}>
          {editing ? "Cancel" : kind === "known" ? "Choose spells known" : "Prepare spells"}
        </Button>
      </div>

      {!editing && have.length === 0 && <p className="text-sm text-muted">No spells chosen yet.</p>}

      {!editing && (
        <ul className="flex flex-col divide-y divide-borderSoft">
          {have
            .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
            .map((s) => {
              const style = schoolStyle(s.school);
              const options = slots.filter((sl) => sl.level >= s.level && sl.total - sl.used > 0);
              return (
                <li key={s.index} className="flex flex-wrap items-center gap-3 py-2">
                  <span className={`w-14 font-display text-xs ${style.text}`}>{s.level === 0 ? "Cantrip" : `Lvl ${s.level}`}</span>
                  <a href={`/wiki/spells/${s.index}`} className="min-w-0 flex-1 truncate hover:text-goldBright">
                    {s.name}
                  </a>
                  {s.concentration && <Badge tone="gold">C</Badge>}
                  {s.level > 0 && options.length > 1 && (
                    <select
                      aria-label={`Slot level for ${s.name}`}
                      value={upcast[s.index] ?? ""}
                      onChange={(e) => setUpcast({ ...upcast, [s.index]: Number(e.target.value) })}
                      className="field min-h-8 w-auto py-0 text-xs"
                    >
                      <option value="">Lowest slot</option>
                      {options.map((o) => (
                        <option key={o.level} value={o.level}>
                          Level {o.level}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button className="min-h-8 px-3 text-[0.65rem]" disabled={pending} onClick={() => onCast(s.index, { slotLevel: upcast[s.index] || undefined })}>
                    Cast
                  </Button>
                  {hasPact && s.level > 0 && (
                    <Button variant="secondary" className="min-h-8 px-3 text-[0.65rem]" disabled={pending} onClick={() => onCast(s.index, { pact: true })}>
                      Pact slot
                    </Button>
                  )}
                  {s.ritual && ["bard", "cleric", "druid", "wizard"].includes(caster.classIndex) && (
                    <Button variant="ghost" className="min-h-8 px-2 text-[0.65rem]" disabled={pending} onClick={() => onCast(s.index, { ritual: true })}>
                      Ritual
                    </Button>
                  )}
                </li>
              );
            })}
        </ul>
      )}

      {editing && (
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            Cantrips {cantrips}/{caster.limits.cantrips} · {kind === "known" ? "Spells known" : "Prepared"} {leveled}/{caster.limits.spells}
            {isWizard && ` · Spellbook ${sel.spellbook.length}/${caster.limits.spellbook}`}
          </p>
          {isWizard && (
            <Picker title="Spellbook" options={caster.options.filter((o) => o.level > 0)} chosen={sel.spellbook} onToggle={(i) => toggle("spellbook", i)} />
          )}
          <Picker
            title={kind === "known" ? "Spells known" : "Prepared spells"}
            options={caster.options.filter((o) => (isWizard ? o.level === 0 || sel.spellbook.includes(o.index) : true))}
            chosen={pool}
            onToggle={(i) => toggle(key, i)}
          />
          <Button disabled={pending} onClick={() => onSave(sel)} className="self-start">
            Save spells
          </Button>
        </div>
      )}
    </div>
  );
}

function Picker({ title, options, chosen, onToggle }: { title: string; options: SpellOption[]; chosen: string[]; onToggle: (i: string) => void }) {
  const levels = [...new Set(options.map((o) => o.level))].sort((a, b) => a - b);
  return (
    <div className="flex flex-col gap-2">
      <p className="rune-label">{title}</p>
      <div className="max-h-72 overflow-y-auto rounded border border-borderSoft p-3">
        {levels.map((l) => (
          <div key={l} className="mb-3">
            <p className="mb-1 font-display text-xs uppercase tracking-[0.14em] text-gold">{l === 0 ? "Cantrips" : `Level ${l}`}</p>
            <div className="flex flex-wrap gap-1.5">
              {options
                .filter((o) => o.level === l)
                .map((o) => (
                  <button
                    type="button"
                    key={o.index}
                    onClick={() => onToggle(o.index)}
                    aria-pressed={chosen.includes(o.index)}
                    className={`rounded-full border px-3 py-1 text-sm transition ${chosen.includes(o.index) ? "border-goldBright bg-gold/20 text-goldBright" : "border-border text-foreground/80 hover:border-gold"}`}
                  >
                    {o.name}
                  </button>
                ))}
            </div>
          </div>
        ))}
        {options.length === 0 && <p className="text-sm text-muted">{titleCase("nothing available")}</p>}
      </div>
    </div>
  );
}
