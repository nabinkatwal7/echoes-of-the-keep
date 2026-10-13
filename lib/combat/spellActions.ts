"use server";

import type { Prisma } from "@prisma/client";
import { areaSquares, creaturesInArea } from "@/engine/combat/area";
import { distanceFeet } from "@/engine/combat/grid";
import { takeAction, takeBonusAction, takeReaction } from "@/engine/combat";
import { rollD20 } from "@/engine/dice";
import { CASTING_ABILITY, castingTimeKind } from "@/engine/spells";
import { CLASS_NAME } from "@/engine/classes/spellcasting";
import { maxTargets, parseSpellEffect, projectileCount } from "@/engine/spells/effects";
import type { ClassLevel } from "@/engine/progression";
import { castSpell } from "@/lib/characters/playActions";
import { deriveStored, type StoredCharacter } from "@/lib/characters/derive";
import { prisma } from "@/lib/prisma";
import { fail, isCtx, loadActing, refresh, context, canControl, type Result } from "./access";
import { commit } from "./commit";
import { monsterStats } from "./profiles";
import { counterspell, dropConcentration, resolveSpell } from "./spellRules";
import { rowToCmb, loadEncounter } from "./store";
import type { Cmb } from "./rules";

export type CombatCast = {
  casterId: string;
  spell: string;
  slotLevel?: number;
  pact?: boolean;
  targetIds?: string[];
  /** the point (for areas and spheres) or the direction (for cones, lines, self cubes), as grid squares */
  point?: { x: number; y: number };
};

/** Roll a Constitution save for each concentrating creature that was hurt; failures drop their spell everywhere. */
function concentrationRolls(all: Cmb[], checks: { id: string; dc: number }[], lines: string[]): Cmb[] {
  let state = all;
  for (const { id, dc } of checks) {
    const c = state.find((x) => x.id === id);
    if (!c || !c.concentrating) continue;
    const bonus = c.defenses.saves?.con ?? 0;
    const roll = rollD20(bonus, "normal");
    const kept = roll.total >= dc;
    lines.push(`${c.name} makes a Constitution save (DC ${dc}): ${roll.total} - ${kept ? "keeps concentrating" : "concentration is lost"}`);
    if (!kept) {
      const dropped = dropConcentration(state, id);
      state = dropped.all;
      lines.push(...dropped.lines);
    }
  }
  return state;
}

/** Cast a spell as a hero in the middle of a fight: economy, targeting, slot, rolls, effects and concentration. */
export async function castInCombat(req: CombatCast): Promise<Result> {
  const a = await loadActing(req.casterId);
  if (a.error) return a.error;
  const { row, ctx } = a;
  const { enc } = ctx;
  if (enc.state !== "ACTIVE") return fail("The encounter is not running");
  if (row.kind !== "character" || !row.characterId) return fail("Only heroes cast spells here; the DM narrates other creatures' magic");

  const spell = await prisma.spell.findUnique({ where: { index: req.spell } });
  if (!spell) return fail("Unknown spell");
  const ch = await prisma.character.findUnique({ where: { id: row.characterId } });
  if (!ch) return fail("Character not found");

  const kind = castingTimeKind(spell.castingTime);
  if (kind === "long") return fail("That takes too long to cast in combat");
  const active = enc.combatants[enc.activeIndex]?.id === row.id;
  const caster0 = rowToCmb(row);
  if (kind !== "reaction" && !active) return fail("It is not that creature's turn");
  if (kind === "action" && !caster0.turn.action) return fail("No action left");
  if (kind === "bonus" && !caster0.turn.bonusAction) return fail("No bonus action left");
  if (kind === "reaction" && !caster0.turn.reaction) return fail("No reaction left");
  if (kind === "bonus" && caster0.turn.leveledSpell && spell.level > 0) return fail("You already cast a leveled spell with your action");
  if (kind === "action" && spell.level > 0 && caster0.turn.bonusSpell) return fail("After a bonus action spell you can cast only a cantrip this turn");
  if (kind === "bonus" && caster0.turn.leveledSpell) return fail("You can't cast a bonus action spell after a leveled spell");

  const effect = parseSpellEffect(spell);
  const slotLevel = spell.level === 0 ? 0 : Math.max(spell.level, req.slotLevel ?? spell.level);

  // ---- who is hit
  const all = enc.combatants.map(rowToCmb);
  const alive = all.filter((c) => !c.defeated || effect.delivery === "heal");
  const casterPos = caster0.x !== null && caster0.y !== null ? { x: caster0.x, y: caster0.y } : null;
  const dist = (t: { x: number | null; y: number | null }) => (casterPos && t.x !== null && t.y !== null ? distanceFeet(casterPos, { x: t.x, y: t.y }) : undefined);
  let targets: Cmb[] = [];

  if (effect.area) {
    if (!req.point) return fail("Choose where to aim it");
    if (!casterPos) return fail("Place the caster on the map first");
    const origin = effect.area.fromSelf ? casterPos : req.point;
    if (!effect.area.fromSelf && distanceFeet(casterPos, req.point) > effect.range.feet) return fail("That point is out of range");
    const a2 = effect.area;
    const spec =
      a2.shape === "sphere" || a2.shape === "cylinder" ? { shape: a2.shape, radius: a2.size } as const
      : a2.shape === "cube" ? { shape: "cube", side: a2.size } as const
      : a2.shape === "cone" ? { shape: "cone", length: a2.size } as const
      : { shape: "line", length: a2.size, width: a2.width ?? 5 } as const;
    const squares = areaSquares(spec, origin, req.point, { width: enc.gridWidth, height: enc.gridHeight, fromSelf: a2.fromSelf });
    targets = creaturesInArea(squares, alive, a2.fromSelf ? caster0.id : undefined);
    if (!targets.length) return fail("No creatures are in that area (cast it anyway by choosing a different point)");
  } else if (effect.delivery !== "none" || req.targetIds?.length) {
    const ids = [...new Set(req.targetIds ?? [])];
    const selfCast = effect.range.kind === "self";
    if (!ids.length && !selfCast) return fail("Choose a target");
    const limit = effect.projectiles ? projectileCount(effect, spell.level, slotLevel) : maxTargets(effect, spell.level, slotLevel);
    if (ids.length > limit) return fail(`${spell.name} can affect at most ${limit} target${limit > 1 ? "s" : ""} at this level`);
    for (const id of ids) {
      const t = alive.find((c) => c.id === id);
      if (!t) return fail("Target not found");
      const d = dist(t);
      if (d !== undefined && effect.range.kind !== "self" && d > effect.range.feet) return fail(`${t.name} is out of range (${d} ft, range ${effect.range.feet} ft)`);
      targets.push(t);
    }
  }

  // ---- pay for it (slot, concentration bookkeeping on the sheet, log)
  const paid = await castSpell(row.characterId, spell.index, { slotLevel: slotLevel || undefined, pact: req.pact });
  if (!paid.ok) return paid;

  // ---- numbers
  const d = deriveStored(ch as unknown as StoredCharacter);
  const classes = ch.classes as ClassLevel[];
  const source = classes.find((k) => CASTING_ABILITY[k.classIndex] && spell.classes.includes(CLASS_NAME[k.classIndex])) ?? classes.find((k) => CASTING_ABILITY[k.classIndex]);
  const ability = source ? CASTING_ABILITY[source.classIndex] : "int";
  const castMod = d.abilities[ability].modifier;
  const prof = d.proficiencyBonus;

  // ---- economy
  const spentTurn = {
    ...caster0.turn,
    ...(kind === "action" ? takeAction(caster0.turn, "cast", caster0.speed) : kind === "bonus" ? takeBonusAction(caster0.turn) : takeReaction(caster0.turn)),
    ...(kind === "bonus" ? { bonusSpell: true } : {}),
    ...(kind === "action" && spell.level > 0 ? { leveledSpell: true } : {}),
  };
  const lines: string[] = [];
  let state: Cmb[] = all;
  if (caster0.concentrating && effect.concentration) {
    const dropped = dropConcentration(state, caster0.id);
    state = dropped.all;
    lines.push(`${caster0.name} stops concentrating on ${caster0.concentrating}`, ...dropped.lines);
  }
  const caster: Cmb = { ...state.find((c) => c.id === caster0.id)!, turn: spentTurn };
  state = state.map((c) => (c.id === caster.id ? caster : c));

  const includesCaster = targets.some((x) => x.id === caster.id);
  const out = resolveSpell({
    caster, targets: targets.map((x) => (x.id === caster.id ? caster : state.find((s) => s.id === x.id) ?? x)),
    spell: { index: spell.index, name: spell.name, level: spell.level, concentration: spell.concentration },
    effect, slotLevel, casterLevel: d.level, castMod, attackBonus: prof + castMod, saveDc: 8 + prof + castMod,
    distanceTo: (target) => dist(target),
  });
  lines.push(...out.lines);

  const merged = new Map<string, Cmb>(state.map((c) => [c.id, c]));
  for (const x of out.targets) merged.set(x.id, x);
  merged.set(out.caster.id, includesCaster ? (out.targets.find((x) => x.id === out.caster.id) ?? out.caster) : out.caster);
  // a target that is also the caster keeps the casting state
  if (includesCaster) merged.set(caster.id, { ...merged.get(caster.id)!, turn: out.caster.turn, concentrating: out.caster.concentrating });

  const settled = concentrationRolls([...merged.values()], out.concentrationChecks, lines);
  const changedIds = new Set<string>([caster.id, ...out.targets.map((x) => x.id), ...settled.filter((c, i) => c !== [...merged.values()][i]).map((c) => c.id)]);
  // drop-concentration may touch combatants not directly targeted
  for (const c of settled) {
    const before = all.find((x) => x.id === c.id)!;
    if (JSON.stringify(before) !== JSON.stringify(c)) changedIds.add(c.id);
  }
  const update = settled.filter((c) => changedIds.has(c.id));

  // a hero whose concentration was lost in this exchange also loses it on the sheet
  for (const c of settled) {
    const r = enc.combatants.find((x) => x.id === c.id);
    if (r?.characterId && !c.concentrating && all.find((x) => x.id === c.id)?.concentrating && c.id !== caster.id) {
      const target = await prisma.character.findUnique({ where: { id: r.characterId }, select: { spells: true } });
      const sp = (target?.spells && typeof target.spells === "object" ? target.spells : {}) as Record<string, unknown>;
      await prisma.character.update({ where: { id: r.characterId }, data: { spells: { ...sp, concentration: null } as Prisma.InputJsonValue } });
    }
  }

  await commit(enc, ctx.user, { update, lines, dmOnly: row.hidden });
  refresh(enc.campaignId);
  return { ok: true };
}

/** Counterspell, as a reaction: the DM names the level of the spell being cast. */
export async function castCounterspell(casterId: string, slotLevel: number, targetSpellLevel: number): Promise<Result> {
  const a = await loadActing(casterId);
  if (a.error) return a.error;
  const { row, ctx } = a;
  if (ctx.enc.state !== "ACTIVE") return fail("The encounter is not running");
  if (!row.characterId) return fail("Only heroes can counter spells here");
  if (!Number.isInteger(slotLevel) || slotLevel < 3 || slotLevel > 9 || !Number.isInteger(targetSpellLevel) || targetSpellLevel < 1 || targetSpellLevel > 9) return fail("Enter spell levels between 1 and 9");
  const caster = rowToCmb(row);
  if (!caster.turn.reaction) return fail("No reaction left");
  const ch = await prisma.character.findUnique({ where: { id: row.characterId } });
  if (!ch) return fail("Character not found");
  const paid = await castSpell(row.characterId, "counterspell", { slotLevel });
  if (!paid.ok) return paid;
  const d = deriveStored(ch as unknown as StoredCharacter);
  const classes = ch.classes as ClassLevel[];
  const k = classes.find((c) => CASTING_ABILITY[c.classIndex]);
  const mod = k ? d.abilities[CASTING_ABILITY[k.classIndex]].modifier : 0;
  const r = counterspell(slotLevel, targetSpellLevel, mod);
  await commit(ctx.enc, ctx.user, { update: [{ ...caster, turn: takeReaction(caster.turn) }], lines: [`${caster.name} casts Counterspell. ${r.line}`], dmOnly: row.hidden });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

/** End concentration by choice (or because the DM rules it so), lifting the spell from everyone it was on. */
export async function endCombatConcentration(casterId: string): Promise<Result> {
  const a = await loadActing(casterId);
  if (a.error) return a.error;
  const { row, ctx } = a;
  const all = ctx.enc.combatants.map(rowToCmb);
  const me = all.find((c) => c.id === row.id)!;
  if (!me.concentrating) return fail("Not concentrating on anything");
  const { all: next, lines } = dropConcentration(all, row.id);
  const update = next.filter((c, i) => JSON.stringify(c) !== JSON.stringify(all[i]));
  if (row.characterId) {
    const ch = await prisma.character.findUnique({ where: { id: row.characterId }, select: { spells: true } });
    const sp = (ch?.spells && typeof ch.spells === "object" ? ch.spells : {}) as Record<string, unknown>;
    await prisma.character.update({ where: { id: row.characterId }, data: { spells: { ...sp, concentration: null } as Prisma.InputJsonValue } });
  }
  await commit(ctx.enc, ctx.user, { update, lines: [`${me.name} stops concentrating on ${me.concentrating}`, ...lines], dmOnly: row.hidden });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

/** Bring a summoned creature (familiar, conjured beast, animated dead) into the fight on the caster's side. */
export async function summonCreature(encounterId: string, casterId: string, creatureIndex: string, count = 1): Promise<Result> {
  const ctx = await context(encounterId);
  if (!isCtx(ctx)) return ctx;
  const row = ctx.enc.combatants.find((c) => c.id === casterId);
  if (!row) return fail("Caster not found");
  if (!(await canControl(ctx, row))) return fail("Not allowed");
  if (!Number.isInteger(count) || count < 1 || count > 8) return fail("Summon between 1 and 8 creatures");
  const m = await prisma.creature.findUnique({ where: { index: creatureIndex } });
  if (!m) return fail("Unknown creature");
  const s = monsterStats(m);
  const existing = ctx.enc.combatants.filter((c) => c.creatureIndex === creatureIndex && (c.extra as { ally?: boolean } | null)?.ally).length;
  const create: Prisma.CombatantUncheckedCreateInput[] = Array.from({ length: count }, (_, i) => ({
    encounterId, kind: "monster", creatureIndex, name: `${m.name} (${row.name}'s ${count + existing > 1 ? existing + i + 1 : "summon"})`,
    dexMod: s.dexMod, ac: s.ac, hp: s.hp, maxHp: s.hp, speed: s.speed, attacks: s.attacks as unknown as Prisma.InputJsonValue,
    defenses: s.defenses as Prisma.InputJsonValue, x: Math.min(ctx.enc.gridWidth - 1, (row.x ?? 1) + 1 + i), y: row.y ?? 1,
    extra: { attacksPerAction: s.attacksPerAction, cr: 0, size: s.size, ally: true },
  }));
  await commit(ctx.enc, ctx.user, { create, lines: [`${row.name} summons ${count} × ${m.name}`], dmOnly: row.hidden });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

/** Polymorph: replace a combatant's stats with a beast's, remembering the original so the change can be undone. */
export async function polymorphCombatant(targetId: string, creatureIndex: string): Promise<Result> {
  const row = await prisma.combatant.findUnique({ where: { id: targetId } });
  if (!row) return fail("Combatant not found");
  const ctx = await context(row.encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!ctx.isDm) return fail("Only the DM can polymorph a creature");
  const extra = (row.extra ?? {}) as Record<string, unknown>;
  if (extra.polymorph) return fail("Already transformed; revert first");
  const m = await prisma.creature.findUnique({ where: { index: creatureIndex } });
  if (!m || !/beast/i.test(m.type ?? "")) return fail("Polymorph needs a beast");
  const s = monsterStats(m);
  const saved = { name: row.name, ac: row.ac, hp: row.hp, maxHp: row.maxHp, speed: row.speed, attacks: row.attacks, defenses: row.defenses, attacksPerAction: extra.attacksPerAction, size: extra.size };
  const enc = (await loadEncounter(row.encounterId))!;
  const before = rowToCmb(row);
  await prisma.combatant.update({
    where: { id: row.id },
    data: { name: `${row.name} (${m.name})`, ac: s.ac, hp: s.hp, maxHp: s.hp, speed: s.speed, attacks: s.attacks as unknown as Prisma.InputJsonValue, defenses: s.defenses as Prisma.InputJsonValue, extra: { ...extra, polymorph: saved, attacksPerAction: s.attacksPerAction, size: s.size } as Prisma.InputJsonValue },
  });
  await commit(enc, ctx.user, { update: [], lines: [`${before.name} is polymorphed into a ${m.name}`], dmOnly: row.hidden });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

/** Return to the original form; damage beyond the beast's 0 HP carries over via the DM adjusting hit points. */
export async function revertForm(targetId: string): Promise<Result> {
  const row = await prisma.combatant.findUnique({ where: { id: targetId } });
  if (!row) return fail("Combatant not found");
  const ctx = await context(row.encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!ctx.isDm) return fail("Only the DM can do that");
  const extra = (row.extra ?? {}) as { polymorph?: { name: string; ac: number; hp: number; maxHp: number; speed: number; attacks: unknown; defenses: unknown; attacksPerAction?: number; size?: string } | null };
  const p = extra.polymorph;
  if (!p) return fail("Not transformed");
  const enc = (await loadEncounter(row.encounterId))!;
  await prisma.combatant.update({
    where: { id: row.id },
    data: { name: p.name, ac: p.ac, hp: p.hp, maxHp: p.maxHp, speed: p.speed, attacks: (p.attacks ?? []) as Prisma.InputJsonValue, defenses: (p.defenses ?? {}) as Prisma.InputJsonValue, extra: { ...extra, polymorph: null, attacksPerAction: p.attacksPerAction, size: p.size } as Prisma.InputJsonValue },
  });
  await commit(enc, ctx.user, { update: [], lines: [`${p.name} returns to their own form`], dmOnly: row.hidden });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

