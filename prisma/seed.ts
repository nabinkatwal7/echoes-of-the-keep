import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = [
    { name: "John Doe", email: "john@example.com" },
    { name: "Jane Smith", email: "jane@example.com" },
  ];
  for (const user of users) {
    await prisma.user.upsert({ where: { email: user.email }, update: user, create: user });
  }
}

main().finally(() => prisma.$disconnect());
