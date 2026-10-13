"use server";

import type { Prisma } from "@prisma/client";
import { SKILLS, ABILITIES, groupCheckSucceeds, type Ability, type Skill } from "@/engine/abilities";
import { fromCopper, purseValueCp, type Purse } from "@/engine/economy";
import { cryptoRng, rollD20, type RollMode } from "@/engine/dice";
import { burnLights, formatGameTime, journey, newLight, requestDc, resurrect, shiftAttitude, type Attitude, type BurningLight, type LightKind, type ResurrectionKind, type Terrain } from "@/engine/world";
import type { Pace } from "@/engine/exploration";
import { LIGHT_SOURCES } from "@/engine/exploration";
import { XP_THRESHOLDS } from "@/engine/progression";
import { deriveStored, type StoredCharacter } from "@/lib/characters/derive";
import { addCustomItem, changeHitPoints } from "@/lib/characters/sheetActions";
import { fallDamage } from "@/engine/exploration";
import { rollExpression } from "@/engine/dice";
import { takeLongRest, takeShortRest } from "@/lib/characters/playActions";
import { prisma } from "@/lib/prisma";
import { dm, fail, member, partyOf, say, touchWorld, type Result } from "./guard";

type World = { lights?: BurningLight[]; funds?: Purse };
const worldOf = (c: { world: unknown }): World => (c.world && typeof c.world === "object" ? (c.world as World) : {});

// ---------------------------------------------------------------- the clock and light

/** Let time pass: lights burn down, and the table is told what happened. */
export async function advanceTime(campaignId: string, minutes: number, reason = ""): Promise<Result<{ now: string }>> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 14400) return fail("Advance between 1 minute and 10 days");
  const camp = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  const world = worldOf(camp);
  const burned = burnLights(world.lights ?? [], minutes);
  const clock = camp.clockMinutes + minutes;
  await prisma.campaign.update({ where: { id: campaignId }, data: { clockMinutes: clock, world: { ...world, lights: burned.lights } as Prisma.InputJsonValue } });
  const out = burned.wentOut.map((l) => `a ${l.kind.replace("-", " ")} goes out`);
  await say(campaignId, d.user.id, `${reason || `${minutes} minutes pass`}. It is now ${formatGameTime(clock)}${out.length ? `; ${out.join(", ")}` : ""}.`);
  touchWorld(campaignId);
  return { ok: true, now: formatGameTime(clock) };
}

export async function lightSource(campaignId: string, kind: LightKind): Promise<Result> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  if (!(kind in LIGHT_SOURCES)) return fail("Unknown light source");
  const camp = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  const world = worldOf(camp);
  const lights = [...(world.lights ?? []).filter((l) => l.lit || l.remainingMinutes > 0), newLight(crypto.randomUUID(), kind)];
  await prisma.campaign.update({ where: { id: campaignId }, data: { world: { ...world, lights } as Prisma.InputJsonValue } });
  await say(campaignId, d.user.id, `A ${kind.replace("-", " ")} is lit (${LIGHT_SOURCES[kind].hours} h, bright ${LIGHT_SOURCES[kind].bright} ft, dim ${LIGHT_SOURCES[kind].dim} ft).`);
  touchWorld(campaignId);
  return { ok: true };
}

export async function snuffLight(campaignId: string, lightId: string): Promise<Result> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  const camp = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  const world = worldOf(camp);
  await prisma.campaign.update({ where: { id: campaignId }, data: { world: { ...world, lights: (world.lights ?? []).filter((l) => l.id !== lightId) } as Prisma.InputJsonValue } });
  touchWorld(campaignId);
  return { ok: true };
}

/** Travel: uses the slowest hero's speed, advances the clock and reports food and camps. */
export async function travel(campaignId: string, miles: number, pace: Pace, terrain: Terrain): Promise<Result<{ summary: string }>> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  if (!(miles > 0 && miles <= 3000)) return fail("Enter a distance in miles");
  const party = await partyOf(campaignId);
  const speed = party.length ? Math.min(...party.map((c) => deriveStored(c as unknown as StoredCharacter).speed)) : 30;
  const j = journey(miles, pace, speed, terrain);
  if (!Number.isFinite(j.hours)) return fail("The party cannot make progress at that speed");
  const summary = `Travel ${miles} miles at a ${pace} pace through ${terrain} terrain: ${j.hours} hours (${j.days} days), ${j.foodDays} days of food${j.camps ? `, ${j.camps} night${j.camps > 1 ? "s" : ""} camping` : ""}${pace === "fast" ? "; -5 to passive Perception" : pace === "slow" ? "; may travel stealthily" : ""}`;
  const r = await advanceTime(campaignId, Math.max(1, j.minutes), summary);
  if (!r.ok) return r;
  return { ok: true, summary };
}

// ---------------------------------------------------------------- party rests

/** A short or long rest for the whole party; the clock moves an hour or eight. */
export async function partyRest(campaignId: string, kind: "short" | "long"): Promise<Result<{ rested: number }>> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  const party = await partyOf(campaignId);
  if (!party.length) return fail("No heroes are attached to this campaign");
  let rested = 0;
  for (const c of party) {
    const r = kind === "long" ? await takeLongRest(c.id, true) : await takeShortRest(c.id, []);
    if (r.ok) rested++;
  }
  await advanceTime(campaignId, kind === "long" ? 480 : 60, `The party takes a ${kind} rest`);
  return { ok: true, rested };
}

// ---------------------------------------------------------------- checks

export type CheckRequest = {
  characterIds: string[];
  /** a skill (Stealth) or a bare ability (Strength check) */
  skill?: Skill;
  ability?: Ability;
  dc?: number;
  mode?: RollMode;
  secret?: boolean;
  /** group check: succeed if at least half succeed (PHB p.175) */
  group?: boolean;
};

/** Call for a roll from several heroes at once; results are logged to the table (or to the DM only). */
export async function callForCheck(campaignId: string, req: CheckRequest): Promise<Result<{ lines: string[] }>> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  if (!req.skill && !req.ability) return fail("Choose a skill or an ability");
  if (req.skill && !(req.skill in SKILLS)) return fail("Unknown skill");
  if (req.ability && !ABILITIES.includes(req.ability)) return fail("Unknown ability");
  if (req.dc !== undefined && (!Number.isInteger(req.dc) || req.dc < 1 || req.dc > 40)) return fail("DC must be between 1 and 40");
  const party = (await partyOf(campaignId)).filter((c) => req.characterIds.includes(c.id));
  if (!party.length) return fail("Choose at least one hero");

  const label = req.skill ? `${req.skill.replace(/-/g, " ")} (${SKILLS[req.skill].toUpperCase()})` : `${req.ability!.toUpperCase()} check`;
  const results = party.map((c) => {
    const derived = deriveStored(c as unknown as StoredCharacter);
    const bonus = req.skill ? derived.skills[req.skill].total : derived.abilities[req.ability!].modifier - (c.rezPenalty ?? 0);
    const roll = rollD20(bonus, req.mode ?? "normal", cryptoRng);
    return { name: c.name, total: roll.total, natural: roll.natural, ok: req.dc === undefined ? null : roll.total >= req.dc };
  });
  const lines = results.map((r) => `${r.name}: ${r.total}${r.natural === 20 ? " (natural 20)" : r.natural === 1 ? " (natural 1)" : ""}${r.ok === null ? "" : r.ok ? " ✓" : " ✗"}`);
  let verdict = "";
  if (req.group && req.dc !== undefined) verdict = groupCheckSucceeds(results.filter((r) => r.ok).length, results.length) ? " - the group succeeds" : " - the group fails";
  await say(campaignId, d.user.id, `${label}${req.dc ? ` vs DC ${req.dc}` : ""}${req.secret ? " (secret)" : ""}: ${lines.join("; ")}${verdict}`, !!req.secret);
  touchWorld(campaignId);
  return { ok: true, lines };
}

/** A hero tries to move an NPC with Persuasion, Intimidation or Deception; attitude can shift on a big margin. */
export async function socialCheck(campaignId: string, npcId: string, characterId: string, skill: "persuasion" | "intimidation" | "deception", large = false): Promise<Result<{ line: string }>> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  const npc = await prisma.npc.findFirst({ where: { id: npcId, campaignId } });
  if (!npc) return fail("NPC not found");
  const ch = (await partyOf(campaignId)).find((c) => c.id === characterId);
  if (!ch) return fail("Hero not found");
  const dc = requestDc(npc.attitude as Attitude, large ? "large" : "small");
  const bonus = deriveStored(ch as unknown as StoredCharacter).skills[skill].total;
  const roll = rollD20(bonus, "normal", cryptoRng);
  const next = shiftAttitude(npc.attitude as Attitude, roll.total - dc);
  if (next !== npc.attitude) await prisma.npc.update({ where: { id: npc.id }, data: { attitude: next } });
  const line = `${ch.name} tries ${skill} on ${npc.name} (DC ${dc}): ${roll.total} - ${roll.total >= dc ? "success" : "failure"}${next !== npc.attitude ? `; ${npc.name} becomes ${next}` : ""}`;
  await say(campaignId, d.user.id, line, !npc.revealed);
  touchWorld(campaignId);
  return { ok: true, line };
}

// ---------------------------------------------------------------- rewards

/** Split XP evenly among the heroes. */
export async function awardPartyXp(campaignId: string, amount: number): Promise<Result<{ each: number }>> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  if (!Number.isInteger(amount) || amount < 1 || amount > 1000000) return fail("Enter an amount of XP");
  const party = await partyOf(campaignId);
  if (!party.length) return fail("No heroes are attached to this campaign");
  const each = Math.floor(amount / party.length);
  await prisma.character.updateMany({ where: { id: { in: party.map((c) => c.id) } }, data: { xp: { increment: each } } });
  await say(campaignId, d.user.id, `The party earns ${amount} XP (${each} each).`);
  touchWorld(campaignId);
  return { ok: true, each };
}

/** Milestone: raise each hero's XP to the threshold for their next level so they can level up. */
export async function awardMilestone(campaignId: string): Promise<Result<{ ready: string[] }>> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  const party = await partyOf(campaignId);
  const ready: string[] = [];
  for (const c of party) {
    const level = (c.classes as { level: number }[]).reduce((s, k) => s + k.level, 0);
    if (level >= 20) continue;
    const need = XP_THRESHOLDS[level];
    if (c.xp < need) await prisma.character.update({ where: { id: c.id }, data: { xp: need } });
    ready.push(c.name);
  }
  if (!ready.length) return fail("Everyone is already at the highest level");
  await say(campaignId, d.user.id, `Milestone reached! ${ready.join(", ")} can now level up.`);
  touchWorld(campaignId);
  return { ok: true, ready };
}

export async function setInspiration(campaignId: string, characterId: string, value: boolean): Promise<Result> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  const ch = (await partyOf(campaignId)).find((c) => c.id === characterId);
  if (!ch) return fail("Hero not found");
  await prisma.character.update({ where: { id: characterId }, data: { inspiration: value } });
  await say(campaignId, d.user.id, value ? `${ch.name} is inspired!` : `${ch.name} spends their inspiration.`);
  touchWorld(campaignId);
  return { ok: true };
}

// ---------------------------------------------------------------- treasure and the stash

export async function addStashItem(campaignId: string, name: string, quantity = 1, notes = "", valueGp = 0): Promise<Result> {
  const m = await member(campaignId);
  if (m.error) return m.error;
  if (!m.isDm) return fail("Only the DM adds treasure to the stash");
  if (name.trim().length < 1 || name.length > 80) return fail("Give the item a name");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999) return fail("Quantity must be 1-9999");
  if (!(valueGp >= 0 && valueGp <= 1000000)) return fail("Value must be between 0 and 1,000,000 gp");
  await prisma.stashItem.create({ data: { campaignId, name: name.trim(), quantity, notes: notes.slice(0, 300), valueCp: Math.round(valueGp * 100) } });
  await say(campaignId, m.user.id, `Treasure found: ${quantity} × ${name.trim()}.`);
  touchWorld(campaignId);
  return { ok: true };
}

/** Give stash items to a hero (the DM, or the hero's owner, may do this). */
export async function takeFromStash(campaignId: string, itemId: string, characterId: string, quantity = 1): Promise<Result> {
  const m = await member(campaignId);
  if (m.error) return m.error;
  const item = await prisma.stashItem.findFirst({ where: { id: itemId, campaignId } });
  if (!item) return fail("Item not found");
  const ch = (await partyOf(campaignId)).find((c) => c.id === characterId);
  if (!ch) return fail("Hero not found");
  if (!m.isDm && ch.ownerId !== m.user.id) return fail("You can only take items for your own hero");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > item.quantity) return fail("Not that many in the stash");
  const given = await addCustomItem(characterId, item.name, quantity, undefined, item.notes);
  if (!given.ok) return given;
  if (quantity === item.quantity) await prisma.stashItem.delete({ where: { id: item.id } });
  else await prisma.stashItem.update({ where: { id: item.id }, data: { quantity: item.quantity - quantity } });
  touchWorld(campaignId);
  return { ok: true };
}

export async function removeStashItem(campaignId: string, itemId: string): Promise<Result> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  await prisma.stashItem.deleteMany({ where: { id: itemId, campaignId } });
  touchWorld(campaignId);
  return { ok: true };
}

/** Divide coin evenly among the heroes; the remainder (in copper) stays with the DM's note. */
export async function splitCoin(campaignId: string, coin: Partial<Purse>): Promise<Result<{ eachCp: number }>> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  const purse: Purse = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, ...coin };
  if (Object.values(purse).some((n) => !Number.isInteger(n) || n < 0 || n > 10000000)) return fail("Enter whole, non-negative amounts");
  const total = purseValueCp(purse);
  if (total < 1) return fail("Nothing to split");
  const party = await partyOf(campaignId);
  if (!party.length) return fail("No heroes are attached to this campaign");
  const eachCp = Math.floor(total / party.length);
  for (const c of party) {
    const have = c.currency as Purse;
    const share = fromCopper(eachCp);
    const merged = Object.fromEntries((Object.keys(have) as (keyof Purse)[]).map((k) => [k, (have[k] ?? 0) + share[k]])) as Purse;
    await prisma.character.update({ where: { id: c.id }, data: { currency: merged as unknown as Prisma.InputJsonValue } });
  }
  await say(campaignId, d.user.id, `The party splits ${total} cp: ${eachCp} cp (${(eachCp / 100).toFixed(2)} gp) each.`);
  touchWorld(campaignId);
  return { ok: true, eachCp };
}

// ---------------------------------------------------------------- death and returning

/** Bring a fallen hero back with a resurrection spell: full rules for time limits, hit points and penalties. */
export async function raiseHero(campaignId: string, characterId: string, kind: ResurrectionKind, daysDead: number): Promise<Result<{ note: string }>> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  const ch = (await partyOf(campaignId)).find((c) => c.id === characterId);
  if (!ch) return fail("Hero not found");
  if (!((ch.conditions as string[]) ?? []).includes("dead")) return fail(`${ch.name} is not dead`);
  if (!(daysDead >= 0)) return fail("Enter how long they have been dead");
  const maxHp = deriveStored(ch as unknown as StoredCharacter).maxHp;
  const r = resurrect(kind, daysDead, maxHp);
  if (!r.ok) return fail(r.reason);
  const conditions = ((ch.conditions as string[]) ?? []).filter((c) => c !== "dead" && c !== "stable");
  await prisma.character.update({
    where: { id: characterId },
    data: { currentHp: r.hp, tempHp: 0, rezPenalty: r.penalty, conditions, deathSaves: { successes: 0, failures: 0 } },
  });
  const note = `${ch.name} returns to life with ${r.hp} HP${r.penalty ? ` and a -${r.penalty} penalty to d20 rolls that fades by 1 per long rest` : ""}. Spell components worth ${r.costGp} gp are consumed.`;
  await say(campaignId, d.user.id, `${kind.replace("-", " ")}: ${note}`);
  touchWorld(campaignId);
  return { ok: true, note };
}

// ---------------------------------------------------------------- hazards

export type HazardRequest = {
  characterIds: string[];
  kind: "fall" | "damage";
  /** falling distance in feet */
  feet?: number;
  /** damage dice for a trap, fire, acid and so on, e.g. "4d10" */
  dice?: string;
  label?: string;
  /** a saving throw for half damage */
  saveAbility?: Ability;
  dc?: number;
};

/** Hurt heroes with a fall, a trap or a hazard. One damage roll is shared; a successful save halves it. */
export async function applyHazard(campaignId: string, req: HazardRequest): Promise<Result<{ lines: string[] }>> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  const party = (await partyOf(campaignId)).filter((c) => req.characterIds.includes(c.id));
  if (!party.length) return fail("Choose at least one hero");
  let raw = 0;
  let label = req.label?.trim() || "A hazard";
  let prone = false;
  if (req.kind === "fall") {
    if (!(req.feet && req.feet >= 10 && req.feet <= 2000)) return fail("Enter a fall of at least 10 feet");
    const f = fallDamage(req.feet);
    raw = f.damage;
    prone = f.prone;
    label = `A ${req.feet}-foot fall`;
  } else {
    try {
      raw = rollExpression(req.dice ?? "", cryptoRng).total;
    } catch {
      return fail("Enter damage dice like 4d10");
    }
  }
  if (req.saveAbility && !ABILITIES.includes(req.saveAbility)) return fail("Unknown ability");
  const lines: string[] = [];
  for (const c of party) {
    let amount = raw;
    let saved = false;
    if (req.saveAbility && req.dc) {
      const bonus = deriveStored(c as unknown as StoredCharacter).saves[req.saveAbility].total;
      saved = rollD20(bonus, "normal", cryptoRng).total >= req.dc;
      if (saved) amount = Math.floor(raw / 2);
    }
    const r = await changeHitPoints(c.id, { kind: "damage", amount });
    if (!r.ok) return r;
    if (prone && !((c.conditions as string[]) ?? []).includes("prone")) await prisma.character.update({ where: { id: c.id }, data: { conditions: [...((c.conditions as string[]) ?? []), "prone"] } });
    lines.push(`${c.name} takes ${amount}${saved ? " (saved for half)" : ""}`);
  }
  await say(campaignId, d.user.id, `${label}: ${lines.join("; ")}.`);
  touchWorld(campaignId);
  return { ok: true, lines };
}
