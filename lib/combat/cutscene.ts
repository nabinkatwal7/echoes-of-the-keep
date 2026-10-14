import type { CombatantView, EncounterView, Look } from "./view";

export type Fx = "slash" | "magic" | "fire" | "dark" | "arrow";
export type Actor = { name: string; look: Look; party: boolean };

export type CutsceneEvent =
  | { kind: "start"; party: Actor[]; foes: Actor[]; name: string }
  | { kind: "hit"; attacker: Actor | null; target: Actor; amount: number | null; big: boolean; killed: boolean; fx: Fx }
  | { kind: "heal"; target: Actor; amount: number }
  | { kind: "end"; result: "victory" | "defeat"; party: Actor[]; name: string };

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
export function diffEncounter(prev: EncounterView | null, next: EncounterView | null): CutsceneEvent[] {
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
        events.push({ kind: "hit", attacker, target: actor(after), amount, big: killed || (after.maxHp ? amount >= after.maxHp * 0.4 : false), killed, fx: fxFor(attacker) });
      } else if (after.hp > before.hp && !before.defeated) events.push({ kind: "heal", target: actor(after), amount: after.hp - before.hp });
    } else if (after.health !== before.health && (killed || after.health !== "Unhurt")) {
      // a monster whose numbers the viewer cannot see: show the blow without a figure
      events.push({ kind: "hit", attacker, target: actor(after), amount: null, big: killed, killed, fx: fxFor(attacker) });
    }
  }
  // keep the show short: at most two blows, plus any kill
  const hits = events.filter((e) => e.kind === "hit");
  if (hits.length > 3) {
    const keep = new Set([...hits.filter((e) => e.kind === "hit" && e.killed), ...hits.slice(0, 2)]);
    return events.filter((e) => e.kind !== "hit" || keep.has(e));
  }
  return events;
}
