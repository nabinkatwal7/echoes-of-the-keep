import type { CombatantView, EncounterView, Look } from "./view";

export type Fx = "slash" | "magic" | "fire" | "dark" | "arrow" | "lightning" | "frost" | "radiant" | "poison";
export type Actor = { name: string; look: Look; party: boolean };

export type CutsceneEvent =
  | { kind: "start"; party: Actor[]; foes: Actor[]; name: string }
  | { kind: "hit"; attacker: Actor | null; target: Actor; amount: number | null; big: boolean; killed: boolean; fx: Fx; spell?: string; crit?: boolean }
  | { kind: "condition"; target: Actor; condition: string }
  | { kind: "heal"; target: Actor; amount: number }
  | { kind: "end"; result: "victory" | "defeat"; party: Actor[]; name: string };

/** What the newest combat log lines say about how the blow was made. */
export type LogHints = { spell?: string; critical?: boolean };

const SPELL_FX: [RegExp, Fx][] = [
  [/lightning|shock|thunder|storm|call lightning/i, "lightning"],
  [/frost|cold|ice|chill|frozen|sleet|snow|freez/i, "frost"],
  [/fire|flame|burn|scorch|blaze|inferno|meteor|sunbeam/i, "fire"],
  [/radiant|sacred|guiding|smite|daylight|spirit guardians|holy|sun|dawn/i, "radiant"],
  [/poison|acid|stinking|cloud|venom|vitriol/i, "poison"],
  [/necrotic|vampiric|blight|inflict|toll|harm|bane|hex|curse/i, "dark"],
];

/** The visual style for a named spell, or null when it is just "magic". */
export function fxForSpell(name: string): Fx {
  return SPELL_FX.find(([re]) => re.test(name))?.[1] ?? "magic";
}

/** Reads the spell name and any critical hit out of the log lines written since the last snapshot. */
export function hintsFromLog(lines: string[]): LogHints {
  const hints: LogHints = {};
  for (const l of lines) {
    const m = /casts (.+?)(?: at level \d+)?(?:[.:,]| on | against | at |$)/i.exec(l);
    if (m && !hints.spell) hints.spell = m[1].trim();
    if (/CRITICAL HIT/i.test(l)) hints.critical = true;
  }
  return hints;
}

const actor = (c: CombatantView): Actor => ({ name: c.name, look: c.look, party: c.kind === "character" });

/** How an attacker's blow looks: casters throw magic, rangers shoot, dragons breathe fire, the dead strike with shadow. */
export function fxFor(a: Actor | null): Fx {
  if (!a) return "slash";
  const t = a.look.type.toLowerCase();
  if (a.look.k === "hero") {
    if (["wizard", "sorcerer", "warlock", "cleric", "druid"].includes(t)) return "magic";
    if (t === "ranger") return "arrow";
    return "slash";
  }
  if (t.includes("dragon") || t.includes("elemental")) return "fire";
  if (t.includes("undead") || t.includes("fiend") || t.includes("aberration")) return "dark";
  return "slash";
}

const standing = (c: CombatantView) => !c.defeated && (c.hp === null || c.hp > 0);

/**
 * Works out what a viewer should be shown between two snapshots of one fight: the start of the battle, each hit or heal, and the
 * end. It only reads what the viewer is already allowed to see, so players never learn a monster's hit points from a cutscene.
 */
export function diffEncounter(prev: EncounterView | null, next: EncounterView | null, hints: LogHints = {}): CutsceneEvent[] {
  if (!prev || !next || prev.id !== next.id) return [];
  const party = (v: EncounterView) => v.combatants.filter((c) => c.kind === "character").map(actor);
  const foes = (v: EncounterView) => v.combatants.filter((c) => c.kind !== "character").map(actor);

  if (prev.state !== "ACTIVE" && prev.state !== "DONE" && next.state === "ACTIVE") return [{ kind: "start", party: party(next), foes: foes(next), name: next.name }];
  if (prev.state === "ACTIVE" && next.state === "DONE") {
    const won = next.combatants.some((c) => c.kind === "character" && standing(c));
    return [{ kind: "end", result: won ? "victory" : "defeat", party: party(next), name: next.name }];
  }
  if (next.state !== "ACTIVE") return [];

  const attackerRow = prev.combatants.find((c) => c.active);
  const attacker = attackerRow ? actor(attackerRow) : null;
  const events: CutsceneEvent[] = [];
  for (const after of next.combatants) {
    const before = prev.combatants.find((c) => c.id === after.id);
    if (!before) continue;
    const killed = after.defeated && !before.defeated;
    if (before.hp !== null && after.hp !== null) {
      if (after.hp < before.hp) {
        const amount = before.hp - after.hp;
        events.push({ kind: "hit", attacker, target: actor(after), amount, big: killed || !!hints.critical || (after.maxHp ? amount >= after.maxHp * 0.4 : false), killed, fx: hints.spell ? fxForSpell(hints.spell) : fxFor(attacker), spell: hints.spell, crit: hints.critical });
      } else if (after.hp > before.hp && !before.defeated) events.push({ kind: "heal", target: actor(after), amount: after.hp - before.hp });
    } else if (after.health !== before.health && (killed || after.health !== "Unhurt")) {
      // a monster whose numbers the viewer cannot see: show the blow without a figure
      events.push({ kind: "hit", attacker, target: actor(after), amount: null, big: killed || !!hints.critical, killed, fx: hints.spell ? fxForSpell(hints.spell) : fxFor(attacker), spell: hints.spell, crit: hints.critical });
    }
    const gained = after.conditions.filter((c) => !before.conditions.some((b) => b.condition === c.condition));
    if (gained.length && !killed) events.push({ kind: "condition", target: actor(after), condition: gained[0].condition });
  }
  // keep the show short: at most two blows, plus any kill
  const hits = events.filter((e) => e.kind === "hit");
  if (events.length > 4) {
    const trimmed: CutsceneEvent[] = [...events.filter((e) => e.kind === "condition").slice(0, 1), ...hits.slice(0, 2), ...hits.filter((e) => e.kind === "hit" && e.killed)];
    return [...new Set(trimmed)].slice(0, 4);
  }
  if (hits.length > 3) {
    const keep = new Set([...hits.filter((e) => e.kind === "hit" && e.killed), ...hits.slice(0, 2)]);
    return events.filter((e) => e.kind !== "hit" || keep.has(e));
  }
  return events;
}
