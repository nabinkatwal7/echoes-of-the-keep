"use server";

import type { Combatant, Prisma } from "@prisma/client";
import { rollDamage, rollInitiative, standUp, type Cover } from "@/engine/combat";
import { fallDamage } from "@/engine/exploration";
import { mountMoveCost } from "@/engine/combat/environment";
import { spendLegendary, spendRecharge } from "@/engine/combat/special";
import { rollD20 } from "@/engine/dice";
import { moveCost, opportunityAttackers, distanceFeet, withinFiveFeet as adjacent } from "@/engine/combat/grid";
import { addCondition, isCondition, removeCondition } from "@/engine/conditions/timers";
import { heal } from "@/engine/damage";
import { xpForChallenge } from "@/engine/xp";
import { isFlanking, readHouseRules } from "@/lib/campaigns/houseRules";
import { requireUser } from "@/lib/auth";
import { roleIn } from "./store";
import { prisma } from "@/lib/prisma";
import { characterCombatStats, characterProfiles, monsterStats } from "./profiles";
import { commit } from "./commit";
import {
  absorbDamage, advance, beginTurn, finishTurn, fromVitals, resolveAttackAction, resolveGrappleAction, spendReaction, spendSimpleAction,
  toVitals, type AttackProfile, type Cmb, type SimpleAction,
} from "./rules";
import { changed, clearSheetConcentration, concentrationRolls, dropForDowned } from "./concentration";
import { adjustSlot } from "@/lib/characters/playActions";
import { slotViews } from "@/lib/characters/play";
import { canControl, context, fail, isCtx, loadActing, refresh, type Result } from "./access";
import { loadEncounter, profilesOf, rowToCmb, sideOf } from "./store";

// ---------------------------------------------------------------------------------------------- setup (DM)

export async function createEncounter(campaignId: string, name: string, underwater = false): Promise<Result> {
  const u = await requireUser();
  if ((await roleIn(campaignId, u.id)) !== "DM") return fail("Only the DM can set up encounters");
  if (name.trim().length < 1 || name.length > 80) return fail("Give the encounter a name");
  const e = await prisma.encounter.create({ data: { campaignId, name: name.trim(), environment: { underwater } } });
  refresh(campaignId);
  return { ok: true, id: e.id };
}

export async function addParty(encounterId: string): Promise<Result> {
  const ctx = await context(encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!ctx.isDm) return fail("Only the DM can add combatants");
  const links = await prisma.campaignCharacter.findMany({ where: { campaignId: ctx.enc.campaignId }, include: { character: true } });
  const have = new Set(ctx.enc.combatants.map((c) => c.characterId));
  const create: Prisma.CombatantUncheckedCreateInput[] = [];
  let slot = 0;
  for (const { character } of links) {
    if (have.has(character.id)) continue;
    const s = characterCombatStats(character as never);
    create.push({
      encounterId, kind: "character", characterId: character.id, name: character.name, dexMod: s.dexMod, ac: s.ac,
      hp: character.currentHp, maxHp: s.maxHp, tempHp: character.tempHp, speed: s.speed, defenses: s.defenses as object,
      deathSaves: character.deathSaves as object, defeated: (character.conditions as string[]).includes("dead"),
      x: 1, y: 2 + slot * 2, extra: { attacksPerAction: s.attacksPerAction, initiativeBonus: s.initiativeBonus, stable: (character.conditions as string[]).includes("stable") },
    });
    slot++;
  }
  if (!create.length) return fail("Everyone in the party is already in this encounter");
  await commit(ctx.enc, ctx.user, { create, lines: [`${create.length} heroes join the encounter`] });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

export async function addMonster(encounterId: string, creatureIndex: string, count = 1, hidden = false): Promise<Result> {
  const ctx = await context(encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!ctx.isDm) return fail("Only the DM can add combatants");
  if (!Number.isInteger(count) || count < 1 || count > 20) return fail("Add between 1 and 20 creatures");
  const m = await prisma.creature.findFirst({ where: { index: creatureIndex, OR: [{ campaignId: null }, { campaignId: ctx.enc.campaignId }] } });
  if (!m) return fail("Unknown creature");
  const s = monsterStats(m);
  const existing = ctx.enc.combatants.filter((c) => c.creatureIndex === creatureIndex).length;
  const create: Prisma.CombatantUncheckedCreateInput[] = Array.from({ length: count }, (_, i) => ({
    encounterId, kind: "monster", creatureIndex, name: count + existing > 1 ? `${m.name} ${existing + i + 1}` : m.name,
    dexMod: s.dexMod, ac: s.ac, hp: s.hp, maxHp: s.hp, speed: s.speed, hidden, attacks: s.attacks as unknown as object,
    defenses: s.defenses as object, x: 14 + (i % 3), y: 2 + Math.floor(i / 3) * 2,
    extra: { attacksPerAction: s.attacksPerAction, cr: s.cr, size: s.size, recharge: s.recharge, legendary: s.legendary },
  }));
  await commit(ctx.enc, ctx.user, { create, lines: [`${count} × ${m.name} added`], dmOnly: hidden });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

export async function removeCombatant(combatantId: string): Promise<Result> {
  const row = await prisma.combatant.findUnique({ where: { id: combatantId } });
  if (!row) return fail("Combatant not found");
  const ctx = await context(row.encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!ctx.isDm) return fail("Only the DM can remove combatants");
  await commit(ctx.enc, ctx.user, { remove: [combatantId], lines: [`${row.name} leaves the encounter`], dmOnly: row.hidden });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

export async function setInitiative(combatantId: string, value: number | null): Promise<Result> {
  const row = await prisma.combatant.findUnique({ where: { id: combatantId } });
  if (!row) return fail("Combatant not found");
  const ctx = await context(row.encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!(await canControl(ctx, row))) return fail("Not allowed");
  if (value !== null && !Number.isInteger(value)) return fail("Initiative must be a whole number");
  if (ctx.enc.state === "ACTIVE") return fail("Initiative is fixed once combat starts");
  await prisma.combatant.update({ where: { id: combatantId }, data: { initiative: value } });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

export async function toggleCombatantFlag(combatantId: string, flag: "surprised" | "hidden"): Promise<Result> {
  const row = await prisma.combatant.findUnique({ where: { id: combatantId } });
  if (!row) return fail("Combatant not found");
  const ctx = await context(row.encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!ctx.isDm) return fail("Only the DM can do that");
  await prisma.combatant.update({ where: { id: combatantId }, data: { [flag]: !row[flag] } });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

export async function setEnvironment(encounterId: string, env: { underwater?: boolean; mounted?: boolean }): Promise<Result> {
  const ctx = await context(encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!ctx.isDm) return fail("Only the DM can change the environment");
  const prev = (ctx.enc.environment ?? {}) as { underwater?: boolean; mounted?: boolean };
  const next = { ...prev, ...env };
  const lines: string[] = [];
  if (env.underwater !== undefined) lines.push(env.underwater ? "The fight moves underwater" : "The fight is above water");
  if (env.mounted !== undefined) lines.push(env.mounted ? "Mounted combat: mounting costs half your speed, and a controlled mount can only Dash, Disengage or Dodge" : "The fight is on foot");
  await commit(ctx.enc, ctx.user, { encounter: { environment: next as Prisma.InputJsonValue }, lines });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

/** Mount or dismount. On your turn it costs half your speed, and you can do it only once. */
export async function toggleMount(combatantId: string): Promise<Result> {
  const a = await loadActing(combatantId);
  if (a.error) return a.error;
  const { row, ctx } = a;
  const c = rowToCmb(row);
  const active = ctx.enc.state === "ACTIVE" && ctx.enc.combatants[ctx.enc.activeIndex]?.id === row.id;
  let turn = c.turn;
  const cost = mountMoveCost(c.speed);
  if (active) {
    if (turn.mountedThisTurn) return fail("You can mount or dismount only once on your turn");
    if (turn.movement < cost) return fail(`That costs ${cost} feet of movement`);
    turn = { ...turn, movement: turn.movement - cost, mountedThisTurn: true };
  }
  const mounted = !c.mounted;
  const next = { ...c, mounted, mountSpeed: c.mountSpeed ?? 60, turn };
  const rule = mounted ? " A controlled mount acts on your initiative and can only Dash, Disengage or Dodge. An independent mount rolls its own initiative." : "";
  await commit(ctx.enc, ctx.user, { update: [next], lines: [`${c.name} ${mounted ? `mounts (speed ${next.mountSpeed} ft, ${active ? `${cost} ft` : "free"})` : "dismounts"}.${rule}`], dmOnly: row.hidden });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

/** Tell the creature who readied an action that the DM has seen the trigger. */
export async function signalReady(combatantId: string): Promise<Result> {
  const row = await prisma.combatant.findUnique({ where: { id: combatantId } });
  if (!row) return fail("Combatant not found");
  const ctx = await context(row.encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!ctx.isDm) return fail("Only the DM can call a trigger");
  if (!row.readied) return fail("Nothing is readied");
  const owner = row.characterId ? await prisma.character.findUnique({ where: { id: row.characterId }, select: { ownerId: true } }) : null;
  await prisma.campaignEvent.create({
    data: {
      campaignId: ctx.enc.campaignId,
      actorId: ctx.user.id,
      type: "chat",
      audience: owner ? `USER:${owner.ownerId}` : "ALL",
      payload: { actorName: ctx.user.name ?? "DM", text: `Your trigger happened: ${row.readied}. Use your reaction.`, whisper: !!owner },
    },
  });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

/** Use a recharge ability. With a target, a parsed save and damage roll are applied (half on a successful save). */
export async function rechargeAbility(combatantId: string, name: string, targetId?: string): Promise<Result> {
  const a = await loadActing(combatantId);
  if (a.error) return a.error;
  const { row, ctx } = a;
  const c = rowToCmb(row);
  if (!c.recharge?.length) return fail("No recharge abilities");
  const ability = c.recharge.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (!ability) return fail("Unknown ability");
  const spent = spendRecharge(c.recharge, ability.name);
  if (!spent) return fail(`${ability.name} has not recharged`);
  const lines = [`${c.name} uses ${ability.name}`];
  let targetUpdate: Cmb | null = null;
  if (ability.dice) {
    const rolled = rollDamage(ability.dice, 0);
    let amount = rolled.total;
    if (targetId && ability.saveDc && ability.saveAbility) {
      const targetRow = ctx.enc.combatants.find((r) => r.id === targetId);
      if (!targetRow) return fail("Target not found");
      const target = rowToCmb(targetRow);
      const key = ability.saveAbility as "str" | "dex" | "con" | "int" | "wis" | "cha";
      const bonus = target.defenses.saves?.[key] ?? (key === "dex" ? target.dexMod : 0);
      const save = rollD20(bonus);
      const ok = save.total >= ability.saveDc;
      amount = ok ? Math.floor(amount / 2) : amount;
      lines.push(`${target.name} ${ok ? "saves" : "fails"} (${save.total} vs DC ${ability.saveDc})`);
      if (amount > 0) {
        const hit = absorbDamage(target, amount);
        targetUpdate = hit.cmb;
        lines.push(`${target.name} takes ${amount} ${ability.damageType ?? ""} damage`.trim(), ...hit.lines);
      }
    } else {
      lines.push(`${rolled.total} ${ability.damageType ?? "damage"}${ability.saveDc ? ` before the DC ${ability.saveDc} save` : ""}`);
    }
  }
  const update = [{ ...c, recharge: spent }, ...(targetUpdate ? [targetUpdate] : [])];
  await commit(ctx.enc, ctx.user, { update, lines, dmOnly: row.hidden });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

/** One legendary action at the end of another creature's turn. The pool refills at the start of this creature's turn. */
export async function legendaryAction(combatantId: string, option?: string): Promise<Result> {
  const row = await prisma.combatant.findUnique({ where: { id: combatantId } });
  if (!row) return fail("Combatant not found");
  const ctx = await context(row.encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!ctx.isDm) return fail("Only the DM uses legendary actions");
  if (ctx.enc.state !== "ACTIVE") return fail("The encounter is not running");
  if (ctx.enc.combatants[ctx.enc.activeIndex]?.id === row.id) return fail("Legendary actions happen at the end of someone else's turn");
  const c = rowToCmb(row);
  if (!c.legendary) return fail("No legendary actions");
  const chosen = option ? c.legendary.options.find((o) => o.name.toLowerCase() === option.toLowerCase()) : undefined;
  if (option && !chosen) return fail("Unknown legendary action");
  const cost = chosen?.cost ?? 1;
  const next = spendLegendary(c.legendary, cost);
  if (!next) return fail(c.legendary.pending ? "Only one legendary action at the end of a turn" : "Not enough legendary actions");
  await commit(ctx.enc, ctx.user, { update: [{ ...c, legendary: next }], lines: [`${c.name} uses ${chosen?.name ?? "a legendary action"} (${next.left} left)`], dmOnly: row.hidden });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------- the fight

/** Roll any missing initiative, order everyone, and start round 1 (surprised creatures lose their first turn). */
export async function startEncounter(encounterId: string): Promise<Result> {
  const ctx = await context(encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!ctx.isDm) return fail("Only the DM can start the encounter");
  if (ctx.enc.state === "ACTIVE") return fail("The encounter is already running");
  if (ctx.enc.combatants.length === 0) return fail("Add combatants first");

  const ordered = rollInitiative(
    ctx.enc.combatants.map((r) => ({ id: r.id, name: r.name, dexModifier: r.dexMod, initiative: r.initiative ?? undefined, initiativeBonus: (r.extra as { initiativeBonus?: number } | null)?.initiativeBonus ?? 0 })),
  );
  const rank = new Map(ordered.map((o, i) => [o.id, i]));
  const sorted = [...ctx.enc.combatants].sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
  const first = sorted.findIndex((r) => !r.defeated);
  if (first < 0) return fail("Everyone is defeated");

  const lines = [`Combat begins. Initiative: ${ordered.map((o) => `${ctx.enc.combatants.find((r) => r.id === o.id)!.name} ${o.initiative}`).join(", ")}`];
  const updated: Cmb[] = sorted.map((r, i) => {
    const c = { ...rowToCmb(r), initiative: ordered[i].initiative ?? 0 };
    // everyone starts with a fresh economy; surprised creatures cannot act or react on their first turn
    const begun = beginTurn(c);
    if (i === first) lines.push(...begun.lines);
    return i === first ? begun.cmb : { ...c, turn: begun.cmb.turn };
  });
  await prisma.$transaction(sorted.map((r, i) => prisma.combatant.update({ where: { id: r.id }, data: { turnOrder: i, initiative: ordered[i].initiative ?? 0 } })));
  const reloaded = (await loadEncounter(encounterId))!;
  await commit(reloaded, ctx.user, { update: updated, encounter: { state: "ACTIVE", round: 1, activeIndex: first }, lines });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

export async function endTurn(encounterId: string): Promise<Result> {
  const ctx = await context(encounterId);
  if (!isCtx(ctx)) return ctx;
  const { enc } = ctx;
  if (enc.state !== "ACTIVE") return fail("The encounter is not running");
  const row = enc.combatants[enc.activeIndex];
  if (!row) return fail("No active combatant");
  if (!(await canControl(ctx, row))) return fail("It is not your turn");

  const lines: string[] = [];
  const done = finishTurn(rowToCmb(row));
  lines.push(...done.lines);
  const releasePending = (c: Cmb): Cmb => (c.legendary?.pending ? { ...c, legendary: { ...c.legendary, pending: false } } : c);
  const order = enc.combatants.map((r) => ({ id: r.id, defeated: r.id === row.id ? done.cmb.defeated : r.defeated }));
  const next = advance(order, enc.activeIndex, enc.round);
  const nextRow = enc.combatants[next.activeIndex];
  const started = beginTurn(rowToCmb(nextRow));
  lines.push(...started.lines);
  const wrapped = next.round > enc.round ? [`Round ${next.round} begins`] : [];
  lines.unshift(`${row.name} ends their turn`, ...wrapped, `${nextRow.name}'s turn`);
  const finished = releasePending(done.cmb);
  const others = enc.combatants.filter((r) => r.id !== row.id && r.id !== nextRow.id).flatMap((r) => {
    const c = rowToCmb(r);
    return c.legendary?.pending ? [releasePending(c)] : [];
  });
  const update = [finished, ...others, ...(nextRow.id === row.id ? [] : [started.cmb])];
  if (nextRow.id === row.id) update[0] = started.cmb;
  await commit(enc, ctx.user, { update, encounter: { round: next.round, activeIndex: next.activeIndex }, lines, dmOnly: row.hidden && nextRow.hidden });
  refresh(enc.campaignId);
  return { ok: true };
}

/** Actions that take your turn's action (or reaction for Ready). The active creature's controller, or the DM. */
export async function takeAction(combatantId: string, action: SimpleAction, trigger?: string): Promise<Result> {
  const a = await loadActing(combatantId);
  if (a.error) return a.error;
  const { row, ctx } = a;
  if (ctx.enc.state !== "ACTIVE") return fail("The encounter is not running");
  if (ctx.enc.combatants[ctx.enc.activeIndex]?.id !== row.id) return fail("It is not that creature's turn");
  try {
    const r = spendSimpleAction(rowToCmb(row), action);
    let line = r.line;
    if (action === "ready") {
      if (!trigger?.trim()) return fail("Describe the trigger for your readied action");
      await prisma.combatant.update({ where: { id: row.id }, data: { readied: trigger.trim().slice(0, 200) } });
      line += `: "${trigger.trim()}"`;
    }
    // Help: the next attack by an ally against that foe has advantage; we flag the helper and let the DM apply it
    await commit(ctx.enc, ctx.user, { update: [r.cmb], lines: [line], dmOnly: row.hidden });
  } catch (e) {
    return fail((e as Error).message);
  }
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

/** Use your reaction, e.g. to carry out a readied action. */
export async function takeReaction(combatantId: string, note?: string): Promise<Result> {
  const a = await loadActing(combatantId);
  if (a.error) return a.error;
  const { row, ctx } = a;
  if (ctx.enc.state !== "ACTIVE") return fail("The encounter is not running");
  try {
    const c = spendReaction(rowToCmb(row));
    const text = row.readied ? `${row.name} executes the readied action "${row.readied}"` : `${row.name} uses their reaction${note ? `: ${note}` : ""}`;
    await commit(ctx.enc, ctx.user, { update: [c], lines: [text], dmOnly: row.hidden });
    if (row.readied) await prisma.combatant.update({ where: { id: row.id }, data: { readied: null } });
  } catch (e) {
    return fail((e as Error).message);
  }
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

export type AttackRequest = {
  attackerId: string; targetId: string; attack: string; cover?: Cover; offHand?: boolean; reaction?: boolean; advantage?: boolean; disadvantage?: boolean;
  /** Paladin: spend a spell slot of this level on a hit for Divine Smite (2d8, +1d8 per level above 1st, max 5d8) */
  smiteSlot?: number;
  /** Rogue: add Sneak Attack damage (once per turn; needs advantage or an ally next to the target) */
  sneakAttack?: boolean;
};

export async function attack(req: AttackRequest): Promise<Result> {
  const a = await loadActing(req.attackerId);
  if (a.error) return a.error;
  const { row, ctx } = a;
  const { enc } = ctx;
  if (enc.state !== "ACTIVE") return fail("The encounter is not running");
  if (!req.reaction && enc.combatants[enc.activeIndex]?.id !== row.id) return fail("It is not that creature's turn");
  const targetRow = enc.combatants.find((r) => r.id === req.targetId);
  if (!targetRow) return fail("Target not found");
  if (targetRow.id === row.id) return fail("You cannot attack yourself");

  let profiles: AttackProfile[];
  if (row.kind === "character" && row.characterId) {
    const ch = await prisma.character.findUnique({ where: { id: row.characterId } });
    profiles = ch ? characterProfiles(ch as never) : [];
  } else profiles = profilesOf(row);
  const profile = profiles.find((p) => p.name === req.attack);
  if (!profile) return fail("That attack is not available");
  if (req.offHand && !profile.light) return fail("Off-hand attacks need a light weapon");

  const attacker = rowToCmb(row);
  const target = rowToCmb(targetRow);
  const both = attacker.x !== null && attacker.y !== null && target.x !== null && target.y !== null;
  const dist = both ? distanceFeet({ x: attacker.x!, y: attacker.y! }, { x: target.x!, y: target.y! }) : undefined;
  const near = both ? adjacent({ x: attacker.x!, y: attacker.y! }, { x: target.x!, y: target.y! }) : profile.melee;
  if (profile.melee && both && dist! > (profile.reach ?? 5)) return fail(`${target.name} is out of reach (${dist} ft)`);

  // class features that add damage on a hit
  const bonusDamage: { dice: string; type?: string; label?: string }[] = [];
  let smiteLevel = 0;
  let sneak = false;
  const sheet = row.kind === "character" && row.characterId ? await prisma.character.findUnique({ where: { id: row.characterId } }) : null;
  const classLevel = (idx: string) => ((sheet?.classes as { classIndex: string; level: number }[] | undefined) ?? []).find((k) => k.classIndex === idx)?.level ?? 0;
  if (req.smiteSlot) {
    if (classLevel("paladin") < 2) return fail("Divine Smite needs a paladin of level 2 or higher");
    if (!profile.melee) return fail("Divine Smite works on melee weapon attacks");
    if (!Number.isInteger(req.smiteSlot) || req.smiteSlot < 1 || req.smiteSlot > 5) return fail("Choose a slot from 1st to 5th level");
    const slots = slotViews(sheet as never).slots.find((x) => x.level === req.smiteSlot);
    if (!slots || slots.total - slots.used < 1) return fail(`No level ${req.smiteSlot} slot left`);
    smiteLevel = req.smiteSlot;
    bonusDamage.push({ dice: `${Math.min(5, 1 + smiteLevel)}d8`, type: "radiant", label: "Divine Smite" });
  }
  if (req.sneakAttack) {
    const rogue = classLevel("rogue");
    if (!rogue) return fail("Sneak Attack is a rogue feature");
    if (!profile.finesse && profile.melee) return fail("Sneak Attack needs a finesse or ranged weapon");
    if (attacker.turn.sneakUsed) return fail("Sneak Attack is already used this turn");
    const allyNear = enc.combatants.some(
      (r) => r.id !== row.id && sideOf(r) === sideOf(row) && !r.defeated && target.x !== null && target.y !== null && r.x !== null && r.y !== null && adjacent({ x: r.x, y: r.y }, { x: target.x, y: target.y }),
    );
    if (!req.advantage && !allyNear) return fail("Sneak Attack needs advantage on the roll or an ally within 5 feet of the target");
    if (req.disadvantage && !allyNear) return fail("You have disadvantage on this attack");
    sneak = true;
    bonusDamage.push({ dice: `${Math.ceil(rogue / 2)}d6`, label: "Sneak Attack" });
  }

  let flank = false;
  if (both) {
    const campaign = await prisma.campaign.findUnique({ where: { id: enc.campaignId }, select: { settings: true } });
    if (readHouseRules(campaign?.settings).flanking) {
      const allies = enc.combatants.filter((r) => r.id !== row.id && sideOf(r) === sideOf(row) && !r.defeated && r.x !== null && r.y !== null);
      flank = isFlanking({ x: attacker.x!, y: attacker.y! }, { x: target.x!, y: target.y! }, allies.map((r) => ({ x: r.x!, y: r.y! })));
    }
  }

  let out;
  try {
    out = resolveAttackAction(attacker, target, profile, {
      cover: req.cover, withinFiveFeet: near, distanceFeet: dist, offHand: req.offHand, reaction: req.reaction,
      underwater: !!(enc.environment as { underwater?: boolean } | null)?.underwater,
      extraAdvantage: (req.advantage ? 1 : 0) + (flank ? 1 : 0), extraDisadvantage: req.disadvantage ? 1 : 0, bonusDamage,
    });
  } catch (e) {
    return fail((e as Error).message);
  }

  const lines = [...out.lines];
  const before = enc.combatants.map(rowToCmb);
  const usedBonus = out.hit && sneak;
  const attackerAfter = usedBonus ? { ...out.attacker, turn: { ...out.attacker.turn, sneakUsed: true } } : out.attacker;
  let state = before.map((c) => (c.id === attackerAfter.id ? attackerAfter : c.id === out.target.id ? out.target : c));
  if (out.concentrationDc) state = concentrationRolls(state, [{ id: target.id, dc: out.concentrationDc }], lines);
  state = dropForDowned(state, lines);
  await clearSheetConcentration(enc.combatants, before, state);

  // the slot is spent only if the smite actually landed
  if (out.hit && smiteLevel && row.characterId) await adjustSlot(row.characterId, smiteLevel, 1);

  await commit(enc, ctx.user, { update: changed(before, state), lines, dmOnly: row.hidden || targetRow.hidden });
  refresh(enc.campaignId);
  return { ok: true };
}

export async function grappleOrShove(attackerId: string, targetId: string, kind: "grapple" | "shove-prone" | "shove-push"): Promise<Result> {
  const a = await loadActing(attackerId);
  if (a.error) return a.error;
  const { row, ctx } = a;
  const { enc } = ctx;
  if (enc.state !== "ACTIVE" || enc.combatants[enc.activeIndex]?.id !== row.id) return fail("It is not that creature's turn");
  const targetRow = enc.combatants.find((r) => r.id === targetId);
  if (!targetRow) return fail("Target not found");
  const sizeOf = (r: Combatant) => ((r.extra as { size?: string } | null)?.size ?? "Medium");
  try {
    const out = resolveGrappleAction(rowToCmb(row), rowToCmb(targetRow), kind, { attacker: sizeOf(row), target: sizeOf(targetRow) });
    await commit(enc, ctx.user, { update: [out.attacker, out.target], lines: [out.line], dmOnly: row.hidden || targetRow.hidden });
  } catch (e) {
    return fail((e as Error).message);
  }
  refresh(enc.campaignId);
  return { ok: true };
}

/** Move a token. Costs movement (difficult terrain and crawling count), and reports who gets an opportunity attack. */
export async function moveCombatant(combatantId: string, x: number, y: number): Promise<Result & { provokes?: string[] }> {
  const a = await loadActing(combatantId);
  if (a.error) return a.error;
  const { row, ctx } = a;
  const { enc } = ctx;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= enc.gridWidth || y >= enc.gridHeight) return fail("That square is off the map");
  const c = rowToCmb(row);
  const from = c.x !== null && c.y !== null ? { x: c.x, y: c.y } : null;
  const to = { x, y };

  // the DM can reposition anyone for free; creatures moving on their own turn spend movement
  const isActive = enc.state === "ACTIVE" && enc.combatants[enc.activeIndex]?.id === row.id;
  if (!ctx.isDm && enc.state === "ACTIVE" && !isActive) return fail("It is not that creature's turn");
  const lines: string[] = [];
  let provokes: string[] = [];
  let next = { ...c, x, y };
  if (from && isActive) {
    const cost = moveCost(from, to, { width: enc.gridWidth, height: enc.gridHeight, crawling: c.conditions.some((k) => k.condition === "prone") });
    if (!cost.ok) return fail(cost.reason);
    if (cost.feet > c.turn.movement) return fail(`Not enough movement (${cost.feet} ft needed, ${c.turn.movement} ft left)`);
    next = { ...next, turn: { ...c.turn, movement: c.turn.movement - cost.feet } };
    lines.push(`${c.name} moves ${cost.feet} ft`);
    if (!c.turn.disengaged) {
      const foes = enc.combatants
        .filter((r) => sideOf(r) !== sideOf(row) && !r.defeated && r.x !== null && r.y !== null)
        .filter((r) => rowToCmb(r).turn.reaction)
        .map((r) => ({ id: r.id, at: { x: r.x!, y: r.y! }, reach: Math.max(5, ...profilesOf(r).filter((p) => p.melee).map((p) => p.reach ?? 5)) }));
      provokes = opportunityAttackers(from, to, foes);
      if (provokes.length) {
        const names = provokes.map((id) => enc.combatants.find((r) => r.id === id)!.name);
        lines.push(`${names.join(", ")} can make an opportunity attack${c.mounted ? " (choose the mount or the rider)" : ""}`);
      }
    }
  } else {
    lines.push(`${c.name} is placed on the map`);
  }
  await commit(enc, ctx.user, { update: [next], lines, dmOnly: row.hidden });
  if (provokes.length) {
    const attackers = enc.combatants.filter((r) => provokes.includes(r.id) && r.characterId);
    const chars = attackers.length
      ? await prisma.character.findMany({ where: { id: { in: attackers.map((r) => r.characterId!) } }, select: { id: true, ownerId: true } })
      : [];
    const owner = new Map(chars.map((ch) => [ch.id, ch.ownerId]));
    for (const attacker of attackers) {
      const userId = owner.get(attacker.characterId!);
      if (!userId) continue;
      await prisma.campaignEvent.create({
        data: {
          campaignId: enc.campaignId,
          actorId: ctx.user.id,
          type: "chat",
          audience: `USER:${userId}`,
          payload: { actorName: ctx.user.name ?? "DM", text: `${c.name} left your reach. You can make an opportunity attack.`, whisper: true },
        },
      });
    }
  }
  refresh(enc.campaignId);
  return { ok: true, provokes };
}

/** Stand up from prone: costs half your speed (PHB p.190). */
export async function standFromProne(combatantId: string): Promise<Result> {
  const a = await loadActing(combatantId);
  if (a.error) return a.error;
  const { row, ctx } = a;
  const c = rowToCmb(row);
  if (!c.conditions.some((k) => k.condition === "prone")) return fail("Not prone");
  try {
    const turn = standUp(c.turn, c.speed);
    await commit(ctx.enc, ctx.user, { update: [{ ...c, turn, conditions: removeCondition(c.conditions, "prone") }], lines: [`${c.name} stands up`], dmOnly: row.hidden });
  } catch (e) {
    return fail((e as Error).message);
  }
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------- DM controls

export async function addConditionTo(targetId: string, condition: string, rounds?: number): Promise<Result> {
  const row = await prisma.combatant.findUnique({ where: { id: targetId } });
  if (!row) return fail("Combatant not found");
  const ctx = await context(row.encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!ctx.isDm) return fail("Only the DM can apply conditions");
  if (!isCondition(condition)) return fail("Unknown condition");
  const c = rowToCmb(row);
  await commit(ctx.enc, ctx.user, {
    update: [{ ...c, conditions: addCondition(c.conditions, { condition, rounds: rounds && rounds > 0 ? rounds : undefined }) }],
    lines: [`${c.name} is ${condition}${rounds ? ` for ${rounds} round${rounds > 1 ? "s" : ""}` : ""}`], dmOnly: row.hidden,
  });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

export async function removeConditionFrom(targetId: string, condition: string): Promise<Result> {
  const row = await prisma.combatant.findUnique({ where: { id: targetId } });
  if (!row) return fail("Combatant not found");
  const ctx = await context(row.encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!ctx.isDm) return fail("Only the DM can remove conditions");
  if (!isCondition(condition)) return fail("Unknown condition");
  const c = rowToCmb(row);
  await commit(ctx.enc, ctx.user, { update: [{ ...c, conditions: removeCondition(c.conditions, condition) }], lines: [`${c.name} is no longer ${condition}`], dmOnly: row.hidden });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

/** DM adjustments: damage, healing or temp HP applied through the same rules as attacks. */
export async function adjustHitPoints(targetId: string, kind: "damage" | "heal" | "temp", amount: number): Promise<Result> {
  const row = await prisma.combatant.findUnique({ where: { id: targetId } });
  if (!row) return fail("Combatant not found");
  const ctx = await context(row.encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!ctx.isDm) return fail("Only the DM can adjust hit points");
  if (!Number.isInteger(amount) || amount <= 0) return fail("Enter an amount above zero");
  const c = rowToCmb(row);
  const v = toVitals(c);
  if (kind === "damage") {
    const hit = absorbDamage(c, amount);
    await commit(ctx.enc, ctx.user, { update: [hit.cmb], lines: [`${c.name} takes ${amount} damage`, ...hit.lines], dmOnly: row.hidden });
  } else {
    const after = kind === "heal" ? heal(v, amount) : { ...v, tempHp: Math.max(v.tempHp, amount) };
    await commit(ctx.enc, ctx.user, {
      update: [fromVitals(c, after)],
      lines: [`${c.name} ${kind === "heal" ? `heals ${amount}` : `gains ${amount} temporary HP`}`],
      dmOnly: row.hidden,
    });
  }
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

/** Falling: 1d6 bludgeoning per 10 feet, maximum 20d6, and the creature lands prone. */
export async function applyFall(combatantId: string, feet: number): Promise<Result> {
  const row = await prisma.combatant.findUnique({ where: { id: combatantId } });
  if (!row) return fail("Combatant not found");
  const ctx = await context(row.encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!ctx.isDm) return fail("Only the DM can apply a fall");
  if (!Number.isInteger(feet) || feet < 10 || feet > 10000) return fail("Enter the fall in feet, at least 10");
  const rolled = fallDamage(feet);
  const c = rowToCmb(row);
  const hit = absorbDamage(c, rolled.damage);
  const conditions = hit.cmb.conditions.some((k) => k.condition === "prone") ? hit.cmb.conditions : addCondition(hit.cmb.conditions, { condition: "prone" });
  await commit(ctx.enc, ctx.user, { update: [{ ...hit.cmb, conditions }], lines: [`${c.name} falls ${feet} ft for ${rolled.damage} bludgeoning damage (${rolled.dice}d6) and lands prone`, ...hit.lines], dmOnly: row.hidden });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

/** A creature that can no longer hold its breath drops to 0 hit points. */
export async function suffocate(combatantId: string): Promise<Result> {
  const row = await prisma.combatant.findUnique({ where: { id: combatantId } });
  if (!row) return fail("Combatant not found");
  const ctx = await context(row.encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!ctx.isDm) return fail("Only the DM can do that");
  const c = rowToCmb(row);
  const hit = absorbDamage(c, c.hp + c.tempHp);
  await commit(ctx.enc, ctx.user, { update: [hit.cmb], lines: [`${c.name} runs out of breath and drops to 0 hit points`, ...hit.lines], dmOnly: row.hidden });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

/** One level of exhaustion, the usual result of going without food long enough. */
export async function starve(combatantId: string): Promise<Result> {
  const row = await prisma.combatant.findUnique({ where: { id: combatantId } });
  if (!row) return fail("Combatant not found");
  const ctx = await context(row.encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!ctx.isDm) return fail("Only the DM can do that");
  const c = rowToCmb(row);
  const exhaustion = Math.min(6, (c.exhaustion ?? 0) + 1);
  await commit(ctx.enc, ctx.user, { update: [{ ...c, exhaustion }], lines: [`${c.name} gains a level of exhaustion (${exhaustion})`], dmOnly: row.hidden });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------- finishing

const CR_KEY: Record<number, string> = { 0: "0", 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" };

/** End the fight: award XP for defeated foes to the party, clear turn state. This cannot be undone. */
export async function endEncounter(encounterId: string): Promise<Result> {
  const ctx = await context(encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!ctx.isDm) return fail("Only the DM can end the encounter");
  const { enc } = ctx;
  if (enc.state === "DONE") return fail("This encounter is already over");

  const defeated = enc.combatants.filter((r) => r.kind !== "character" && r.defeated);
  const xp = defeated.reduce((s, r) => {
    const cr = (r.extra as { cr?: number } | null)?.cr;
    return s + (cr === undefined ? 0 : xpForChallenge(CR_KEY[cr] ?? String(cr)));
  }, 0);
  const party = enc.combatants.filter((r) => r.kind === "character" && r.characterId);
  const each = party.length ? Math.floor(xp / party.length) : 0;

  await prisma.$transaction(async (tx) => {
    if (each > 0) for (const r of party) await tx.character.update({ where: { id: r.characterId! }, data: { xp: { increment: each } } });
    await tx.encounter.update({ where: { id: enc.id }, data: { state: "DONE" } });
    await tx.campaignEvent.create({
      data: {
        campaignId: enc.campaignId, actorId: ctx.user.id, type: "combat", audience: "ALL",
        payload: {
          actorName: ctx.user.name, encounterId: enc.id, done: true,
          text: `${enc.name} is over. ${defeated.length} foes defeated${xp ? `, ${xp} XP total (${each} each)` : ""}`,
        },
      },
    });
  });
  refresh(enc.campaignId);
  return { ok: true };
}

/** DM undo: restore the state from before the most recent combat action in this encounter. */
export async function undoLast(encounterId: string): Promise<Result> {
  const ctx = await context(encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!ctx.isDm) return fail("Only the DM can undo");
  const events = await prisma.campaignEvent.findMany({ where: { campaignId: ctx.enc.campaignId, type: "combat" }, orderBy: { id: "desc" }, take: 50 });
  const ev = events.find((e) => {
    const p = e.payload as { encounterId?: string; undone?: boolean; undo?: unknown; done?: boolean };
    return p.encounterId === encounterId && !p.undone && !!p.undo && !p.done;
  });
  if (!ev) return fail("Nothing to undo");
  const p = ev.payload as unknown as { text: string; undo: { rows: Combatant[]; removedRows: Combatant[]; createdIds: string[]; encounter: { state: string; round: number; activeIndex: number; environment: unknown } } };
  const u = p.undo;

  await prisma.$transaction(async (tx) => {
    if (u.createdIds.length) await tx.combatant.deleteMany({ where: { id: { in: u.createdIds } } });
    for (const raw of u.rows) {
      const row = raw as unknown as Combatant;
      const { id, encounterId: _e, characterId, createdAt: _c, ...data } = row as Combatant & Record<string, unknown>;
      void _e; void _c;
      await tx.combatant.update({ where: { id }, data: data as Prisma.CombatantUpdateInput });
      if (row.kind === "character" && characterId) {
        const c = rowToCmb({ ...row, createdAt: new Date() });
        await tx.character.update({ where: { id: characterId }, data: { currentHp: c.hp, tempHp: c.tempHp, deathSaves: c.deathSaves, conditions: [...c.conditions.map((x) => x.condition), ...(c.defeated ? ["dead"] : []), ...(c.stable ? ["stable"] : [])] } });
      }
    }
    for (const raw of u.removedRows) {
      const { createdAt: _c, ...data } = raw as unknown as Combatant & Record<string, unknown>;
      void _c;
      await tx.combatant.create({ data: data as unknown as Prisma.CombatantUncheckedCreateInput });
    }
    await tx.encounter.update({ where: { id: encounterId }, data: { state: u.encounter.state, round: u.encounter.round, activeIndex: u.encounter.activeIndex, environment: (u.encounter.environment ?? {}) as Prisma.InputJsonValue } });
    await tx.campaignEvent.update({ where: { id: ev.id }, data: { payload: { ...(ev.payload as object), undone: true } } });
    await tx.campaignEvent.create({
      data: { campaignId: ctx.enc.campaignId, actorId: ctx.user.id, type: "combat", audience: "ALL", payload: { actorName: ctx.user.name, encounterId, text: `The DM undoes: ${p.text}` } },
    });
  });
  refresh(ctx.enc.campaignId);
  return { ok: true };
}
