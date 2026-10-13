import { readFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { alignmentSchema } from "../schemas/alignment";
import { ruleSectionSchema, subclassSchema } from "../schemas/rules";
import { loadSubclasses } from "./subclasses";
import { loadRuleSections } from "./ruleSections";
import {
  backgroundSchema,
  classSchema,
  conditionSchema,
  creatureSchema,
  equipmentSchema,
  featSchema,
  languageSchema,
  raceSchema,
  spellSchema,
} from "../schemas/phb";

export type Importer = {
  name: string;
  /** Parse and validate the source file; throws on any invalid record. */
  load: () => unknown[];
  /** Idempotent upsert by `index`. */
  write: (prisma: PrismaClient, rows: any[]) => Promise<void>;
};

/** Parsed handbook data written by `pnpm content:extract` (content/extracted/structured). */
const extracted = (file: string) =>
  JSON.parse(readFileSync(path.join(__dirname, "..", "extracted", "structured", file), "utf-8"));

async function upsertAll(delegate: { upsert: (args: any) => Promise<unknown> }, rows: { index: string }[]) {
  for (const row of rows) await delegate.upsert({ where: { index: row.index }, update: row, create: row });
}

/** Equipment rows have no natural key (lifestyle tiers repeat), so derive a unique slug from the name. */
function equipmentRows() {
  const seen = new Map<string, number>();
  return (extracted("equipment.json") as Record<string, unknown>[]).map((r) => {
    const base = String(r.name).toLowerCase().replace(/['’?]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const { rest, ...row } = r;
    return { ...row, index: n === 1 ? base : `${base}-${n}`, details: rest ?? "" };
  });
}

const overrides = (file: string) => JSON.parse(readFileSync(path.join(__dirname, "..", "overrides", file), "utf-8"));

export const importers: Importer[] = [
  {
    name: "alignments",
    load: () => z.array(alignmentSchema).parse(overrides("alignments.json")),
    write: async (prisma, rows) => {
      for (const row of rows) {
        await prisma.alignment.upsert({ where: { index: row.index }, update: row, create: row });
      }
    },
  },
  {
    name: "conditions",
    load: () => z.array(conditionSchema).parse(extracted("conditions.json")),
    write: (prisma, rows) => upsertAll(prisma.condition, rows),
  },
  {
    name: "feats",
    load: () => z.array(featSchema).parse(extracted("feats.json")),
    write: (prisma, rows) => upsertAll(prisma.feat, rows),
  },
  {
    name: "backgrounds",
    load: () => z.array(backgroundSchema).parse(extracted("backgrounds.json")),
    write: (prisma, rows) => upsertAll(prisma.background, rows),
  },
  {
    name: "spells",
    load: () => z.array(spellSchema).parse([...extracted("spells.json"), ...overrides("spells-extra.json")]),
    write: (prisma, rows) => upsertAll(prisma.spell, rows),
  },
  {
    name: "races",
    load: () => z.array(raceSchema).parse([...extracted("races.json"), ...overrides("races-extra.json")]),
    write: (prisma, rows) => upsertAll(prisma.race, rows),
  },
  {
    name: "classes",
    load: () => z.array(classSchema).parse(extracted("classes.json")),
    write: (prisma, rows) => upsertAll(prisma.class, rows),
  },
  {
    name: "creatures",
    load: () => z.array(creatureSchema).parse(extracted("creatures.json")),
    write: (prisma, rows) => upsertAll(prisma.creature, rows),
  },
  {
    name: "equipment",
    load: () => z.array(equipmentSchema).parse(equipmentRows()),
    write: (prisma, rows) => upsertAll(prisma.equipmentItem, rows),
  },
  {
    name: "rule-sections",
    load: () => z.array(ruleSectionSchema).parse(loadRuleSections()),
    write: async (prisma, rows) => {
      for (const row of rows) await prisma.ruleSection.upsert({ where: { id: row.id }, update: row, create: row });
    },
  },
  {
    name: "languages",
    load: () => z.array(languageSchema).parse(overrides("languages.json")),
    write: (prisma, rows) => upsertAll(prisma.language, rows),
  },
  {
    name: "subclasses",
    load: () => z.array(subclassSchema).parse(loadSubclasses()),
    write: (prisma, rows) => upsertAll(prisma.subclass, rows),
  },
];
