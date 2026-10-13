"use server";

import type { Combatant, Encounter, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { rollInitiative, standUp, type Cover } from "@/engine/combat";
import { moveCost, opportunityAttackers, distanceFeet, withinFiveFeet as adjacent } from "@/engine/combat/grid";
import { addCondition, isCondition, removeCondition } from "@/engine/conditions/timers";
import { applyDamage, heal } from "@/engine/damage";
import { checkConcentration } from "@/engine/spells";
import { xpForChallenge } from "@/engine/xp";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { characterCombatStats, characterProfiles, monsterStats } from "./profiles";
import { commit, type Actor } from "./commit";
import {
  advance, beginTurn, finishTurn, fromVitals, resolveAttackAction, resolveGrappleAction, spendReaction, spendSimpleAction,
  toVitals, type AttackProfile, type Cmb, type SimpleAction,
} from "./rules";
import { loadEncounter, profilesOf, roleIn, rowToCmb } from "./store";

type Result = { ok: true; id?: string } | { ok: false; errors: string[] };
const fail = (m: string): Result => ({ ok: false, errors: [m] });
const refresh = (campaignId: string) => {
  revalidatePath(`/campaigns/${campaignId}/combat`);
};

type Ctx = { user: Actor; enc: Encounter & { combatants: Combatant[] }; isDm: boolean };

async function context(encounterId: string): Promise<Ctx | Result> {
  const u = await requireUser();
  const enc = await loadEncounter(encounterId);
  if (!enc) return fail("Encounter not found");
  const role = await roleIn(enc.campaignId, u.id);
  if (!role) return fail("You are not in this campaign");
  return { user: { id: u.id, name: u.name ?? "Someone" }, enc, isDm: role === "DM" };
}
const isCtx = (c: Ctx | Result): c is Ctx => "enc" in c;

async function ownsCharacter(userId: string, characterId: string | null) {
  if (!characterId) return false;
  return !!(await prisma.character.findFirst({ where: { id: characterId, ownerId: userId }, select: { id: true } }));
}

async function canControl(ctx: Ctx, row: Combatant) {
  return ctx.isDm || (await ownsCharacter(ctx.user.id, row.characterId));
}

const sideOf = (c: { kind: string }) => (c.kind === "character" ? "party" : "foes");

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
  const m = await prisma.creature.findUnique({ where: { index: creatureIndex } });
  if (!m) return fail("Unknown creature");
  const s = monsterStats(m);
  const existing = ctx.enc.combatants.filter((c) => c.creatureIndex === creatureIndex).length;
  const create: Prisma.CombatantUncheckedCreateInput[] = Array.from({ length: count }, (_, i) => ({
    encounterId, kind: "monster", creatureIndex, name: count + existing > 1 ? `${m.name} ${existing + i + 1}` : m.name,
    dexMod: s.dexMod, ac: s.ac, hp: s.hp, maxHp: s.hp, speed: s.speed, hidden, attacks: s.attacks as unknown as object,
    defenses: s.defenses as object, x: 14 + (i % 3), y: 2 + Math.floor(i / 3) * 2,
    extra: { attacksPerAction: s.attacksPerAction, cr: s.cr, size: s.size },
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

export async function setEnvironment(encounterId: string, env: { underwater?: boolean }): Promise<Result> {
  const ctx = await context(encounterId);
  if (!isCtx(ctx)) return ctx;
  if (!ctx.isDm) return fail("Only the DM can change the environment");
  await commit(ctx.enc, ctx.user, { encounter: { environment: env as Prisma.InputJsonValue }, lines: [env.underwater ? "The fight moves underwater" : "The fight is above water"] });
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
  const order = enc.combatants.map((r) => ({ id: r.id, defeated: r.id === row.id ? done.cmb.defeated : r.defeated }));
  const next = advance(order, enc.activeIndex, enc.round);
  const nextRow = enc.combatants[next.activeIndex];
  const started = beginTurn(rowToCmb(nextRow));
  lines.push(...started.lines);
  const wrapped = next.round > enc.round ? [`Round ${next.round} begins`] : [];
  lines.unshift(`${row.name} ends their turn`, ...wrapped, `${nextRow.name}'s turn`);
  const update = [done.cmb, ...(nextRow.id === row.id ? [] : [started.cmb])];
  if (nextRow.id === row.id) update[0] = started.cmb;
  await commit(enc, ctx.user, { update, encounter: { round: next.round, activeIndex: next.activeIndex }, lines, dmOnly: row.hidden && nextRow.hidden });
  refresh(enc.campaignId);
  return { ok: true };
}

type Acting = { error: Result; row?: undefined; ctx?: undefined } | { error?: undefined; row: Combatant; ctx: Ctx };

async function loadActing(combatantId: string): Promise<Acting> {
  const row = await prisma.combatant.findUnique({ where: { id: combatantId } });
  if (!row) return { error: fail("Combatant not found") };
  const ctx = await context(row.encounterId);
  if (!isCtx(ctx)) return { error: ctx };
  if (!(await canControl(ctx, row))) return { error: fail("Not allowed") };
  return { row, ctx };
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
export async function useReaction(combatantId: string, note?: string): Promise<Result> {
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

export type AttackRequest = { attackerId: string; targetId: string; attack: string; cover?: Cover; offHand?: boolean; reaction?: boolean; advantage?: boolean; disadvantage?: boolean };

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

  let out;
  try {
    out = resolveAttackAction(attacker, target, profile, {
      cover: req.cover, withinFiveFeet: near, distanceFeet: dist, offHand: req.offHand, reaction: req.reaction,
      underwater: !!(enc.environment as { underwater?: boolean } | null)?.underwater,
      extraAdvantage: req.advantage ? 1 : 0, extraDisadvantage: req.disadvantage ? 1 : 0,
    });
  } catch (e) {
    return fail((e as Error).message);
  }

  let lines = out.lines;
  const hitTarget = out.target;
  if (out.concentrationDc && targetRow.characterId) {
    const ch = await prisma.character.findUnique({ where: { id: targetRow.characterId } });
    const conBonus = ch ? characterCombatStats(ch as never) && (await import("@/lib/characters/derive")).deriveStored(ch).saves.con.total : 0;
    const check = checkConcentration(out.damage, conBonus);
    lines = [...lines, `${target.name} makes a Constitution save (DC ${check.dc}): ${check.roll} - ${check.maintained ? "keeps concentrating" : "concentration is lost"}`];
    if (!check.maintained && ch) {
      const state = (ch.spells ?? {}) as Record<string, unknown>;
      await prisma.character.update({ where: { id: ch.id }, data: { spells: { ...state, concentration: null } as object } });
    }
  }
  await commit(enc, ctx.user, { update: [out.attacker, hitTarget], lines, dmOnly: row.hidden || targetRow.hidden });
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
      if (provokes.length) lines.push(`${provokes.map((id) => enc.combatants.find((r) => r.id === id)!.name).join(", ")} can make an opportunity attack`);
    }
  } else {
    lines.push(`${c.name} is placed on the map`);
  }
  await commit(enc, ctx.user, { update: [next], lines, dmOnly: row.hidden });
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
  const after = kind === "damage" ? applyDamage(v, amount, { diesAtZero: c.kind !== "character" }) : kind === "heal" ? heal(v, amount) : { ...v, tempHp: Math.max(v.tempHp, amount) };
  await commit(ctx.enc, ctx.user, {
    update: [fromVitals(c, after)],
    lines: [`${c.name} ${kind === "damage" ? `takes ${amount} damage` : kind === "heal" ? `heals ${amount}` : `gains ${amount} temporary HP`}${after.dead ? " and dies" : after.hp === 0 && v.hp > 0 ? " and falls unconscious" : ""}`],
    dmOnly: row.hidden,
  });
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
