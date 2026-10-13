// Content seeding entry point (filled in as each content type is imported, see instructions.txt f8-f16).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("No content importers registered yet.");
}

main().finally(() => prisma.$disconnect());
