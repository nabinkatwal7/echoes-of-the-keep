// Content seeding entry point. Add an importer in importers.ts per content type (instructions.txt f8-f16).
import { PrismaClient } from "@prisma/client";
import { importers } from "./importers";

const prisma = new PrismaClient();

async function main() {
  for (const importer of importers) {
    const rows = importer.load();
    await importer.write(prisma, rows);
    console.log(`${importer.name}: ${rows.length} rows`);
  }
}

main().finally(() => prisma.$disconnect());
