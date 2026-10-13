import { abilityModifier } from "@/engine/abilities";
import { collectEffects } from "@/engine/effects";
import { parseChallenge } from "@/engine/companions";
import { attacksPerAction, proficiencyBonus, type ClassLevel } from "@/engine/progression";
import { parseDefenses, parseMonsterActions } from "@/engine/combat";
import { deriveStored, toEngineInput, type StoredCharacter } from "@/lib/characters/derive";
import type { InventoryItem } from "@/lib/characters/inventory";
import { splitDamage, monsterProfiles, type AttackProfile, type CombatDefenses } from "./rules";

type CharacterRow = StoredCharacter & { equipment: unknown; name: string };

/** "Ammunition (range 80/320)" -> { normal: 80, long: 320 } */
export function parseRange(properties: string | undefined): { normal: number; long: number } | undefined {
  const m = /range (\d+)\/(\d+)/i.exec(properties ?? "");
  return m ? { normal: Number(m[1]), long: Number(m[2]) } : undefined;
}

/** Equipped weapons as combat attack profiles, plus an unarmed strike. */
export function characterProfiles(c: CharacterRow): AttackProfile[] {
  const d = deriveStored(c);
  const items = ((c.equipment as InventoryItem[]) ?? []).filter((i) => i.kind === "weapon" && i.equipped && i.damage);
  const profiles: AttackProfile[] = items.map((item, i) => {
    const a = d.attacks[i];
    const split = splitDamage(a.damage);
    return {
      name: item.name,
      weapon: item.name,
      toHit: a.attackBonus.total,
      dice: split.dice,
      modifier: split.modifier,
      damageType: item.damageType ?? "slashing",
      melee: item.melee ?? true,
      reach: item.properties && /reach/i.test(item.properties) ? 10 : 5,
      range: parseRange(item.properties),
      abilityMod: split.modifier - (item.magicBonus ?? 0),
      light: /light/i.test(item.properties ?? ""),
    };
  });
  const level = (c.classes as ClassLevel[]).reduce((s, k) => s + k.level, 0);
  const strMod = d.abilities.str.modifier;
  profiles.push({ name: "Unarmed strike", weapon: "Unarmed strike", toHit: strMod + proficiencyBonus(level), dice: "", modifier: Math.max(1, 1 + strMod), damageType: "bludgeoning", melee: true, reach: 5, abilityMod: strMod });
  return profiles;
}

export type MonsterRow = {
  index: string;
  name: string;
  size: string;
  armorClass: string | null;
  hitPoints: string | null;
  speed: string | null;
  abilities: unknown;
  damageResistances: string | null;
  challenge: string | null;
  text: string;
};

/** Everything an encounter needs to know about a creature, read from its stat block. */
export function monsterStats(m: MonsterRow) {
  const ab = (m.abilities ?? { str: 10, dex: 10 }) as { str: number; dex: number };
  const actions = parseMonsterActions(m.text);
  const dexMod = abilityModifier(ab.dex);
  const walk = /^(\d+)/.exec(m.speed ?? "")?.[1];
  const defenses: CombatDefenses = { ...parseDefenses(m.damageResistances), athletics: abilityModifier(ab.str), acrobatics: dexMod };
  const hp = Number(/^(\d+)/.exec(m.hitPoints ?? "")?.[1] ?? 1);
  return {
    ac: Number(/^(\d+)/.exec(m.armorClass ?? "")?.[1] ?? 10),
    hp,
    speed: walk ? Number(walk) : 30,
    dexMod,
    attacks: monsterProfiles(actions.attacks),
    attacksPerAction: actions.multiattack?.count ?? 1,
    defenses,
    cr: parseChallenge(m.challenge),
    size: m.size,
  };
}

/** What a character brings into combat: AC, speed, resistances and skill bonuses for contests. */
export function characterCombatStats(c: CharacterRow & { currentHp: number; tempHp: number; raceIndex: string; subraceIndex: string | null; feats: unknown }) {
  const d = deriveStored(c);
  const input = toEngineInput(c);
  const fx = collectEffects({ raceIndex: c.raceIndex, subraceIndex: c.subraceIndex, feats: c.feats as string[], classes: c.classes as ClassLevel[], armor: input.armor?.category ?? null, shield: input.shield });
  return {
    ac: d.armorClass.total,
    maxHp: d.maxHp,
    speed: d.speed,
    dexMod: d.abilities.dex.modifier,
    initiativeBonus: d.initiative.total - d.abilities.dex.modifier,
    attacksPerAction: attacksPerAction(c.classes as ClassLevel[]),
    defenses: { resistances: fx.resistances, athletics: d.skills.athletics.total, acrobatics: d.skills.acrobatics.total } as CombatDefenses,
  };
}
