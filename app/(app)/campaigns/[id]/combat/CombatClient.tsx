"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Input, Select } from "@/app/components/ui/Input";
import {
  addConditionTo, addMonster, addParty, adjustHitPoints, applyFall, attack, createEncounter, endEncounter, endTurn, grappleOrShove, moveCombatant,
  removeCombatant, removeConditionFrom, setEnvironment, signalReady, standFromProne, startEncounter, takeAction, toggleMount, undoLast, takeReaction,
  starve, suffocate, legendaryAction, rechargeAbility,
} from "@/lib/combat/actions";
import type { CombatantView, EncounterView } from "@/lib/combat/view";
import type { Spellbook } from "@/lib/combat/spellList";
import { SpellPanel } from "./SpellPanel";

export type LogLine = { id: number; text: string };
type Props = {
  campaignId: string;
  isDm: boolean;
  encounters: { id: string; name: string; state: string }[];
  view: EncounterView | null;
  log: LogLine[];
  creatures: { index: string; label: string }[];
  spellbooks: Record<string, Spellbook>;
};

const CONDITIONS = ["blinded", "charmed", "deafened", "frightened", "grappled", "incapacitated", "invisible", "paralyzed", "petrified", "poisoned", "prone", "restrained", "stunned", "unconscious"];
const HEALTH_TONE: Record<string, "emerald" | "gold" | "ember" | "crimson" | "neutral"> = { Unhurt: "emerald", Scratched: "emerald", Bloodied: "gold", Wounded: "ember", "Near death": "crimson", Defeated: "neutral" };

export function CombatClient({ campaignId, isDm, encounters, view, log, creatures, spellbooks }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string | null>(null);
  const [aim, setAim] = useState<{ x: number; y: number } | null>(null);
  const [aiming, setAiming] = useState(false);

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
            <Board view={view} selected={selected} onSelect={setSelected} run={run} aim={aim} aiming={aiming} onAim={(x, y) => { setAim({ x, y }); setAiming(false); }} />
          </div>
          <div className="flex flex-col gap-4">
            <Actions view={view} selected={selected} run={run} pending={pending} isDm={isDm} spellbooks={spellbooks} aim={aim} aiming={aiming} setAiming={setAiming} />
            <Card className="p-4">
              <h2 className="eyebrow mb-2">Combat log</h2>
              <CombatLog log={log} />
            </Card>
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center text-muted">{isDm ? "Create an encounter to begin." : "The DM has not started an encounter."}</Card>
      )}
    </div>
  );
}

function CombatLog({ log }: { log: LogLine[] }) {
  const [shown, setShown] = useState(200);
  const visible = log.slice(-shown);
  return log.length === 0 ? <p className="text-sm text-muted">Nothing has happened yet.</p> : (
    <>
      {log.length > shown && (
        <button type="button" className="mb-2 text-sm text-gold underline" onClick={() => setShown((n) => n + 200)}>
          Load earlier ({log.length - shown} hidden)
        </button>
      )}
      <ul className="flex max-h-96 flex-col gap-1.5 overflow-y-auto text-sm" role="log">
        {visible.map((l) => <li key={l.id}>{l.text}</li>)}
      </ul>
    </>
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
          {view.environment.mounted ? " · mounted" : ""}
        </p>
      </div>
      {isDm && (
        <div className="flex flex-wrap gap-2">
          {view.state !== "ACTIVE" && view.state !== "DONE" && <Button disabled={pending} onClick={() => run(() => startEncounter(view.id))}>Roll initiative &amp; start</Button>}
          {view.state !== "DONE" && (
            <>
              <Button variant="secondary" disabled={pending} onClick={() => run(() => setEnvironment(view.id, { underwater: !view.environment.underwater }))}>
                {view.environment.underwater ? "Surface" : "Go underwater"}
              </Button>
              <Button variant="secondary" disabled={pending} onClick={() => run(() => setEnvironment(view.id, { mounted: !view.environment.mounted }))}>
                {view.environment.mounted ? "On foot" : "Mounted fight"}
              </Button>
            </>
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
                {c.buffs.map((b) => <Badge key={b.label} tone="arcane">{b.label}</Badge>)}
                {c.concentrating && <Badge tone="gold">Concentrating: {c.concentrating}</Badge>}
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
function Board({ view, selected, onSelect, run, aim, aiming, onAim }: { view: EncounterView; selected: string | null; onSelect: (id: string) => void; run: Run; aim: { x: number; y: number } | null; aiming: boolean; onAim: (x: number, y: number) => void }) {
  const at = new Map(view.combatants.filter((c) => c.x !== null && c.y !== null).map((c) => [`${c.x},${c.y}`, c]));
  const cols = Math.min(view.gridWidth, 30);
  const rows = Math.min(view.gridHeight, 20);
  const sel = view.combatants.find((c) => c.id === selected);
  const canMove = !!sel && (view.isDm || sel.mine);
  return (
    <Card className="overflow-x-auto p-4">
      <h2 className="eyebrow mb-2">Battlefield <span className="normal-case tracking-normal text-muted">(5 ft squares)</span></h2>
      <div role="group" aria-label="Battle map" className="inline-grid gap-px bg-border" style={{ gridTemplateColumns: `repeat(${cols}, 1.75rem)` }}>
        {Array.from({ length: rows * cols }, (_, i) => {
          const x = i % cols;
          const y = Math.floor(i / cols);
          const c = at.get(`${x},${y}`);
          return (
            <button
              key={i}
              type="button"
              aria-label={c ? c.name : `Square ${x},${y}`}
              title={c?.name}
              onClick={() => (aiming ? onAim(x, y) : c ? onSelect(c.id) : canMove && sel && run(() => moveCombatant(sel.id, x, y)))}
              className={`flex h-7 w-7 items-center justify-center bg-surface text-[0.65rem] font-bold ${c ? (c.kind === "character" ? "text-emerald" : "text-danger") : "text-transparent hover:bg-surface2"} ${c && selected === c.id ? "outline outline-2 outline-goldBright" : ""} ${aim && aim.x === x && aim.y === y ? "bg-arcane/40" : ""} ${c?.defeated ? "line-through opacity-50" : ""}`}
            >
              {c ? c.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() : "·"}
            </button>
          );
        })}
      </div>
      <ul className="mt-2 text-sm" aria-label="Positions on the map">
        {view.combatants.filter((c) => c.x !== null && c.y !== null).map((c) => (
          <li key={c.id}>{c.name} is at square {c.x}, {c.y}{c.defeated ? ", defeated" : ""}</li>
        ))}
      </ul>
    </Card>
  );
}

function Actions({ view, selected, run, pending, isDm, spellbooks, aim, aiming, setAiming }: { view: EncounterView; selected: string | null; run: Run; pending: boolean; isDm: boolean; spellbooks: Record<string, Spellbook>; aim: { x: number; y: number } | null; aiming: boolean; setAiming: (b: boolean) => void }) {
  const me = view.combatants.find((c) => c.id === selected);
  const [target, setTarget] = useState("");
  const [attackName, setAttackName] = useState("");
  const [amount, setAmount] = useState(1);
  const [condition, setCondition] = useState(CONDITIONS[0]);
  const [trigger, setTrigger] = useState("");
  const [advantage, setAdvantage] = useState<"" | "adv" | "dis">("");
  const [smite, setSmite] = useState(0);
  const [sneak, setSneak] = useState(false);

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
            {actor.turn.hasteAction && <Badge tone="gold">Haste action</Badge>}
            {actor.mounted && <Badge tone="gold">Mounted</Badge>}
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
              {actor.characterId && (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <label className="flex items-center gap-2">
                    Smite
                    <Select aria-label="Divine Smite slot" value={smite} onChange={(e) => setSmite(Number(e.target.value))} className="w-auto">
                      <option value={0}>none</option>
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>level {n} slot</option>)}
                    </Select>
                  </label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={sneak} onChange={(e) => setSneak(e.target.checked)} /> Sneak Attack</label>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button disabled={pending || !target} onClick={() => run(() => attack({ attackerId: actor.id, targetId: target, attack: attackName || actor.attacks[0].name, advantage: advantage === "adv", disadvantage: advantage === "dis", smiteSlot: smite || undefined, sneakAttack: sneak }))}>Attack</Button>
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
          {actor.characterId && spellbooks[actor.characterId] && (
            <SpellPanel actor={actor} book={spellbooks[actor.characterId]} others={view.combatants} aim={aim} aiming={aiming} setAiming={setAiming} run={run} pending={pending} />
          )}
          <div className="flex flex-wrap gap-2">
            {(["dash", "disengage", "dodge", "help", "hide", "search", "use-object"] as const).map((a) => (
              <Button key={a} variant="secondary" className="px-3" disabled={pending || !actor.active} onClick={() => run(() => takeAction(actor.id, a))}>{a.replace("-", " ")}</Button>
            ))}
            <Button variant="secondary" className="px-3" disabled={pending} onClick={() => run(() => standFromProne(actor.id))}>Stand up</Button>
            <Button variant="secondary" className="px-3" disabled={pending} onClick={() => run(() => toggleMount(actor.id))}>{actor.mounted ? "Dismount" : "Mount"}</Button>
          </div>
          {actor.recharge.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {actor.recharge.map((a) => (
                <Button key={a.name} variant="secondary" disabled={pending || !a.ready} onClick={() => run(() => rechargeAbility(actor.id, a.name, target || undefined))}>
                  {a.name}{a.ready ? "" : " (spent)"}
                </Button>
              ))}
            </div>
          )}
          {view.isDm && actor.legendary && !actor.active && (
            <div className="flex flex-wrap gap-2">
              <Badge>Legendary {actor.legendary.left}/{actor.legendary.max}</Badge>
              <Button variant="secondary" disabled={pending || actor.legendary.left < 1} onClick={() => run(() => legendaryAction(actor.id))}>Legendary action</Button>
              {actor.legendary.options.map((o) => (
                <Button key={o.name} variant="secondary" disabled={pending || actor.legendary!.left < o.cost} onClick={() => run(() => legendaryAction(actor.id, o.name))}>{o.name} ({o.cost})</Button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input placeholder="Ready: trigger…" value={trigger} onChange={(e) => setTrigger(e.target.value)} aria-label="Readied trigger" />
            <Button variant="secondary" disabled={pending || !actor.active || !trigger.trim()} onClick={() => run(() => takeAction(actor.id, "ready", trigger), () => setTrigger(""))}>Ready</Button>
          </div>
          {actor.readied && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
              Readied: {actor.readied}
              {view.isDm && <Button variant="secondary" className="px-3" disabled={pending} onClick={() => run(() => signalReady(actor.id))}>Trigger fired</Button>}
            </p>
          )}
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
            <Button variant="secondary" className="px-3" disabled={pending} onClick={() => run(() => applyFall(me.id, amount))}>Fall (ft)</Button>
            <Button variant="secondary" className="px-3" disabled={pending} onClick={() => run(() => suffocate(me.id))}>Suffocate</Button>
            <Button variant="secondary" className="px-3" disabled={pending} onClick={() => run(() => starve(me.id))}>Starve</Button>
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
