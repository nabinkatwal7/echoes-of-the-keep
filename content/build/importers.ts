import { readFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { alignmentSchema } from "../schemas/alignment";

export type Importer = {
  name: string;
  /** Parse and validate the source file; throws on any invalid record. */
  load: () => unknown[];
  /** Idempotent upsert by `index`. */
  write: (prisma: PrismaClient, rows: any[]) => Promise<void>;
};

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
];
