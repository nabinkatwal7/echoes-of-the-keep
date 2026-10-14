"use server";

import { revalidatePath } from "next/cache";
import { checkPrerequisites } from "@/engine/feats";
import { CASTER_KIND, CLASS_NAME, validateSpellSelection, type SpellMeta, type SpellSelection } from "@/engine/classes/spellcasting";
import { CASTING_ABILITY } from "@/engine/spells";
import type { ClassLevel } from "@/engine/progression";
import { requireUser } from "@/lib/auth";
import { spellInSrd, srdOnly, srdViolations } from "@/lib/srd";
import { prisma } from "@/lib/prisma";
import { editable } from "./access";
import { auditStored, type AuditIssue } from "./audit";
import { prereqContext } from "./derive";
import { parseImport } from "./portable";

export type ImportActionResult = { ok: true; id: string } | { ok: false; errors: string[] };

/** Create a new hero for the signed-in user from an exported file, after checking it against the rules and the content. */
export async function importCharacter(text: string): Promise<ImportActionResult> {
  const user = await requireUser();
  const parsed = parseImport(text);
  if (!parsed.ok) return parsed;
  const c = parsed.character;

  const [race, background, feats] = await Promise.all([
    prisma.race.findUnique({ where: { index: c.raceIndex } }),
    prisma.background.findUnique({ where: { index: c.backgroundIndex } }),
    prisma.feat.findMany({ where: { index: { in: c.feats } } }),
  ]);
  if (!race) return { ok: false, errors: [`Unknown race: ${c.raceIndex}`] };
  if (!background) return { ok: false, errors: [`Unknown background: ${c.backgroundIndex}`] };
  if (feats.length !== new Set(c.feats).size) return { ok: false, errors: ["The file references a feat that does not exist"] };
  const outside = [
    ...srdViolations({ raceIndex: c.raceIndex, subraceIndex: c.subraceIndex, backgroundIndex: c.backgroundIndex, feats: c.feats }),
    ...c.classes.flatMap((k) => (k.subclassIndex && srdViolations({ subclassIndex: k.subclassIndex }).length ? ["That subclass is not part of the free rules (SRD)"] : [])),
  ];
  if (outside.length) return { ok: false, errors: outside };
  if (srdOnly()) {
    const byClass = (c.spells as { byClass?: Record<string, { known?: string[]; prepared?: string[]; spellbook?: string[] }> }).byClass ?? {};
    const indexes = [...new Set(Object.values(byClass).flatMap((s) => [...(s.known ?? []), ...(s.prepared ?? []), ...(s.spellbook ?? [])]))];
    if (indexes.length) {
      const spells = await prisma.spell.findMany({ where: { index: { in: indexes } }, select: { name: true } });
      if (spells.some((s) => !spellInSrd(s.name))) return { ok: false, errors: ["That spell is not part of the free rules (SRD)"] };
    }
  }

  const row = await prisma.character.create({
    data: {
      ownerId: user.id,
      ...c,
      classes: c.classes as unknown as object,
      baseScores: c.baseScores as unknown as object,
      scoreBonuses: c.scoreBonuses,
      hitDiceSpent: c.hitDiceSpent,
      deathSaves: c.deathSaves,
      currency: c.currency,
      equipment: c.equipment as unknown as object,
      resources: c.resources,
      personality: c.personality as object,
      spells: c.spells as object,
      companions: c.companions as unknown as object,
    },
  });
  revalidatePath("/characters");
  return { ok: true, id: row.id };
}

/** Rules audit: the stored-character checks plus feat prerequisites and spell selections, which need the content tables. */
export async function runAudit(characterId: string): Promise<{ ok: true; issues: AuditIssue[] } | { ok: false; errors: string[] }> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return { ok: false, errors: ["Character not found"] };
  const issues = auditStored(c);

  const featRows = await prisma.feat.findMany({ where: { index: { in: c.feats as string[] } } });
  const ctx = prereqContext(c);
  for (const f of featRows) {
    const check = checkPrerequisites(f.prerequisite, ctx);
    if (!check.met) issues.push({ severity: "error", message: `${f.name} requires ${check.unmet.join(", ")}` });
    for (const r of check.needsDmReview) issues.push({ severity: "warning", message: `${f.name}: DM should confirm "${r}"` });
  }

  const byClass = ((c.spells ?? {}) as { byClass?: Record<string, SpellSelection> }).byClass ?? {};
  for (const [classIndex, sel] of Object.entries(byClass)) {
    const level = (c.classes as ClassLevel[]).find((k) => k.classIndex === classIndex)?.level;
    const ability = CASTING_ABILITY[classIndex];
    if (!level || !ability || !CASTER_KIND[classIndex]) {
      issues.push({ severity: "error", message: `Spells are listed for ${CLASS_NAME[classIndex] ?? classIndex}, which you do not have` });
      continue;
    }
    const all = [...new Set([...sel.known, ...sel.prepared, ...sel.spellbook])];
    const rows = await prisma.spell.findMany({ where: { index: { in: all } }, select: { index: true, name: true, level: true, classes: true } });
    const score = ctx.scores[ability];
    for (const e of validateSpellSelection(classIndex, level, score, sel, new Map<string, SpellMeta>(rows.map((r) => [r.index, r])))) {
      issues.push({ severity: "error", message: `${CLASS_NAME[classIndex]}: ${e}` });
    }
  }
  return { ok: true, issues };
}
