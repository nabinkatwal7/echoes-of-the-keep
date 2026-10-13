import { deriveCharacter } from "@/engine/character";
import { validateCharacter } from "@/engine/character/validate";
import { SUBCLASS_LEVEL } from "@/engine/classes/subclasses";
import type { ClassLevel } from "@/engine/progression";
import { toEngineInput, type StoredCharacter } from "./derive";
import type { InventoryItem } from "./inventory";
import { resourceViews, slotViews, type StoredPlay } from "./play";

export type AuditIssue = { severity: "error" | "warning"; message: string };

type Auditable = StoredCharacter & Partial<StoredPlay> & { raceIndex?: string; feats?: unknown };

/** Rule checks that need only the stored character. Spell and feat-prerequisite checks need the database (see auditActions). */
export function auditStored(c: Auditable): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const err = (message: string) => issues.push({ severity: "error", message });
  const warn = (message: string) => issues.push({ severity: "warning", message });

  const input = toEngineInput(c);
  for (const i of validateCharacter(input)) err(i.message);

  const classes = c.classes as ClassLevel[];
  for (const k of classes) {
    const due = SUBCLASS_LEVEL[k.classIndex];
    if (due && k.level >= due && !k.subclassIndex) err(`${k.classIndex} level ${k.level} needs a subclass`);
  }

  const derived = deriveCharacter(input);
  if (c.currentHp !== undefined && c.currentHp > derived.maxHp) err(`Current HP (${c.currentHp}) is above the maximum (${derived.maxHp})`);

  if (c.resources !== undefined) {
    for (const r of resourceViews(c as StoredPlay)) if (r.used > r.max) err(`${r.label} uses exceed the maximum`);
    for (const s of slotViews(c as StoredPlay).slots) if (s.used > s.total) err(`Level ${s.level} slots used exceed the total`);
  }

  const items = ((c.equipment as InventoryItem[] | undefined) ?? []);
  const worn = items.filter((i) => i.kind === "armor" && i.equipped);
  if (worn.length > 1) err("More than one suit of armor is equipped");
  if (items.filter((i) => i.kind === "shield" && i.equipped).length > 1) err("More than one shield is equipped");
  for (const a of worn) {
    const total = (input.baseScores.str ?? 0) + (input.scoreBonuses?.str ?? 0);
    if (a.strengthRequired && total < a.strengthRequired) warn(`${a.name} needs Strength ${a.strengthRequired}; your speed is reduced by 10 ft`);
  }
  const wielded = items.filter((i) => i.kind === "weapon" && i.equipped);
  if (wielded.some((w) => w.twoHanded) && items.some((i) => i.kind === "shield" && i.equipped)) warn("A two-handed weapon and a shield are both equipped");
  return issues;
}
