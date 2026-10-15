import { describe, expect, it } from "vitest";
import { diffEncounter, fxFor, fxForSpell, hintsFromLog } from "./cutscene";
import type { CombatantView, EncounterView } from "./view";

const c = (id: string, over: Partial<CombatantView> = {}): CombatantView =>
  ({
    id, kind: "character", name: id, initiative: 10, active: false, hp: 20, maxHp: 20, tempHp: 0, health: "Unhurt", ac: 12, conditions: [], buffs: [], defeated: false, concentrating: null,
    hidden: false, surprised: false, x: 0, y: 0, mine: false, characterId: null, turn: null, attacks: [], readied: null, recharge: [], legendary: null, look: { k: "hero", type: "fighter" }, mounted: false, deathSaves: null, ...over,
  }) as CombatantView;
const enc = (state: string, combatants: CombatantView[]): EncounterView => ({ id: "e", name: "Wolves", state, round: 1, activeIndex: 0, gridWidth: 10, gridHeight: 10, environment: {}, walls: [], visible: null, combatants, isDm: true });

describe("cutscene events", () => {
  it("does nothing the first time a fight is seen or when another fight is shown", () => {
    expect(diffEncounter(null, enc("ACTIVE", [c("a")]))).toEqual([]);
    expect(diffEncounter({ ...enc("ACTIVE", [c("a")]), id: "x" }, enc("ACTIVE", [c("a")]))).toEqual([]);
  });
  it("opens the battle when it starts", () => {
    const e = diffEncounter(enc("SETUP", [c("a"), c("w", { kind: "monster", look: { k: "monster", type: "beast" } })]), enc("ACTIVE", [c("a"), c("w", { kind: "monster", look: { k: "monster", type: "beast" } })]));
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ kind: "start" });
  });
  it("shows a hit with who struck and how much", () => {
    const before = enc("ACTIVE", [c("a", { active: true }), c("w", { kind: "monster", look: { k: "monster", type: "beast" } })]);
    const after = enc("ACTIVE", [c("a", { active: true }), c("w", { kind: "monster", hp: 12, look: { k: "monster", type: "beast" } })]);
    const e = diffEncounter(before, after);
    expect(e[0]).toMatchObject({ kind: "hit", amount: 8, killed: false, fx: "slash", attacker: { name: "a" }, target: { name: "w" } });
  });
  it("marks a kill and a big blow", () => {
    const before = enc("ACTIVE", [c("a", { active: true }), c("w", { kind: "monster", look: { k: "monster", type: "undead" } })]);
    const after = enc("ACTIVE", [c("a", { active: true }), c("w", { kind: "monster", hp: 0, defeated: true, look: { k: "monster", type: "undead" } })]);
    expect(diffEncounter(before, after)[0]).toMatchObject({ kind: "hit", killed: true, big: true });
  });
  it("shows a blow on a monster whose hit points are hidden, without a number", () => {
    const hidden = (health: string) => c("w", { kind: "monster", hp: null, maxHp: null, health, look: { k: "monster", type: "beast" } });
    const e = diffEncounter(enc("ACTIVE", [c("a", { active: true }), hidden("Unhurt")]), enc("ACTIVE", [c("a", { active: true }), hidden("Wounded")]));
    expect(e[0]).toMatchObject({ kind: "hit", amount: null });
  });
  it("shows healing", () => {
    const e = diffEncounter(enc("ACTIVE", [c("a", { hp: 5 })]), enc("ACTIVE", [c("a", { hp: 12 })]));
    expect(e[0]).toMatchObject({ kind: "heal", amount: 7 });
  });
  it("ends in victory when a hero still stands and defeat when none do", () => {
    const win = diffEncounter(enc("ACTIVE", [c("a")]), enc("DONE", [c("a")]));
    expect(win[0]).toMatchObject({ kind: "end", result: "victory" });
    const lose = diffEncounter(enc("ACTIVE", [c("a")]), enc("DONE", [c("a", { hp: 0, defeated: true })]));
    expect(lose[0]).toMatchObject({ kind: "end", result: "defeat" });
  });
  it("picks a look for the blow from the attacker", () => {
    expect(fxFor({ name: "x", party: true, look: { k: "hero", type: "wizard" } })).toBe("magic");
    expect(fxFor({ name: "x", party: true, look: { k: "hero", type: "ranger" } })).toBe("arrow");
    expect(fxFor({ name: "x", party: false, look: { k: "monster", type: "dragon" } })).toBe("fire");
    expect(fxFor({ name: "x", party: false, look: { k: "monster", type: "undead" } })).toBe("dark");
    expect(fxFor(null)).toBe("slash");
  });
  it("caps a flurry of blows", () => {
    const foes = ["1", "2", "3", "4", "5"].map((i) => c(i, { kind: "monster", look: { k: "monster", type: "beast" } }));
    const hurt = foes.map((f) => ({ ...f, hp: 10 }));
    const e = diffEncounter(enc("ACTIVE", [c("a", { active: true }), ...foes]), enc("ACTIVE", [c("a", { active: true }), ...hurt]));
    expect(e.length).toBeLessThanOrEqual(3);
  });
});

describe("spell and condition scenes", () => {
  it("reads the spell and a critical hit from the log", () => {
    expect(hintsFromLog(["Mirela casts Fireball at level 4. Goblin takes 12 fire damage."]).spell).toBe("Fireball");
    expect(hintsFromLog(["Brannoch casts Shocking Grasp on Wolf"]).spell).toBe("Shocking Grasp");
    expect(hintsFromLog(["Attack: CRITICAL HIT (20+5) for 14 slashing damage"]).critical).toBe(true);
    expect(hintsFromLog(["Brannoch hits Wolf"])).toEqual({});
  });
  it("gives each kind of spell its own look", () => {
    expect(fxForSpell("Fireball")).toBe("fire");
    expect(fxForSpell("Lightning Bolt")).toBe("lightning");
    expect(fxForSpell("Ray of Frost")).toBe("frost");
    expect(fxForSpell("Guiding Bolt")).toBe("radiant");
    expect(fxForSpell("Stinking Cloud")).toBe("poison");
    expect(fxForSpell("Magic Missile")).toBe("magic");
  });
  it("uses the spell and critical hint on a hit", () => {
    const before = enc("ACTIVE", [c("a", { active: true }), c("w", { kind: "monster", look: { k: "monster", type: "beast" } })]);
    const after = enc("ACTIVE", [c("a", { active: true }), c("w", { kind: "monster", hp: 10, look: { k: "monster", type: "beast" } })]);
    const e = diffEncounter(before, after, { spell: "Fireball", critical: true });
    expect(e[0]).toMatchObject({ kind: "hit", fx: "fire", spell: "Fireball", crit: true, big: true });
  });
  it("shows a new condition", () => {
    const before = enc("ACTIVE", [c("a"), c("w", { kind: "monster", look: { k: "monster", type: "beast" } })]);
    const after = enc("ACTIVE", [c("a"), c("w", { kind: "monster", conditions: [{ condition: "stunned" }], look: { k: "monster", type: "beast" } })]);
    expect(diffEncounter(before, after)[0]).toMatchObject({ kind: "condition", condition: "stunned", target: { name: "w" } });
  });
});

