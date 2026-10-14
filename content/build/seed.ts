// Content seeding entry point. Add an importer in importers.ts per content type (instructions.txt f8-f16).
// With CONTENT_LICENSE_MODE=SRD_ONLY only SRD 5.1 rows are written and anything else already in the database is removed.
import { PrismaClient } from "@prisma/client";
import { HAS_HANDBOOK } from "./handbook";
import { importers } from "./importers";
import { purgeNonSrd, srdRows } from "./srdSeed";

const prisma = new PrismaClient();
const srdMode = process.env.CONTENT_LICENSE_MODE === "SRD_ONLY";

async function main() {
  if (!HAS_HANDBOOK) {
    console.error(
      [
        "The rules data is not here yet.",
        "This project does not ship the Player's Handbook or text extracted from it. To fill the database:",
        "  1. Put a legitimate copy of the handbook PDF at DD-Player-Handbook.pdf in the project folder.",
        "  2. Run: pnpm content:extract   (needs Python 3 and pdftotext from poppler on your PATH)",
        "  3. Run: pnpm db:seed",
        "See docs/04-content-pipeline.md and docs/licensing.md.",
      ].join("\n"),
    );
    process.exit(1);
  }
  for (const importer of importers) {
    const all = importer.load();
    const rows = srdMode ? srdRows(importer.name, all as never[]) : all;
    await importer.write(prisma, rows);
    if (srdMode) await purgeNonSrd(prisma, importer.name, rows as never[]);
    console.log(`${importer.name}: ${rows.length}${srdMode ? ` of ${all.length} (SRD only)` : ""} rows`);
  }
}

main().finally(() => prisma.$disconnect());
