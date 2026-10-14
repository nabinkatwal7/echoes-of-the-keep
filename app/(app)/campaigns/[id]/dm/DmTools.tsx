"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { SKILLS, type Ability, type Skill } from "@/engine/abilities";
import { LIGHT_SOURCES } from "@/engine/exploration";
import { RESURRECTIONS, encounterDifficulty, type ResurrectionKind } from "@/engine/world";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Input, Select } from "@/app/components/ui/Input";
import { advanceTime, applyHazard, awardMilestone, awardPartyXp, callForCheck, lightSource, partyRest, raiseHero, setInspiration, snuffLight, travel } from "@/lib/world/playActions";

type Out = { ok: boolean; errors?: string[] };
export type DmToolsProps = {
  campaignId: string;
  clock: string;
  timeOfDay: string;
  lights: { id: string; kind: string; remainingMinutes: number; lit: boolean }[];
  heroes: { id: string; name: string; level: number; dead: boolean; inspiration: boolean }[];
  creatures: { index: string; name: string; challenge: string }[];
};

const ABILITY_NAMES: Ability[] = ["str", "dex", "con", "int", "wis", "cha"];

export function DmTools(p: DmToolsProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const run = (fn: () => Promise<Out & { summary?: string; lines?: string[]; note?: string; now?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setMsg({ tone: "ok", text: r.summary ?? r.note ?? r.lines?.join(" · ") ?? "Done" });
        after?.();
        router.refresh();
      } else setMsg({ tone: "err", text: r.errors?.[0] ?? "That did not work" });
    });

  // time and travel
  const [minutes, setMinutes] = useState(10);
  const [miles, setMiles] = useState(12);
  const [pace, setPace] = useState<"slow" | "normal" | "fast">("normal");
  const [terrain, setTerrain] = useState<"road" | "open" | "forest" | "hills" | "mountain" | "swamp" | "difficult">("open");
  const [light, setLight] = useState<keyof typeof LIGHT_SOURCES>("torch");
  // checks
  const [picked, setPicked] = useState<string[]>(p.heroes.map((h) => h.id));
  const [what, setWhat] = useState<string>("skill:perception");
  const [dc, setDc] = useState(12);
  const [mode, setMode] = useState<"normal" | "advantage" | "disadvantage">("normal");
  const [secret, setSecret] = useState(false);
  const [group, setGroup] = useState(false);
  // rewards
  const [xp, setXp] = useState(100);
  // resurrection
  const [rezKind, setRezKind] = useState<ResurrectionKind>("raise-dead");
  const [days, setDays] = useState(1);
  const [rezHero, setRezHero] = useState(p.heroes.find((h) => h.dead)?.id ?? "");
  // hazards
  const [hazard, setHazard] = useState<"fall" | "damage">("fall");
  const [feet, setFeet] = useState(20);
  const [dice, setDice] = useState("2d10");
  const [hazDc, setHazDc] = useState(13);
  const [hazSave, setHazSave] = useState<"" | Ability>("");
  // encounter builder
  const [roster, setRoster] = useState<Record<string, number>>({});
  const [add, setAdd] = useState(p.creatures[0]?.index ?? "");

  const verdict = useMemo(() => {
    const list = Object.entries(roster).flatMap(([idx, n]) => Array.from({ length: n }, () => p.creatures.find((c) => c.index === idx)?.challenge ?? "0"));
    if (!list.length || !p.heroes.length) return null;
    try {
      return encounterDifficulty(list, p.heroes.map((h) => h.level));
    } catch {
      return null;
    }
  }, [roster, p.creatures, p.heroes]);

  const toggle = (id: string) => setPicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="flex flex-col gap-4">
      {msg && <p role={msg.tone === "err" ? "alert" : "status"} className={`rounded border px-3 py-2 text-sm ${msg.tone === "err" ? "border-crimson/60 bg-crimson/10 text-danger" : "border-emerald/50 bg-emerald/10"}`}>{msg.text}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-3 p-4">
          <h2 className="eyebrow">Time and travel</h2>
          <p className="text-lg"><strong>{p.clock}</strong> <Badge>{p.timeOfDay}</Badge></p>
          <div className="flex flex-wrap items-center gap-2">
            {[10, 60, 480].map((m) => <Button key={m} variant="secondary" className="min-h-9 px-3" disabled={pending} onClick={() => run(() => advanceTime(p.campaignId, m))}>{m === 60 ? "+1 hour" : m === 480 ? "+8 hours" : `+${m} min`}</Button>)}
            <Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="w-24" aria-label="Minutes" />
            <Button className="min-h-9 px-3" disabled={pending} onClick={() => run(() => advanceTime(p.campaignId, minutes))}>Pass minutes</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input type="number" min={1} value={miles} onChange={(e) => setMiles(Number(e.target.value))} className="w-24" aria-label="Miles" />
            <Select aria-label="Pace" value={pace} onChange={(e) => setPace(e.target.value as typeof pace)} className="w-auto"><option value="slow">slow</option><option value="normal">normal</option><option value="fast">fast</option></Select>
            <Select aria-label="Terrain" value={terrain} onChange={(e) => setTerrain(e.target.value as typeof terrain)} className="w-auto">
              {["road", "open", "forest", "hills", "mountain", "swamp", "difficult"].map((t) => <option key={t}>{t}</option>)}
            </Select>
            <Button className="min-h-9 px-3" disabled={pending} onClick={() => run(() => travel(p.campaignId, miles, pace, terrain))}>Travel</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={pending} onClick={() => run(() => partyRest(p.campaignId, "short"))}>Party short rest</Button>
            <Button variant="secondary" disabled={pending} onClick={() => confirm("Take a long rest? All heroes recover and 8 hours pass.") && run(() => partyRest(p.campaignId, "long"))}>Party long rest</Button>
          </div>
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <p className="rune-label">Light</p>
            <div className="flex gap-2">
              <Select aria-label="Light source" value={light} onChange={(e) => setLight(e.target.value as keyof typeof LIGHT_SOURCES)} className="w-auto">
                {Object.keys(LIGHT_SOURCES).map((k) => <option key={k} value={k}>{k.replace("-", " ")}</option>)}
              </Select>
              <Button variant="secondary" className="min-h-9 px-3" disabled={pending} onClick={() => run(() => lightSource(p.campaignId, light))}>Light it</Button>
            </div>
            {p.lights.filter((l) => l.lit).map((l) => (
              <div key={l.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{l.kind.replace("-", " ")}: {Math.floor(l.remainingMinutes / 60)}h {l.remainingMinutes % 60}m left</span>
                <Button variant="ghost" className="min-h-8 px-2" disabled={pending} onClick={() => run(() => snuffLight(p.campaignId, l.id))}>Snuff</Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <h2 className="eyebrow">Call for a check</h2>
          <fieldset className="flex flex-wrap gap-3">
            <legend className="rune-label">Who rolls</legend>
            {p.heroes.map((h) => <label key={h.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={picked.includes(h.id)} onChange={() => toggle(h.id)} />{h.name}</label>)}
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Select aria-label="Check" value={what} onChange={(e) => setWhat(e.target.value)} className="w-auto">
              <optgroup label="Skills">{(Object.keys(SKILLS) as Skill[]).map((s) => <option key={s} value={`skill:${s}`}>{s.replace(/-/g, " ")}</option>)}</optgroup>
              <optgroup label="Abilities">{ABILITY_NAMES.map((a) => <option key={a} value={`ability:${a}`}>{a.toUpperCase()}</option>)}</optgroup>
            </Select>
            <Input type="number" min={1} max={40} value={dc} onChange={(e) => setDc(Number(e.target.value))} className="w-20" aria-label="DC" />
            <Select aria-label="Roll mode" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className="w-auto"><option value="normal">normal</option><option value="advantage">advantage</option><option value="disadvantage">disadvantage</option></Select>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={group} onChange={(e) => setGroup(e.target.checked)} /> Group check</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} /> Secret (DM only)</label>
          </div>
          <Button disabled={pending || !picked.length} onClick={() => {
            const [k, v] = what.split(":");
            run(() => callForCheck(p.campaignId, { characterIds: picked, skill: k === "skill" ? (v as Skill) : undefined, ability: k === "ability" ? (v as Ability) : undefined, dc, mode, secret, group }));
          }}>Roll for them</Button>
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <h2 className="eyebrow">Rewards</h2>
          <div className="flex gap-2">
            <Input type="number" min={1} value={xp} onChange={(e) => setXp(Number(e.target.value))} aria-label="XP" className="w-28" />
            <Button className="min-h-9 px-3" disabled={pending} onClick={() => run(() => awardPartyXp(p.campaignId, xp))}>Split XP</Button>
            <Button variant="secondary" className="min-h-9 px-3" disabled={pending} onClick={() => run(() => awardMilestone(p.campaignId))}>Milestone</Button>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            {p.heroes.map((h) => (
              <div key={h.id} className="flex items-center gap-2">
                <span className="flex-1">{h.name} {h.inspiration && <Badge tone="gold">Inspired</Badge>}</span>
                <Button variant="ghost" className="min-h-8 px-2" disabled={pending} onClick={() => run(() => setInspiration(p.campaignId, h.id, !h.inspiration))}>{h.inspiration ? "Take" : "Give"} inspiration</Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <h2 className="eyebrow">Hazards</h2>
          <p className="text-sm text-muted">Applies damage to the heroes ticked under &ldquo;Call for a check&rdquo;.</p>
          <div className="flex flex-wrap items-center gap-2">
            <Select aria-label="Hazard" value={hazard} onChange={(e) => setHazard(e.target.value as "fall" | "damage")} className="w-auto"><option value="fall">Fall</option><option value="damage">Trap or other damage</option></Select>
            {hazard === "fall" ? <Input type="number" min={10} step={10} value={feet} onChange={(e) => setFeet(Number(e.target.value))} aria-label="Feet" className="w-24" /> : <Input value={dice} onChange={(e) => setDice(e.target.value)} aria-label="Damage dice" className="w-28" />}
            {hazard === "damage" && (
              <>
                <Select aria-label="Save" value={hazSave} onChange={(e) => setHazSave(e.target.value as "" | Ability)} className="w-auto"><option value="">no save</option>{ABILITY_NAMES.map((a) => <option key={a} value={a}>{a.toUpperCase()} save</option>)}</Select>
                {hazSave && <Input type="number" min={1} max={30} value={hazDc} onChange={(e) => setHazDc(Number(e.target.value))} aria-label="Save DC" className="w-20" />}
              </>
            )}
          </div>
          <Button variant="danger" disabled={pending || !picked.length} onClick={() => run(() => applyHazard(p.campaignId, { characterIds: picked, kind: hazard, feet, dice, saveAbility: hazSave || undefined, dc: hazSave ? hazDc : undefined }))}>Apply</Button>
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <h2 className="eyebrow">Return from the dead</h2>
          {!p.heroes.some((h) => h.dead) ? <p className="text-sm text-muted">No one has fallen.</p> : (
            <>
              <Select aria-label="Fallen hero" value={rezHero} onChange={(e) => setRezHero(e.target.value)}>
                <option value="">Choose a fallen hero…</option>
                {p.heroes.filter((h) => h.dead).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </Select>
              <Select aria-label="Spell" value={rezKind} onChange={(e) => setRezKind(e.target.value as ResurrectionKind)}>
                {(Object.keys(RESURRECTIONS) as ResurrectionKind[]).map((k) => <option key={k} value={k}>{k.replace("-", " ")} (level {RESURRECTIONS[k].spellLevel}, {RESURRECTIONS[k].componentCostGp} gp)</option>)}
              </Select>
              <p className="text-sm text-muted">{RESURRECTIONS[rezKind].note}</p>
              <label className="flex items-center gap-2 text-sm">Days dead <Input type="number" min={0} step={0.001} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-24" /></label>
              <Button disabled={pending || !rezHero} onClick={() => run(() => raiseHero(p.campaignId, rezHero, rezKind, days))}>Cast it</Button>
            </>
          )}
        </Card>
      </div>

      <Card className="flex flex-col gap-3 p-4">
        <h2 className="eyebrow">Encounter builder</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select aria-label="Creature" value={add} onChange={(e) => setAdd(e.target.value)} className="w-auto">
            {p.creatures.map((c) => <option key={c.index} value={c.index}>{c.name} (CR {c.challenge.split(" ")[0]})</option>)}
          </Select>
          <Button variant="secondary" className="min-h-9 px-3" onClick={() => setRoster({ ...roster, [add]: (roster[add] ?? 0) + 1 })}>Add</Button>
          <Button variant="ghost" className="min-h-9 px-3" onClick={() => setRoster({})}>Clear</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(roster).map(([idx, n]) => (
            <Badge key={idx} tone="arcane">{n} × {p.creatures.find((c) => c.index === idx)?.name}
              <button type="button" aria-label="Remove one" className="ml-1" onClick={() => setRoster({ ...roster, [idx]: n - 1 })}>−</button>
            </Badge>
          ))}
        </div>
        {verdict && (
          <p className="text-sm">
            <Badge tone={verdict.difficulty === "deadly" ? "crimson" : verdict.difficulty === "hard" ? "ember" : verdict.difficulty === "medium" ? "gold" : "emerald"}>{verdict.difficulty}</Badge>{" "}
            {verdict.xp} XP, counted as {verdict.adjustedXp} for the group size. Thresholds for this party: easy {verdict.thresholds.easy}, medium {verdict.thresholds.medium}, hard {verdict.thresholds.hard}, deadly {verdict.thresholds.deadly}. Basic Rules encounter budget.
          </p>
        )}
        {!p.heroes.length && <p className="text-sm text-muted">Attach heroes to see how hard a fight is.</p>}
      </Card>
    </div>
  );
}
