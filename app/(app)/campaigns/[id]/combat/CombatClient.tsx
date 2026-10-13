"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Input, Select } from "@/app/components/ui/Input";
import {
  addConditionTo, addMonster, addParty, adjustHitPoints, attack, createEncounter, endEncounter, endTurn, grappleOrShove, moveCombatant,
  removeCombatant, removeConditionFrom, setEnvironment, standFromProne, startEncounter, takeAction, undoLast, takeReaction,
} from "@/lib/combat/actions";
import type { CombatantView, EncounterView } from "@/lib/combat/view";

export type LogLine = { id: number; text: string };
type Props = {
  campaignId: string;
  isDm: boolean;
  encounters: { id: string; name: string; state: string }[];
  view: EncounterView | null;
  log: LogLine[];
  creatures: { index: string; label: string }[];
};

const CONDITIONS = ["blinded", "charmed", "deafened", "frightened", "grappled", "incapacitated", "invisible", "paralyzed", "petrified", "poisoned", "prone", "restrained", "stunned", "unconscious"];
const HEALTH_TONE: Record<string, "emerald" | "gold" | "ember" | "crimson" | "neutral"> = { Unhurt: "emerald", Scratched: "emerald", Bloodied: "gold", Wounded: "ember", "Near death": "crimson", Defeated: "neutral" };

export function CombatClient({ campaignId, isDm, encounters, view, log, creatures }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string | null>(null);

  // the fight is shared state: refresh from the server every couple of seconds (visibility is filtered server-side)
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 2500);
    return () => clearInterval(t);
  }, [router]);

  function run(fn: () => Promise<{ ok: boolean; errors?: string[]; id?: string }>, after?: (id?: string) => void) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setError("");
        after?.(r.id);
        router.refresh();
      } else setError(r.errors?.[0] ?? "That did not work");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded border border-crimson/60 bg-crimson/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <EncounterPicker campaignId={campaignId} isDm={isDm} encounters={encounters} current={view?.id} run={run} pending={pending} />
      {view ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <div className="flex flex-col gap-4">
            <Header view={view} isDm={isDm} run={run} pending={pending} />
            {isDm && view.state !== "DONE" && <DmSetup view={view} creatures={creatures} run={run} pending={pending} />}
            <Order view={view} selected={selected} onSelect={setSelected} />
            <Board view={view} selected={selected} onSelect={setSelected} run={run} />
          </div>
          <div className="flex flex-col gap-4">
            <Actions view={view} selected={selected} run={run} pending={pending} isDm={isDm} />
            <Card className="p-4">
              <h2 className="eyebrow mb-2">Combat log</h2>
              {log.length === 0 ? <p className="text-sm text-muted">Nothing has happened yet.</p> : (
                <ul className="flex max-h-96 flex-col gap-1.5 overflow-y-auto text-sm" role="log">
                  {log.map((l) => <li key={l.id}>{l.text}</li>)}
                </ul>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center text-muted">{isDm ? "Create an encounter to begin." : "The DM has not started an encounter."}</Card>
      )}
    </div>
  );
}

type Run = (fn: () => Promise<{ ok: boolean; errors?: string[]; id?: string }>, after?: (id?: string) => void) => void;

function EncounterPicker({ campaignId, isDm, encounters, current, run, pending }: { campaignId: string; isDm: boolean; encounters: Props["encounters"]; current?: string; run: Run; pending: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  return (
    <div className="flex flex-wrap items-end gap-3">
      {encounters.length > 1 && (
        <Select aria-label="Encounter" value={current} onChange={(e) => router.push(`/campaigns/${campaignId}/combat?e=${e.target.value}`)} className="w-auto">
          {encounters.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.state.toLowerCase()})</option>)}
        </Select>
      )}
      {isDm && (
        <form
          className="flex gap-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            run(() => createEncounter(campaignId, name), (id) => { setName(""); if (id) router.push(`/campaigns/${campaignId}/combat?e=${id}`); });
          }}
        >
          <Input placeholder="New encounter name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label="New encounter name" />
          <Button type="submit" variant="secondary" disabled={pending || !name.trim()}>Create</Button>
        </form>
      )}
    </div>
  );
}

function Header({ view, isDm, run, pending }: { view: EncounterView; isDm: boolean; run: Run; pending: boolean }) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <h2 className="text-xl font-bold">{view.name}</h2>
        <p className="text-sm text-muted">
          {view.state === "SETUP" ? "Setting up" : view.state === "ACTIVE" ? `Round ${view.round}` : "Finished"}
          {view.environment.underwater ? " · underwater" : ""}
        </p>
      </div>
      {isDm && (
        <div className="flex flex-wrap gap-2">
          {view.state !== "ACTIVE" && view.state !== "DONE" && <Button disabled={pending} onClick={() => run(() => startEncounter(view.id))}>Roll initiative &amp; start</Button>}
          {view.state !== "DONE" && (
            <Button variant="secondary" disabled={pending} onClick={() => run(() => setEnvironment(view.id, { underwater: !view.environment.underwater }))}>
              {view.environment.underwater ? "Surface" : "Go underwater"}
            </Button>
          )}
          <Button variant="secondary" disabled={pending} onClick={() => run(() => undoLast(view.id))}>Undo last</Button>
          {view.state !== "DONE" && (
            <Button variant="danger" disabled={pending} onClick={() => { if (confirm("End the encounter and award XP? This cannot be undone.")) run(() => endEncounter(view.id)); }}>End &amp; award XP</Button>
          )}
        </div>
      )}
    </Card>
  );
}

function DmSetup({ view, creatures, run, pending }: { view: EncounterView; creatures: Props["creatures"]; run: Run; pending: boolean }) {
  const [creature, setCreature] = useState(creatures[0]?.index ?? "");
  const [count, setCount] = useState(1);
  const [hidden, setHidden] = useState(false);
  return (
    <Card className="flex flex-wrap items-end gap-3 p-4">
      <Button variant="secondary" disabled={pending} onClick={() => run(() => addParty(view.id))}>Add party</Button>
      <Select aria-label="Creature" value={creature} onChange={(e) => setCreature(e.target.value)} className="w-auto">
        {creatures.map((c) => <option key={c.index} value={c.index}>{c.label}</option>)}
      </Select>
      <Input type="number" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} aria-label="How many" className="w-20" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} /> Hidden</label>
      <Button disabled={pending || !creature} onClick={() => run(() => addMonster(view.id, creature, count, hidden))}>Add</Button>
    </Card>
  );
}

function Order({ view, selected, onSelect }: { view: EncounterView; selected: string | null; onSelect: (id: string) => void }) {
  return (
    <Card className="p-4">
      <h2 className="eyebrow mb-2">Initiative</h2>
      {view.combatants.length === 0 ? <p className="text-sm text-muted">No one is in this encounter yet.</p> : (
        <ul className="flex flex-col gap-2">
          {view.combatants.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                aria-pressed={selected === c.id}
                className={`flex w-full flex-wrap items-center gap-2 rounded border px-3 py-2 text-left transition ${c.active ? "border-goldBright bg-gold/10" : selected === c.id ? "border-gold/70" : "border-border"} ${c.defeated ? "opacity-55" : ""}`}
              >
                <span className="w-8 text-center font-display text-lg text-goldBright">{c.initiative ?? "–"}</span>
                <span className="flex-1 font-semibold">{c.name}{c.active ? " ◀" : ""}</span>
                {c.hp !== null ? <Badge tone="neutral">{c.hp}/{c.maxHp}{c.tempHp ? ` +${c.tempHp}` : ""} HP</Badge> : <Badge tone={HEALTH_TONE[c.health] ?? "neutral"}>{c.health}</Badge>}
                {c.ac !== null && <Badge>AC {c.ac}</Badge>}
                {c.hidden && <Badge tone="arcane">Hidden</Badge>}
                {c.surprised && <Badge tone="ember">Surprised</Badge>}
                {c.conditions.map((k) => <Badge key={k.condition} tone="crimson">{k.condition}{k.rounds ? ` ${k.rounds}` : ""}</Badge>)}
                {c.deathSaves && (c.deathSaves.successes > 0 || c.deathSaves.failures > 0) && <Badge>Saves ✓{c.deathSaves.successes} ✗{c.deathSaves.failures}</Badge>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** A simple grid: tap a creature to select it, tap an empty square to move the selected creature there. */
function Board({ view, selected, onSelect, run }: { view: EncounterView; selected: string | null; onSelect: (id: string) => void; run: Run }) {
  const at = new Map(view.combatants.filter((c) => c.x !== null && c.y !== null).map((c) => [`${c.x},${c.y}`, c]));
  const cols = Math.min(view.gridWidth, 30);
  const rows = Math.min(view.gridHeight, 20);
  const sel = view.combatants.find((c) => c.id === selected);
  const canMove = !!sel && (view.isDm || sel.mine);
  return (
    <Card className="overflow-x-auto p-4">
      <h2 className="eyebrow mb-2">Battlefield <span className="normal-case tracking-normal text-muted">(5 ft squares)</span></h2>
      <div role="grid" aria-label="Battle map" className="inline-grid gap-px bg-border" style={{ gridTemplateColumns: `repeat(${cols}, 1.75rem)` }}>
        {Array.from({ length: rows * cols }, (_, i) => {
          const x = i % cols;
          const y = Math.floor(i / cols);
          const c = at.get(`${x},${y}`);
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              aria-label={c ? c.name : `Square ${x},${y}`}
              title={c?.name}
              onClick={() => (c ? onSelect(c.id) : canMove && sel && run(() => moveCombatant(sel.id, x, y)))}
              className={`flex h-7 w-7 items-center justify-center bg-surface text-[0.65rem] font-bold ${c ? (c.kind === "character" ? "text-emerald" : "text-danger") : "text-transparent hover:bg-surface2"} ${c && selected === c.id ? "outline outline-2 outline-goldBright" : ""} ${c?.defeated ? "line-through opacity-50" : ""}`}
            >
              {c ? c.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() : "·"}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function Actions({ view, selected, run, pending, isDm }: { view: EncounterView; selected: string | null; run: Run; pending: boolean; isDm: boolean }) {
  const me = view.combatants.find((c) => c.id === selected);
  const [target, setTarget] = useState("");
  const [attackName, setAttackName] = useState("");
  const [amount, setAmount] = useState(1);
  const [condition, setCondition] = useState(CONDITIONS[0]);
  const [trigger, setTrigger] = useState("");
  const [advantage, setAdvantage] = useState<"" | "adv" | "dis">("");

  if (view.state === "DONE") return null;
  const mineActive = view.combatants.find((c) => c.active && (isDm || c.mine));
  const actor: CombatantView | undefined = me && me.turn ? me : mineActive;
  const foes = view.combatants.filter((c) => c.id !== actor?.id && !c.defeated);

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="eyebrow">{actor ? `${actor.name}` : "Actions"}</h2>
      {view.state !== "ACTIVE" && <p className="text-sm text-muted">Actions open once combat starts.</p>}
      {view.state === "ACTIVE" && !actor && <p className="text-sm text-muted">{view.combatants.some((c) => c.mine) ? "Waiting for your turn. Select your hero to use a reaction." : "Select a creature."}</p>}
      {view.state === "ACTIVE" && actor?.turn && (
        <>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge tone={actor.turn.action ? "emerald" : "neutral"}>Action</Badge>
            <Badge tone={actor.turn.bonusAction ? "emerald" : "neutral"}>Bonus</Badge>
            <Badge tone={actor.turn.reaction ? "emerald" : "neutral"}>Reaction</Badge>
            <Badge>{actor.turn.movement} ft</Badge>
            {actor.turn.attacksRemaining > 0 && <Badge tone="gold">{actor.turn.attacksRemaining} attacks left</Badge>}
          </div>
          {actor.attacks.length > 0 && (
            <div className="flex flex-col gap-2">
              <Select aria-label="Attack" value={attackName || actor.attacks[0].name} onChange={(e) => setAttackName(e.target.value)}>
                {actor.attacks.map((a) => <option key={a.name}>{a.name}</option>)}
              </Select>
              <Select aria-label="Target" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">Choose a target…</option>
                {foes.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
              <Select aria-label="Roll with" value={advantage} onChange={(e) => setAdvantage(e.target.value as "" | "adv" | "dis")}>
                <option value="">Normal roll</option>
                <option value="adv">Advantage (extra source)</option>
                <option value="dis">Disadvantage (extra source)</option>
              </Select>
              <div className="flex flex-wrap gap-2">
                <Button disabled={pending || !target} onClick={() => run(() => attack({ attackerId: actor.id, targetId: target, attack: attackName || actor.attacks[0].name, advantage: advantage === "adv", disadvantage: advantage === "dis" }))}>Attack</Button>
                <Button variant="secondary" disabled={pending || !target} onClick={() => run(() => attack({ attackerId: actor.id, targetId: target, attack: attackName || actor.attacks[0].name, offHand: true, advantage: advantage === "adv", disadvantage: advantage === "dis" }))}>Off-hand</Button>
                <Button variant="secondary" disabled={pending || !target} onClick={() => run(() => attack({ attackerId: actor.id, targetId: target, attack: attackName || actor.attacks[0].name, reaction: true }))}>Opportunity</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" disabled={pending || !target} onClick={() => run(() => grappleOrShove(actor.id, target, "grapple"))}>Grapple</Button>
                <Button variant="secondary" disabled={pending || !target} onClick={() => run(() => grappleOrShove(actor.id, target, "shove-prone"))}>Shove prone</Button>
                <Button variant="secondary" disabled={pending || !target} onClick={() => run(() => grappleOrShove(actor.id, target, "shove-push"))}>Push</Button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {(["dash", "disengage", "dodge", "help", "hide", "search", "use-object"] as const).map((a) => (
              <Button key={a} variant="secondary" className="px-3" disabled={pending || !actor.active} onClick={() => run(() => takeAction(actor.id, a))}>{a.replace("-", " ")}</Button>
            ))}
            <Button variant="secondary" className="px-3" disabled={pending} onClick={() => run(() => standFromProne(actor.id))}>Stand up</Button>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Ready: trigger…" value={trigger} onChange={(e) => setTrigger(e.target.value)} aria-label="Readied trigger" />
            <Button variant="secondary" disabled={pending || !actor.active || !trigger.trim()} onClick={() => run(() => takeAction(actor.id, "ready", trigger), () => setTrigger(""))}>Ready</Button>
          </div>
          {actor.readied && <p className="text-sm text-muted">Readied: {actor.readied}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={pending || !actor.turn.reaction} onClick={() => run(() => takeReaction(actor.id))}>Use reaction</Button>
            {actor.active && <Button disabled={pending} onClick={() => run(() => endTurn(view.id))}>End turn</Button>}
          </div>
        </>
      )}
      {isDm && me && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <p className="rune-label">DM controls for {me.name}</p>
          <div className="flex gap-2">
            <Input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} aria-label="Amount" className="w-20" />
            <Button variant="danger" className="px-3" disabled={pending} onClick={() => run(() => adjustHitPoints(me.id, "damage", amount))}>Damage</Button>
            <Button variant="secondary" className="px-3" disabled={pending} onClick={() => run(() => adjustHitPoints(me.id, "heal", amount))}>Heal</Button>
            <Button variant="secondary" className="px-3" disabled={pending} onClick={() => run(() => adjustHitPoints(me.id, "temp", amount))}>Temp</Button>
          </div>
          <div className="flex gap-2">
            <Select aria-label="Condition" value={condition} onChange={(e) => setCondition(e.target.value)}>
              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </Select>
            <Button variant="secondary" className="px-3" disabled={pending} onClick={() => run(() => addConditionTo(me.id, condition))}>Add</Button>
            <Button variant="ghost" className="px-3" disabled={pending} onClick={() => run(() => removeConditionFrom(me.id, condition))}>Clear</Button>
          </div>
          <Button variant="ghost" disabled={pending} onClick={() => run(() => removeCombatant(me.id))}>Remove from encounter</Button>
        </div>
      )}
    </Card>
  );
}
