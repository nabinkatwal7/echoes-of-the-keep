import { rollD20, cryptoRng, type Rng } from "@/engine/dice";
import { autoFailsSave } from "@/engine/conditions";
import { rollDamage } from "@/engine/combat";
import { addCondition, conditionSet } from "@/engine/conditions/timers";
import { adjustDamage, applyDamage, heal, type DamageType } from "@/engine/damage";
import { projectileCount, scaledDice, type SpellEffect } from "@/engine/spells/effects";
import { resolveAttackAction, diesAtZero, fromVitals, toVitals, type Buff, type Cmb } from "./rules";

/** Spells whose lasting effect is a bonus we can track in rounds. Everything else is damage, healing or a condition. */
export const SPELL_BUFFS: Record<string, { to: "self" | "targets"; label: string; rounds: number; acBonus?: number; attackDie?: number; saveDie?: number }> = {
  shield: { to: "self", label: "Shield (+5 AC)", rounds: 1, acBonus: 5 },
  bless: { to: "targets", label: "Bless (+1d4)", rounds: 10, attackDie: 4, saveDie: 4 },
  "shield-of-faith": { to: "targets", label: "Shield of Faith (+2 AC)", rounds: 100, acBonus: 2 },
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
  const hurt = (t: Cmb, raw: number, type: string, critical = false): { cmb: Cmb; dealt: number } => {
    const dealt = adjustDamage(raw, type as DamageType, t.defenses);
    const after = fromVitals(t, applyDamage(toVitals(t), dealt, { critical, diesAtZero: diesAtZero(t) }));
    return { cmb: after, dealt };
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
      }
      break;
    }
    case "auto": {
      const count = projectileCount(effect, spell.level, slotLevel);
      const tally = new Map<string, number>();
      for (let i = 0; i < count; i++) {
        const t = targets[i % targets.length];
        const roll = rollDamage(dmgDice, effect.damage?.flat ?? 0, { rng }).total;
        const before = targets.find((x) => x.id === t.id)!;
        const { cmb, dealt } = hurt(before, roll, effect.damage!.type);
        targets = upsert(targets, cmb);
        tally.set(t.id, (tally.get(t.id) ?? 0) + dealt);
        noteDamage(t, before, cmb);
      }
      lines.push(`${verb}: ${[...tally].map(([id, n]) => `${targets.find((x) => x.id === id)!.name} takes ${n} ${effect.damage!.type} damage`).join(", ")}`);
      break;
    }
    case "save": {
      const raw = effect.damage ? rollDamage(dmgDice, effect.damage.flat, { rng }).total : 0;
      lines.push(`${verb} (save DC ${input.saveDc})`);
      for (const t0 of [...targets]) {
        const t = targets.find((x) => x.id === t0.id)!;
        const set = conditionSet(t.conditions);
        const ability = effect.save!;
        const bonus = (t.defenses.saves?.[ability] ?? (ability === "dex" ? t.dexMod : 0)) + (t.buffs ?? []).reduce((s, b) => s + (b.saveDie ? Math.floor(rng() * b.saveDie) + 1 : 0), 0);
        const auto = autoFailsSave(set, ability);
        const disadvantage = ability === "dex" && set.has("restrained");
        const roll = rollD20(bonus, disadvantage ? "disadvantage" : "normal", rng);
        const saved = !auto && roll.total >= input.saveDc;
        let cur = t;
        const parts: string[] = [`${t.name} ${auto ? "automatically fails" : saved ? "saves" : "fails"} (${auto ? "-" : roll.total})`];
        if (effect.damage) {
          const amount = saved ? (effect.halfOnSave ? Math.floor(raw / 2) : 0) : raw;
          if (amount > 0) {
            const { cmb, dealt } = hurt(cur, amount, effect.damage.type);
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
        const amount = rollDamage(base, effect.healing?.addModifier ? input.castMod : 0, { rng }).total;
        const next = fromVitals(t, heal(toVitals(t), amount));
        targets = upsert(targets, next);
        lines.push(`${verb} on ${t.name}: heals ${next.hp - t.hp} (${next.hp}/${next.maxHp} HP)`);
      }
      break;
    }
    default:
      lines.push(`${verb}${targets.length ? ` on ${targets.map((t) => t.name).join(", ")}` : ""}. The DM resolves the effect.`);
  }

  // lasting bonuses tracked in rounds
  const buff = SPELL_BUFFS[spell.index];
  if (buff) {
    const make = (): Buff => ({ id: spell.index, label: buff.label, rounds: buff.rounds, source: spell.concentration ? caster.id : undefined, acBonus: buff.acBonus, attackDie: buff.attackDie, saveDie: buff.saveDie });
    const give = (c: Cmb): Cmb => ({ ...c, buffs: [...(c.buffs ?? []).filter((b) => !(b.id === spell.index && b.source === (spell.concentration ? caster.id : undefined))), make()] });
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
    const conditions = c.conditions.filter((k) => !k.source?.startsWith(`spell:${casterId}:`));
    const buffs = (c.buffs ?? []).filter((b) => b.source !== casterId);
    if (conditions.length === c.conditions.length && buffs.length === (c.buffs ?? []).length && c.id !== casterId) return c;
    if (conditions.length !== c.conditions.length || buffs.length !== (c.buffs ?? []).length) lines.push(`The spell ends on ${c.name}`);
    return c.id === casterId ? { ...c, conditions, buffs, concentrating: null } : { ...c, conditions, buffs };
  });
  return { all: next, lines };
}
