import { rollD20, cryptoRng, type Rng } from "@/engine/dice";
import { autoFailsSave } from "@/engine/conditions";
import { rollDamage } from "@/engine/combat";
import { addCondition, conditionSet } from "@/engine/conditions/timers";
import { adjustDamage, heal, type DamageType } from "@/engine/damage";
import { projectileCount, scaledDice, type SpellEffect } from "@/engine/spells/effects";
import { SUMMON_RULES } from "@/engine/spells/summons";
import { UTILITY_SPELLS } from "@/lib/spells/utility";
import { absorbDamage, resolveAttackAction, fromVitals, toVitals, type Buff, type Cmb } from "./rules";

type BuffSpec = {
  to: "self" | "targets";
  label: string;
  rounds: number;
  acBonus?: number;
  attackDie?: number;
  saveDie?: number;
  speedMultiplier?: number;
  dexSaveAdvantage?: boolean;
  haste?: boolean;
  lethargy?: boolean;
  advAgainst?: boolean;
  disAgainst?: boolean;
  oneShot?: boolean;
  /** raises AC to at least this value (Mage Armor is 13 + Dex, Barkskin is 16) */
  acFloor?: number | "mage-armor";
};

/** Spells whose lasting effect is a bonus we can track in rounds. Everything else is damage, healing or a condition. */
export const SPELL_BUFFS: Record<string, BuffSpec> = {
  shield: { to: "self", label: "Shield (+5 AC)", rounds: 1, acBonus: 5 },
  bless: { to: "targets", label: "Bless (+1d4)", rounds: 10, attackDie: 4, saveDie: 4 },
  "shield-of-faith": { to: "targets", label: "Shield of Faith (+2 AC)", rounds: 100, acBonus: 2 },
  haste: { to: "targets", label: "Haste", rounds: 10, acBonus: 2, speedMultiplier: 2, dexSaveAdvantage: true, haste: true, lethargy: true },
  "mage-armor": { to: "targets", label: "Mage Armor (AC 13 + Dex)", rounds: 4800, acFloor: "mage-armor" },
  barkskin: { to: "targets", label: "Barkskin (AC 16 at least)", rounds: 600, acFloor: 16 },
  resistance: { to: "targets", label: "Resistance (+1d4 to a save)", rounds: 10, saveDie: 4 },
  blur: { to: "self", label: "Blur (attackers have disadvantage)", rounds: 10, disAgainst: true },
};

/** Spells that make each creature save and, on a failure, leave a lasting penalty (Bane, Faerie Fire). */
export const SPELL_DEBUFFS: Record<string, { save: "str" | "dex" | "con" | "int" | "wis" | "cha"; label: string; rounds: number; attackDie?: number; saveDie?: number; advAgainst?: boolean }> = {
  bane: { save: "cha", label: "Bane (-1d4)", rounds: 10, attackDie: -4, saveDie: -4 },
  "faerie-fire": { save: "dex", label: "Faerie Fire (attackers have advantage)", rounds: 10, advAgainst: true },
};

/** Spells whose attack, on a hit, leaves a mark on the target. */
export const SPELL_ON_HIT: Record<string, { label: string; rounds: number; advAgainst: boolean; oneShot: boolean }> = {
  "guiding-bolt": { label: "Guiding Bolt (next attack has advantage)", rounds: 2, advAgainst: true, oneShot: true },
};

/** Spells that simply impose a condition on their targets without a save. */
export const SPELL_CONDITIONS: Record<string, { condition: "invisible"; rounds: number; label: string }> = {
  invisibility: { condition: "invisible", rounds: 600, label: "Invisibility" },
};

export type SpellMeta = { index: string; name: string; level: number; concentration: boolean };

export type SpellCastInput = {
  caster: Cmb;
  targets: Cmb[];
  spell: SpellMeta;
  effect: SpellEffect;
  slotLevel: number;
  casterLevel: number;
  /** spellcasting ability modifier */
  castMod: number;
  attackBonus: number;
  saveDc: number;
  /** distance in feet from the caster to a target, when positions are known */
  distanceTo?: (target: Cmb) => number | undefined;
  rng?: Rng;
  /** the fight is underwater: fire damage is halved */
  underwater?: boolean;
  /** Heightened Spell: the target rolls the save with disadvantage */
  saveDisadvantage?: boolean;
  /** Careful Spell: these targets succeed automatically */
  autoSaveIds?: string[];
  /** Empowered Spell: keep the higher of two damage rolls */
  empowered?: boolean;
  /** Extended Spell: double the buff's duration */
  extended?: boolean;
  /** extra healing added to the roll (Disciple of Life) */
  bonusHeal?: number;
};

export type SpellOutcome = {
  caster: Cmb;
  targets: Cmb[];
  lines: string[];
  /** targets that were concentrating and took damage: they must make a Constitution save at this DC */
  concentrationChecks: { id: string; dc: number }[];
};

const upsert = (list: Cmb[], c: Cmb) => list.map((x) => (x.id === c.id ? c : x));

/** Resolve a spell's attack rolls, saving throws, damage, healing, conditions and buffs against its targets. */
export function resolveSpell(input: SpellCastInput): SpellOutcome {
  const rng = input.rng ?? cryptoRng;
  const { spell, effect, slotLevel } = input;
  const lines: string[] = [];
  const checks: { id: string; dc: number }[] = [];
  let caster = input.caster;
  let targets = input.targets;
  const verb = `${caster.name} casts ${spell.name}${slotLevel > spell.level && spell.level > 0 ? ` at level ${slotLevel}` : ""}`;

  const dmgDice = effect.damage ? scaledDice(effect.damage.dice, effect, spell.level, slotLevel, input.casterLevel) : "";
  const noteDamage = (t: Cmb, before: Cmb, after: Cmb) => {
    if (before.hp > 0 && after.hp === 0) lines.push(after.defeated ? `${t.name} is slain` : `${t.name} falls unconscious`);
    if (t.concentrating && after.hp > 0 && before.hp > after.hp) checks.push({ id: t.id, dc: Math.max(10, Math.floor((before.hp + before.tempHp - after.hp - after.tempHp) / 2)) });
    if (t.concentrating && after.hp === 0 && before.hp > 0) lines.push(`${t.name} loses concentration`);
  };
  const hurt = (t: Cmb, raw: number, type: string, critical = false): { cmb: Cmb; dealt: number; lines: string[] } => {
    let dealt = adjustDamage(raw, type as DamageType, t.defenses);
    if (input.underwater && type === "fire") dealt = Math.floor(dealt / 2);
    const absorbed = absorbDamage(t, dealt, { critical });
    return { cmb: absorbed.cmb, dealt, lines: absorbed.lines };
  };

  switch (effect.delivery) {
    case "attack": {
      const count = projectileCount(effect, spell.level, slotLevel);
      const melee = effect.attack === "melee";
      for (let i = 0; i < count; i++) {
        const t = targets[i % targets.length];
        const dist = input.distanceTo?.(t);
        const out = resolveAttackAction(
          caster,
          t,
          {
            name: spell.name, toHit: input.attackBonus, dice: dmgDice, modifier: effect.damage?.flat ?? 0, damageType: effect.damage?.type ?? "force",
            melee, reach: 5, range: melee ? undefined : { normal: effect.range.feet, long: effect.range.feet },
          },
          { skipEconomy: true, withinFiveFeet: dist === undefined ? melee : dist <= 5, distanceFeet: dist },
          rng,
        );
        caster = out.attacker;
        targets = upsert(targets, out.target);
        lines.push(...out.lines.map((l) => l.replace(`${caster.name} attacks ${t.name} with ${spell.name}`, `${spell.name} at ${t.name}`)));
        if (out.concentrationDc) checks.push({ id: t.id, dc: out.concentrationDc });
        const mark = SPELL_ON_HIT[spell.index];
        if (mark && out.hit) {
          const hit = targets.find((x) => x.id === t.id)!;
          targets = upsert(targets, { ...hit, buffs: [...(hit.buffs ?? []), { id: spell.index, label: mark.label, rounds: mark.rounds, advAgainst: mark.advAgainst, oneShot: mark.oneShot }] });
        }
      }
      break;
    }
    case "auto": {
      const count = projectileCount(effect, spell.level, slotLevel);
      const tally = new Map<string, number>();
      for (let i = 0; i < count; i++) {
        const t = targets[i % targets.length];
        const once = rollDamage(dmgDice, effect.damage?.flat ?? 0, { rng }).total;
        const twice = input.empowered ? rollDamage(dmgDice, effect.damage?.flat ?? 0, { rng }).total : once;
        const roll = Math.max(once, twice);
        const before = targets.find((x) => x.id === t.id)!;
        const { cmb, dealt, lines: extra } = hurt(before, roll, effect.damage!.type);
        lines.push(...extra);
        targets = upsert(targets, cmb);
        tally.set(t.id, (tally.get(t.id) ?? 0) + dealt);
        noteDamage(t, before, cmb);
      }
      lines.push(`${verb}: ${[...tally].map(([id, n]) => `${targets.find((x) => x.id === id)!.name} takes ${n} ${effect.damage!.type} damage`).join(", ")}`);
      break;
    }
    case "save": {
      const once = effect.damage ? rollDamage(dmgDice, effect.damage.flat, { rng }).total : 0;
      const twice = effect.damage && input.empowered ? rollDamage(dmgDice, effect.damage.flat, { rng }).total : once;
      const raw = Math.max(once, twice);
      lines.push(`${verb} (save DC ${input.saveDc})`);
      for (const t0 of [...targets]) {
        const t = targets.find((x) => x.id === t0.id)!;
        const set = conditionSet(t.conditions);
        const ability = effect.save!;
        const bonus = (t.defenses.saves?.[ability] ?? (ability === "dex" ? t.dexMod : 0)) + (t.buffs ?? []).reduce((s, b) => s + (b.saveDie ? Math.sign(b.saveDie) * (Math.floor(rng() * Math.abs(b.saveDie)) + 1) : 0), 0);
        const auto = autoFailsSave(set, ability);
        const disadvantage = (ability === "dex" && set.has("restrained")) || !!input.saveDisadvantage;
        const advantage = ability === "dex" && (t.buffs ?? []).some((b) => b.dexSaveAdvantage);
        const mode = advantage && disadvantage ? "normal" : advantage ? "advantage" : disadvantage ? "disadvantage" : "normal";
        const roll = rollD20(bonus, mode, rng);
        const careful = input.autoSaveIds?.includes(t.id);
        const saved = careful || (!auto && roll.total >= input.saveDc);
        let cur = t;
        const parts: string[] = [`${t.name} ${careful ? "automatically succeeds" : auto ? "automatically fails" : saved ? "saves" : "fails"} (${careful || auto ? "-" : roll.total})`];
        if (effect.damage) {
          const amount = saved ? (effect.halfOnSave ? Math.floor(raw / 2) : 0) : raw;
          if (amount > 0) {
            const { cmb, dealt, lines: extra } = hurt(cur, amount, effect.damage.type);
            lines.push(...extra);
            noteDamage(cur, cur, cmb);
            parts.push(`takes ${dealt} ${effect.damage.type} damage`);
            cur = cmb;
          }
        }
        if (!saved && effect.condition) {
          cur = { ...cur, conditions: addCondition(cur.conditions, { condition: effect.condition, rounds: effect.durationRounds || undefined, source: `spell:${caster.id}:${spell.index}` }) };
          parts.push(`is ${effect.condition}`);
        }
        targets = upsert(targets, cur);
        lines.push(parts.join(", "));
      }
      break;
    }
    case "heal": {
      const base = effect.healing ? scaledDice(effect.healing.dice, effect, spell.level, slotLevel, input.casterLevel) : "0d1";
      for (const t0 of [...targets]) {
        const t = targets.find((x) => x.id === t0.id)!;
        const amount = (effect.healing?.flat ?? rollDamage(base, effect.healing?.addModifier ? input.castMod : 0, { rng }).total) + (input.bonusHeal ?? 0);
        const next = fromVitals(t, heal(toVitals(t), amount));
        targets = upsert(targets, next);
        lines.push(`${verb} on ${t.name}: heals ${next.hp - t.hp} (${next.hp}/${next.maxHp} HP)`);
      }
      break;
    }
    case "temp": {
      const t = effect.tempHp!;
      const amount = (t.dice === "0d1" ? 0 : rollDamage(t.dice, 0, { rng }).total) + t.flat + t.perSlotLevel * Math.max(0, slotLevel - spell.level);
      for (const t0 of [...targets]) {
        const cur = targets.find((x) => x.id === t0.id)!;
        targets = upsert(targets, { ...cur, tempHp: Math.max(cur.tempHp, amount) });
        lines.push(`${verb}: ${cur.name} gains ${amount} temporary hit points`);
      }
      break;
    }
    case "pool": {
      const dice = scaledDice(effect.pool!.dice, effect, spell.level, slotLevel, input.casterLevel);
      let left = rollDamage(dice, 0, { rng }).total;
      lines.push(`${verb}: ${left} hit points of creatures are affected`);
      const order = [...targets].filter((t) => !t.defeated && t.hp > 0 && !t.conditions.some((c) => c.condition === "unconscious")).sort((a, b) => a.hp - b.hp);
      for (const t of order) {
        if (t.hp > left) break;
        left -= t.hp;
        const cond = effect.pool!.condition;
        targets = upsert(targets, { ...t, conditions: addCondition(t.conditions, { condition: cond, rounds: cond === "blinded" ? 2 : effect.durationRounds || 10, source: `spell:${caster.id}:${spell.index}` }) });
        lines.push(`${t.name} is ${cond === "unconscious" ? "put to sleep" : cond}`);
      }
      break;
    }
    default: {
      const debuff = SPELL_DEBUFFS[spell.index];
      const useful = UTILITY_SPELLS[spell.index];
      if (debuff) {
        lines.push(`${verb} (save DC ${input.saveDc})`);
        for (const t0 of [...targets]) {
          const t = targets.find((x) => x.id === t0.id)!;
          const bonus = t.defenses.saves?.[debuff.save] ?? (debuff.save === "dex" ? t.dexMod : 0);
          const roll = rollD20(bonus, "normal", rng);
          const saved = !autoFailsSave(conditionSet(t.conditions), debuff.save) && roll.total >= input.saveDc;
          if (!saved) {
            const mark: Buff = { id: spell.index, label: debuff.label, rounds: debuff.rounds, source: spell.concentration ? caster.id : undefined, attackDie: debuff.attackDie, saveDie: debuff.saveDie, advAgainst: debuff.advAgainst };
            targets = upsert(targets, { ...t, buffs: [...(t.buffs ?? []).filter((b) => b.id !== spell.index || b.source !== mark.source), mark] });
          }
          lines.push(`${t.name} ${saved ? "saves" : "fails"} (${roll.total})${saved ? "" : ` and is affected: ${debuff.label}`}`);
        }
        break;
      }
      const cond = SPELL_CONDITIONS[spell.index];
      if (cond) {
        for (const t0 of [...targets]) {
          const t = targets.find((x) => x.id === t0.id)!;
          targets = upsert(targets, { ...t, conditions: addCondition(t.conditions, { condition: cond.condition, rounds: cond.rounds, source: `spell:${caster.id}:${spell.index}` }) });
        }
        lines.push(`${verb}: ${targets.map((t) => t.name).join(", ")} ${targets.length > 1 ? "become" : "becomes"} ${cond.condition}`);
        break;
      }
      if (spell.index === "aid") {
        const extra = 5 * Math.max(1, slotLevel - 1);
        for (const t0 of [...targets]) {
          const t = targets.find((x) => x.id === t0.id)!;
          targets = upsert(targets, { ...t, maxHp: t.maxHp + extra, hp: t.hp > 0 ? t.hp + extra : t.hp });
        }
        lines.push(`${verb}: ${targets.map((t) => t.name).join(", ")} gain${targets.length > 1 ? "" : "s"} ${extra} maximum and current hit points`);
        break;
      }
      lines.push(useful ? `${verb}. ${useful}` : `${verb}${targets.length ? ` on ${targets.map((t) => t.name).join(", ")}` : ""}. The DM resolves the effect.`);
    }
  }

  // lasting bonuses tracked in rounds
  const buff = SPELL_BUFFS[spell.index];
  if (buff) {
    const rounds = input.extended ? buff.rounds * 2 : buff.rounds;
    const make = (target: Cmb): Buff => {
      const { to: _to, rounds: _r, label, acFloor, ...rest } = buff;
      void _to;
      void _r;
      const floorAc = acFloor === "mage-armor" ? 13 + target.dexMod : acFloor;
      return { ...rest, id: spell.index, label, rounds, source: spell.concentration ? caster.id : undefined, ...(floorAc !== undefined ? { acBonus: Math.max(0, floorAc - target.ac) } : {}) };
    };
    const give = (c: Cmb): Cmb => ({ ...c, buffs: [...(c.buffs ?? []).filter((b) => !(b.id === spell.index && b.source === (spell.concentration ? caster.id : undefined))), make(c)] });
    if (buff.to === "self") caster = give(caster);
    else {
      targets = targets.map((t) => (t.id === caster.id ? t : give(t)));
      if (targets.some((t) => t.id === caster.id) || input.targets.some((t) => t.id === caster.id)) caster = give(caster);
    }
    lines.push(`${buff.label} ${buff.to === "self" ? `protects ${caster.name}` : `affects ${input.targets.map((t) => t.name).join(", ")}`}`);
  }

  if (spell.concentration) caster = { ...caster, concentrating: spell.name };
  return { caster, targets, lines, concentrationChecks: checks };
}

/** Counterspell (PHB p.228): a spell of 3rd level or lower always fails; higher needs a spellcasting ability check at DC 10 + level. */
export function counterspell(slotLevel: number, targetSpellLevel: number, castMod: number, rng: Rng = cryptoRng): { success: boolean; line: string } {
  if (targetSpellLevel <= slotLevel) return { success: true, line: `Counterspell (level ${slotLevel}) stops the level ${targetSpellLevel} spell` };
  const dc = 10 + targetSpellLevel;
  const roll = rollD20(castMod, "normal", rng);
  const success = roll.total >= dc;
  return { success, line: `Counterspell against a level ${targetSpellLevel} spell: check ${roll.total} vs DC ${dc} - ${success ? "the spell fails" : "the spell goes off"}` };
}

/** Remove everything this caster's concentration was holding up. */
export function dropConcentration(all: Cmb[], casterId: string): { all: Cmb[]; lines: string[] } {
  const lines: string[] = [];
  const next = all.map((c) => {
    if (c.summonedBy === casterId && !c.defeated) {
      lines.push(`${c.name} vanishes`);
      return { ...c, hp: 0, defeated: true };
    }
    const conditions = c.conditions.filter((k) => !k.source?.startsWith(`spell:${casterId}:`));
    const buffs = (c.buffs ?? []).filter((b) => b.source !== casterId);
    if (conditions.length === c.conditions.length && buffs.length === (c.buffs ?? []).length && c.id !== casterId) return c;
    if (conditions.length !== c.conditions.length || buffs.length !== (c.buffs ?? []).length) lines.push(`The spell ends on ${c.name}`);
    return c.id === casterId ? { ...c, conditions, buffs, concentrating: null } : { ...c, conditions, buffs };
  });
  return { all: next, lines };
}

/** How a spell is handled in combat, for the coverage report and the spell picker. */
export function automationMode(index: string, effect: SpellEffect): string {
  if (effect.delivery !== "none") return effect.delivery;
  if (SPELL_BUFFS[index]) return "buff";
  if (SPELL_DEBUFFS[index]) return "debuff";
  if (SPELL_CONDITIONS[index]) return "condition";
  if (SUMMON_RULES[index]) return "summon";
  if (index === "aid") return "heal";
  return "narrated";
}
