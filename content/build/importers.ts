import { readFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { alignmentSchema } from "../schemas/alignment";
import { backgroundSchema, conditionSchema, featSchema, spellSchema } from "../schemas/phb";

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
    load: () => z.array(spellSchema).parse(extracted("spells.json")),
    write: (prisma, rows) => upsertAll(prisma.spell, rows),
  },
];
