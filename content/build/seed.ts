// Content seeding entry point. Add an importer in importers.ts per content type (instructions.txt f8-f16).
// With CONTENT_LICENSE_MODE=SRD_ONLY only SRD 5.1 rows are written and anything else already in the database is removed.
import { PrismaClient } from "@prisma/client";
import { importers } from "./importers";
import { purgeNonSrd, srdRows } from "./srdSeed";

const prisma = new PrismaClient();
const srdMode = process.env.CONTENT_LICENSE_MODE === "SRD_ONLY";

async function main() {
  for (const importer of importers) {
    const all = importer.load();
    const rows = srdMode ? srdRows(importer.name, all as never[]) : all;
    await importer.write(prisma, rows);
    if (srdMode) await purgeNonSrd(prisma, importer.name, rows as never[]);
    console.log(`${importer.name}: ${rows.length}${srdMode ? ` of ${all.length} (SRD only)` : ""} rows`);
  }
}

main().finally(() => prisma.$disconnect());
