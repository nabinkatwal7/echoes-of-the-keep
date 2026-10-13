import { z } from "zod";
import { ABILITIES } from "@/engine/abilities";
import { validateCharacter } from "@/engine/character/validate";
import { toEngineInput } from "./derive";

export const FORMAT = "dnd-character";
export const VERSION = 1;
export const MAX_IMPORT_BYTES = 200_000;

const scores = z.object(Object.fromEntries(ABILITIES.map((a) => [a, z.number().int().min(1).max(30)])) as Record<(typeof ABILITIES)[number], z.ZodNumber>);
const purse = z.object({ cp: z.number().int().min(0), sp: z.number().int().min(0), ep: z.number().int().min(0), gp: z.number().int().min(0), pp: z.number().int().min(0) });

const characterSchema = z.object({
  name: z.string().min(1).max(80),
  raceIndex: z.string().min(1),
  subraceIndex: z.string().nullable().default(null),
  backgroundIndex: z.string().min(1),
  alignment: z.string().nullable().default(null),
  classes: z.array(z.object({ classIndex: z.string(), level: z.number().int().min(1).max(20), subclassIndex: z.string().optional() })).min(1).max(12),
  baseScores: scores,
  abilityMethod: z.enum(["standard", "pointbuy", "roll"]),
  scoreBonuses: z.record(z.string(), z.number().int()).default({}),
  skillProficiencies: z.array(z.string()).default([]),
  skillExpertise: z.array(z.string()).default([]),
  feats: z.array(z.string()).default([]),
  speed: z.number().int().min(0).max(120).default(30),
  xp: z.number().int().min(0).max(10_000_000).default(0),
  inspiration: z.boolean().default(false),
  currentHp: z.number().int().min(0).max(1000),
  tempHp: z.number().int().min(0).max(1000).default(0),
  hitDiceSpent: z.record(z.string(), z.object({ total: z.number().int().min(0), spent: z.number().int().min(0) })).default({}),
  deathSaves: z.object({ successes: z.number().int().min(0).max(3), failures: z.number().int().min(0).max(3) }).default({ successes: 0, failures: 0 }),
  conditions: z.array(z.string()).default([]),
  exhaustion: z.number().int().min(0).max(6).default(0),
  currency: purse.default({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }),
  equipment: z.array(z.record(z.string(), z.unknown())).max(300).default([]),
  spellSlotsUsed: z.array(z.number().int().min(0)).default([]),
  // older rows stored an empty array here; the current shape is { key: usesSpent }
  resources: z
    .union([z.record(z.string(), z.union([z.number(), z.string()])), z.array(z.never())])
    .transform((v) => (Array.isArray(v) ? {} : v))
    .default({}),
  personality: z.record(z.string(), z.unknown()).default({}),
  spells: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().max(5000).default(""),
  companions: z.array(z.record(z.string(), z.unknown())).max(50).default([]),
});

export type PortableCharacter = z.infer<typeof characterSchema>;

const FIELDS = Object.keys(characterSchema.shape) as (keyof PortableCharacter)[];

/** A self-describing JSON document for a character: no ids and no owner, so it can be shared and re-imported. */
export function exportCharacter(row: Record<string, unknown>) {
  const character = Object.fromEntries(FIELDS.map((f) => [f, row[f]]));
  return { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), character };
}

export type ImportResult = { ok: true; character: PortableCharacter } | { ok: false; errors: string[] };

/** Parse and validate an exported character. Anything illegal under the rules is rejected with the reason. */
export function parseImport(text: string): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, errors: ["File is too large"] };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["That is not valid JSON"] };
  }
  const doc = json as { format?: string; version?: number; character?: unknown };
  if (doc?.format !== FORMAT) return { ok: false, errors: ["This file is not a character export"] };
  if (doc.version !== VERSION) return { ok: false, errors: [`Unsupported export version ${String(doc.version)}`] };
  const parsed = characterSchema.safeParse(doc.character);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.slice(0, 6).map((i) => `${i.path.join(".")}: ${i.message}`) };

  const c = parsed.data;
  const issues = validateCharacter(toEngineInput(c as never)).filter((i) => i.code !== "too-many-improvements");
  if (issues.length) return { ok: false, errors: issues.map((i) => i.message) };
  return { ok: true, character: c };
}
