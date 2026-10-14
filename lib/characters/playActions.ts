"use server";

import { revalidatePath } from "next/cache";
import type { AbilityScores } from "@/engine/abilities";
import { CASTER_KIND, CLASS_NAME, validateSpellSelection, type SpellMeta, type SpellSelection } from "@/engine/classes/spellcasting";
import { CASTING_ABILITY, beginConcentration, canCastAsRitual, checkCasting, lowestAvailableSlot, slotCreationCost, slotToPoints, spendSlot } from "@/engine/spells";
import { canLongRest, longRest, shortRest, spendResource } from "@/engine/rest";
import type { ClassLevel } from "@/engine/progression";
import { fadePenalty } from "@/engine/world";
import { requireUser } from "@/lib/auth";
import { spellInSrd, srdOnly } from "@/lib/srd";
import { prisma } from "@/lib/prisma";
import { audit, editable } from "./access";
import { toEngineInput } from "./derive";
import { PACT_KEY, fromRestState, lastLongRest, resourceViews, slotViews, toRestState, type StoredPlay } from "./play";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; errors: string[] };
const fail = (m: string): { ok: false; errors: string[] } => ({ ok: false, errors: [m] });
const touch = (id: string) => revalidatePath(`/characters/${id}`);

const RITUAL_CLASSES = ["bard", "cleric", "druid", "wizard"];

export type SpellState = { byClass?: Record<string, SpellSelection>; concentration?: { spell: string; name: string } | null };
const spellState = (c: { spells: unknown }): SpellState => (c.spells && typeof c.spells === "object" ? (c.spells as SpellState) : {});

const finalScores = (c: StoredPlay): AbilityScores => {
  const input = toEngineInput(c);
  const out = { ...input.baseScores };
  for (const k of Object.keys(out) as (keyof AbilityScores)[]) out[k] += input.scoreBonuses?.[k] ?? 0;
  return out;
};

// ------------------------------------------------------------------ class resources and rests

export async function spendClassResource(characterId: string, key: string, amount = 1): Promise<Result> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return fail("Character not found");
  try {
    const rs = spendResource(toRestState(c), key, amount);
    await prisma.character.update({ where: { id: characterId }, data: fromRestState(rs, c) });
    const label = key.replace(/^.*:/, "").replace(/-/g, " ");
    await audit(characterId, c.name, user.id, user.name ?? "Someone", `${c.name} uses ${label}${amount > 1 ? ` (${amount})` : ""}`);
  } catch (e) {
    return fail((e as Error).message);
  }
  touch(characterId);
  return { ok: true };
}

/** Short rest: spend hit dice (rolled on the server) to heal; short-rest features and pact slots come back. */
export async function takeShortRest(characterId: string, spend: { die: number; count: number }[]): Promise<Result<{ healed: number }>> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return fail("Character not found");
  const con = finalScores(c).con;
  try {
    const dice = spend.filter((s) => s.count > 0).map((s) => ({ ...s, rolls: Array.from({ length: s.count }, () => Math.floor(Math.random() * s.die) + 1) }));
    const { state, healed } = shortRest(toRestState(c), con, dice);
    await prisma.character.update({ where: { id: characterId }, data: fromRestState(state, c) });
    await audit(characterId, c.name, user.id, user.name ?? "Someone", `${c.name} takes a short rest${healed ? ` and recovers ${healed} HP` : ""}`);
    touch(characterId);
    return { ok: true, healed };
  } catch (e) {
    return fail((e as Error).message);
  }
}

/** Long rest: once per 24 hours of game time unless forced (DM override). */
export async function takeLongRest(characterId: string, force = false): Promise<Result> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return fail("Character not found");
  const last = lastLongRest(c);
  if (!force && !canLongRest(new Date(), last)) return fail("You can only benefit from one long rest in 24 hours");
  const data = fromRestState(longRest(toRestState(c)), c);
  const resources = { ...(data.resources as Record<string, unknown>), _lastLongRest: new Date().toISOString() };
  await prisma.character.update({ where: { id: characterId }, data: { ...data, resources: resources as object, rezPenalty: fadePenalty(c.rezPenalty ?? 0), spells: { ...spellState(c), concentration: null } as object } });
  await audit(characterId, c.name, user.id, user.name ?? "Someone", `${c.name} takes a long rest`);
  touch(characterId);
  return { ok: true };
}

// ------------------------------------------------------------------ spells

/** Choose known / prepared spells (and a wizard's spellbook) for one class, validated against its rules. */
export async function saveSpellSelection(characterId: string, classIndex: string, selection: SpellSelection): Promise<Result> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return fail("Character not found");
  const level = (c.classes as ClassLevel[]).find((k) => k.classIndex === classIndex)?.level;
  const ability = CASTING_ABILITY[classIndex];
  if (!level || !ability || !CASTER_KIND[classIndex]) return fail("That class does not cast spells");

  const wanted = [...new Set([...selection.known, ...selection.prepared, ...selection.spellbook])];
  const rows = await prisma.spell.findMany({ where: { index: { in: wanted } }, select: { index: true, name: true, level: true, classes: true, source: true, campaignId: true } });
  if (srdOnly() && rows.some((r) => r.source !== "HOMEBREW" && !spellInSrd(r.name))) return fail("That spell is not part of the free rules (SRD)");
  const foreign = rows.filter((r) => r.campaignId);
  if (foreign.length) {
    const links = await prisma.campaignCharacter.findMany({ where: { characterId, campaignId: { in: foreign.map((r) => r.campaignId!) } }, select: { campaignId: true } });
    const mine = new Set(links.map((l) => l.campaignId));
    if (foreign.some((r) => !mine.has(r.campaignId!))) return fail("That spell belongs to another campaign");
  }
  const catalog = new Map<string, SpellMeta>(rows.map((r) => [r.index, r]));
  const errors = validateSpellSelection(classIndex, level, finalScores(c)[ability], selection, catalog);
  if (errors.length) return { ok: false, errors };

  const state = spellState(c);
  await prisma.character.update({ where: { id: characterId }, data: { spells: { ...state, byClass: { ...state.byClass, [classIndex]: selection } } as object } });
  touch(characterId);
  return { ok: true };
}

export type CastOptions = { slotLevel?: number; pact?: boolean; ritual?: boolean };

/** Cast a known or prepared spell: checks the rules, spends the slot, tracks concentration and logs it. */
export async function castSpell(characterId: string, spellIndex: string, opts: CastOptions = {}): Promise<Result<{ message: string }>> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return fail("Character not found");
  const spell = await prisma.spell.findUnique({ where: { index: spellIndex } });
  if (!spell) return fail("Unknown spell");
  if (spell.campaignId && !(await prisma.campaignCharacter.findFirst({ where: { characterId, campaignId: spell.campaignId } }))) return fail("That spell belongs to another campaign");
  if (srdOnly() && spell.source !== "HOMEBREW" && !spellInSrd(spell.name)) return fail("That spell is not part of the free rules (SRD)");

  const state = spellState(c);
  const classes = c.classes as ClassLevel[];
  // which of the character's classes can use this spell
  const sources = classes.filter((k) => {
    const sel = state.byClass?.[k.classIndex];
    const kind = CASTER_KIND[k.classIndex];
    if (!sel || !kind || !spell.classes.includes(CLASS_NAME[k.classIndex])) return false;
    return (kind === "known" ? sel.known : sel.prepared).includes(spellIndex) || (opts.ritual && k.classIndex === "wizard" && sel.spellbook.includes(spellIndex));
  });
  if (!sources.length) return fail(`${spell.name} is not on your known or prepared list`);

  const check = checkCasting({ name: spell.name, level: spell.level, castingTime: spell.castingTime, components: spell.components, ritual: spell.ritual, concentration: spell.concentration });
  if (!check.ok) return fail(check.reason);

  const patch: Record<string, unknown> = {};
  let used = "cantrip";
  if (spell.level > 0) {
    if (opts.ritual) {
      if (!spell.ritual || !sources.some((s) => canCastAsRitual({ name: spell.name, level: spell.level, castingTime: spell.castingTime, components: spell.components, ritual: spell.ritual }, RITUAL_CLASSES.includes(s.classIndex)))) {
        return fail(`${spell.name} cannot be cast as a ritual by your classes`);
      }
      used = "ritual (no slot)";
    } else {
      const views = slotViews(c);
      const total = views.slots.map((s) => s.total);
      const spent = views.slots.map((s) => s.used);
      if (opts.pact) {
        if (!views.pact || views.pact.used >= views.pact.slots || views.pact.slotLevel < spell.level) return fail("No pact magic slot available for that spell");
        const res = { ...((c.resources && !Array.isArray(c.resources) ? c.resources : {}) as Record<string, unknown>), [PACT_KEY]: views.pact.used + 1 };
        patch.resources = res;
        used = `pact slot (level ${views.pact.slotLevel})`;
      } else {
        const level = opts.slotLevel ?? lowestAvailableSlot({ total, used: spent }, spell.level);
        if (!level || level < spell.level) return fail("No spell slot available for that spell");
        try {
          const next = spendSlot({ total, used: spent }, level);
          patch.spellSlotsUsed = [...next.used];
        } catch {
          return fail(`No level ${level} spell slots left`);
        }
        used = `level ${level} slot`;
      }
    }
  }

  let concentrationNote = "";
  let concentration = state.concentration ?? null;
  if (spell.concentration) {
    const r = beginConcentration(concentration, spell.name);
    concentration = { spell: spell.index, name: spell.name };
    if (r.ended) concentrationNote = `, ending concentration on ${r.ended}`;
  }
  patch.spells = { ...state, concentration } as object;
  await prisma.character.update({ where: { id: characterId }, data: patch });
  const message = `${c.name} casts ${spell.name} (${used})${concentrationNote}`;
  await audit(characterId, c.name, user.id, user.name ?? "Someone", message);
  touch(characterId);
  return { ok: true, message };
}

export async function endConcentration(characterId: string): Promise<Result> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return fail("Character not found");
  const state = spellState(c);
  if (!state.concentration) return fail("Not concentrating on anything");
  await prisma.character.update({ where: { id: characterId }, data: { spells: { ...state, concentration: null } as object } });
  await audit(characterId, c.name, user.id, user.name ?? "Someone", `${c.name} stops concentrating on ${state.concentration.name}`);
  touch(characterId);
  return { ok: true };
}

/** Manually adjust a spell slot (DM fix-ups, magic items, Arcane Recovery). delta -1 restores one, +1 expends one. */
export async function adjustSlot(characterId: string, level: number, delta: 1 | -1, pact = false): Promise<Result> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return fail("Character not found");
  const views = slotViews(c);
  if (pact) {
    if (!views.pact) return fail("No pact magic");
    const used = Math.max(0, Math.min(views.pact.slots, views.pact.used + delta));
    const res = { ...((c.resources && !Array.isArray(c.resources) ? c.resources : {}) as Record<string, unknown>), [PACT_KEY]: used };
    await prisma.character.update({ where: { id: characterId }, data: { resources: res as object } });
  } else {
    const slot = views.slots.find((s) => s.level === level);
    if (!slot) return fail("You have no slots of that level");
    const spent = views.slots.map((s) => s.used);
    spent[level - 1] = Math.max(0, Math.min(slot.total, slot.used + delta));
    await prisma.character.update({ where: { id: characterId }, data: { spellSlotsUsed: spent } });
  }
  touch(characterId);
  return { ok: true };
}

// ------------------------------------------------------------------ Flexible Casting (sorcerer, PHB p.101)

/**
 * Trade a spell slot for sorcery points, or sorcery points for a slot. Turning points into a slot restores a slot you have
 * already spent at that level (creating slots beyond your normal total is not tracked).
 */
export async function convertSorcery(characterId: string, direction: "slot-to-points" | "points-to-slot", level: number): Promise<Result> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return fail("Character not found");
  if (!Number.isInteger(level) || level < 1 || level > 5) return fail("Flexible Casting works with slots of levels 1-5");
  const pool = resourceViews(c).find((r) => r.key.endsWith("sorcery-points"));
  if (!pool) return fail("Only sorcerers of level 2 or higher have sorcery points");
  const views = slotViews(c);
  const slot = views.slots.find((s) => s.level === level);
  if (!slot) return fail(`You have no level ${level} slots`);
  const spent = views.slots.map((s) => s.used);
  const resources = { ...((c.resources && !Array.isArray(c.resources) ? c.resources : {}) as Record<string, unknown>) };
  let line: string;
  if (direction === "slot-to-points") {
    if (slot.total - slot.used < 1) return fail(`No level ${level} slot left to convert`);
    const gain = slotToPoints(level);
    if (pool.max - pool.used + gain > pool.max) return fail("That would exceed your maximum sorcery points");
    spent[level - 1] += 1;
    resources[pool.key] = pool.used - gain;
    line = `${c.name} converts a level ${level} slot into ${gain} sorcery points`;
  } else {
    const cost = slotCreationCost(level);
    if (pool.max - pool.used < cost) return fail(`Creating a level ${level} slot costs ${cost} sorcery points`);
    if (slot.used < 1) return fail(`You have no spent level ${level} slot to restore`);
    spent[level - 1] -= 1;
    resources[pool.key] = pool.used + cost;
    line = `${c.name} spends ${cost} sorcery points to create a level ${level} slot`;
  }
  await prisma.character.update({ where: { id: characterId }, data: { spellSlotsUsed: spent, resources: resources as object } });
  await audit(characterId, c.name, user.id, user.name ?? "Someone", line);
  touch(characterId);
  return { ok: true };
}
