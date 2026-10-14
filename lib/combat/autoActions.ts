"use server";

import type { Combatant } from "@prisma/client";
import { CASTING_ABILITY } from "@/engine/spells";
import { parseSpellEffect } from "@/engine/spells/effects";
import type { ClassLevel } from "@/engine/progression";
import { runAs } from "@/lib/actAs";
import { requireUser } from "@/lib/auth";
import { deriveStored, type StoredCharacter } from "@/lib/characters/derive";
import { prisma } from "@/lib/prisma";
import { BLUEPRINTS } from "@/engine/bots/blueprints";
import { settleEncounter } from "@/lib/solo/director";
import { controllerOf, readSolo, type Controller } from "@/lib/solo/config";
import { attack, endTurn, moveCombatant, runMonsterTurn, takeAction } from "./actions";
import { fail, type Result } from "./access";
import { planHeroTurn, type HeroStep, type SpellOption } from "./heroAi";
import { characterProfiles } from "./profiles";
import { castInCombat } from "./spellActions";
import { automationMode } from "./spellRules";
import { loadEncounter, roleIn, rowToCmb, sideOf } from "./store";
import { spellbookFor } from "./spellList";

export type AutoResult = Result & { waiting?: "human" | "done"; lines?: string[] };

const wallsOf = (env: unknown) => new Set(((env as { walls?: string[] } | null)?.walls ?? []) as string[]);

/** One hero turn played by the computer: heal, spell or weapon, then end the turn. Runs as the hero's own account. */
async function playBotHero(encounterId: string, row: Combatant, lines: string[]): Promise<void> {
  const enc = (await loadEncounter(encounterId))!;
  const me = rowToCmb(row);
  const ch = await prisma.character.findUniqueOrThrow({ where: { id: row.characterId! } });
  const book = await spellbookFor(ch);
  const effects = book ? await prisma.spell.findMany({ where: { index: { in: book.spells.map((s) => s.index) } } }) : [];
  const spells: SpellOption[] = (book?.spells ?? []).map((s) => {
    const e = parseSpellEffect(effects.find((x) => x.index === s.index) ?? { level: s.level, range: "Self", duration: "", description: "", higherLevels: "", concentration: s.concentration });
    return { index: s.index, name: s.name, level: s.level, time: s.time, concentration: s.concentration, effect: e, mode: automationMode(s.index, e) };
  });
  const slotsLeft: Record<number, number> = {};
  for (const s of book?.slots ?? []) slotsLeft[s.level] = s.left;
  if (book?.pact && book.pact.left > 0) slotsLeft[book.pact.slotLevel] = (slotsLeft[book.pact.slotLevel] ?? 0) + book.pact.left;

  const derived = deriveStored(ch as unknown as StoredCharacter);
  const castClass = (ch.classes as ClassLevel[]).find((k) => CASTING_ABILITY[k.classIndex]);
  const castMod = castClass ? derived.abilities[CASTING_ABILITY[castClass.classIndex]].modifier : 0;
  const all = enc.combatants.map(rowToCmb);
  const walls = wallsOf(enc.environment);
  const occupied = new Set<string>([...walls, ...enc.combatants.filter((r) => r.id !== row.id && !r.defeated && r.x !== null && r.y !== null).map((r) => `${r.x},${r.y}`)]);
  const side = sideOf(row);

  const plan = planHeroTurn({
    self: me,
    allies: all.filter((c) => c.id !== me.id && enc.combatants.find((r) => r.id === c.id) && sideOf(enc.combatants.find((r) => r.id === c.id)!) === side),
    foes: all.filter((c) => { const r = enc.combatants.find((x) => x.id === c.id)!; return sideOf(r) !== side && !r.hidden; }),
    profiles: characterProfiles(ch as never), spells, slotsLeft, spellAttackBonus: derived.proficiencyBonus + castMod, saveDc: 8 + derived.proficiencyBonus + castMod, castMod,
    round: enc.round, occupied, width: enc.gridWidth, height: enc.gridHeight,
  });

  let acted = false;
  const run = async (step: HeroStep) => {
    if (step.kind === "move") {
      const r = await moveCombatant(row.id, step.to.x, step.to.y);
      if (!r.ok) lines.push(r.errors[0]);
    } else if (step.kind === "cast") {
      const r = await castInCombat({ casterId: row.id, spell: step.spell, slotLevel: step.slotLevel || undefined, targetIds: step.targetIds, point: step.point });
      if (r.ok) acted = true;
      else lines.push(`${me.name} could not cast ${step.spell}: ${r.errors[0]}`);
    } else if (step.kind === "attack") {
      for (let i = 0; i < step.times; i++) {
        const live = (await loadEncounter(encounterId))!.combatants.find((r) => r.id === step.targetId && !r.defeated);
        if (!live) break;
        const r = await attack({ attackerId: row.id, targetId: step.targetId, attack: step.attack });
        if (!r.ok) {
          lines.push(r.errors[0]);
          break;
        }
        acted = true;
      }
    } else {
      const r = await takeAction(row.id, "dodge");
      if (r.ok) acted = true;
    }
  };
  for (const step of plan.steps) await run(step);
  void acted;
}

/** A line of in-character chatter now and then, so the table feels lived in. */
async function chatter(row: Combatant, campaignId: string, round: number, worried: boolean) {
  const bp = BLUEPRINTS.find((b) => ((row.name ?? "").length > 0 && b.names.some((n) => row.name.startsWith(n.split(" ")[0]))) ?? false);
  const pool = worried ? bp?.worried : round === 1 ? bp?.battleCries : undefined;
  if (!pool?.length || Math.random() > (worried ? 0.35 : 0.8)) return;
  const text = pool[Math.floor(Math.random() * pool.length)];
  await prisma.campaignEvent.create({ data: { campaignId, actorId: null, type: "chat", audience: "ALL", payload: { actorName: row.name, text, bot: true } } });
}

/**
 * Play one turn if the active creature belongs to the computer. Returns "human" when it is a person's turn and "done" when
 * the fight is not running.
 */
export async function autoStep(encounterId: string): Promise<AutoResult> {
  const user = await requireUser();
  const enc = await loadEncounter(encounterId);
  if (!enc) return fail("Encounter not found");
  if (!(await roleIn(enc.campaignId, user.id))) return fail("You are not in this campaign");
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: enc.campaignId }, select: { settings: true, dmId: true } });
  const solo = readSolo(campaign.settings);
  if (!solo) return fail("This is not a solo game");
  if (solo.humanId !== user.id) return fail("Only the player of this solo game can run it");
  if (enc.state !== "ACTIVE") return { ok: true, waiting: "done" };
  const early = await settleEncounter(encounterId);
  if (early) return { ok: true, waiting: "done", lines: [early.text] };

  const row = enc.combatants[enc.activeIndex];
  if (!row) return { ok: true, waiting: "done" };
  const owner = row.characterId ? (await prisma.character.findUnique({ where: { id: row.characterId }, select: { ownerId: true } }))?.ownerId ?? null : null;
  const who: Controller = controllerOf(solo, { kind: row.kind, characterOwnerId: owner }, campaign.dmId);
  if (who.who === "human") return { ok: true, waiting: "human" };

  const actor = await prisma.user.findUniqueOrThrow({ where: { id: who.userId }, select: { id: true, displayName: true } });
  const lines: string[] = [];
  await runAs({ id: actor.id, name: actor.displayName }, async () => {
    if (who.who === "ai-dm") {
      const r = await runMonsterTurn(encounterId, { endAfter: true });
      if (r.ok && r.lines) lines.push(...r.lines);
      else if (!r.ok) {
        lines.push(r.errors[0]);
        await endTurn(encounterId); // never get stuck on a creature that cannot act
      }
      return;
    }
    const me = rowToCmb(row);
    const hurtAlly = enc.combatants.some((r) => sideOf(r) === sideOf(row) && !r.defeated && r.hp / Math.max(1, r.maxHp) <= 0.35);
    await chatter(row, enc.campaignId, enc.round, hurtAlly && enc.round > 1);
    if (me.hp > 0 && !me.defeated && me.turn.action) await playBotHero(encounterId, row, lines);
    const end = await endTurn(encounterId);
    if (!end.ok) lines.push(end.errors[0]);
  });
  const settled = await settleEncounter(encounterId);
  if (settled) return { ok: true, waiting: "done", lines: [...lines, settled.text] };
  return { ok: true, lines };
}

/** Keep playing the computer's turns until it is a person's turn or the fight ends (at most 40 turns). */
export async function autoRun(encounterId: string): Promise<AutoResult> {
  const lines: string[] = [];
  for (let i = 0; i < 40; i++) {
    const r = await autoStep(encounterId);
    if (!r.ok) return r;
    if (r.lines) lines.push(...r.lines);
    if (r.waiting) return { ok: true, waiting: r.waiting, lines };
  }
  return { ok: true, waiting: "human", lines };
}
