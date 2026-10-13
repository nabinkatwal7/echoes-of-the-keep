import { vi } from "vitest";
import { prisma } from "@/lib/prisma";

/** Integration tests talk to the real local database. Run them with `pnpm test:db`. */
export const RUN_DB = process.env.RUN_DB_TESTS === "1";

export const current = { id: "", name: "" };

// Server actions call requireUser(); tests choose who is "signed in" by setting `current`.
vi.mock("@/lib/auth", () => ({
  requireUser: async () => ({ id: current.id, name: current.name }),
  getUser: async () => ({ id: current.id, name: current.name }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const created: string[] = [];

export async function makeUser(label: string) {
  const u = await prisma.user.create({
    data: { username: `itest_${label}_${Math.random().toString(36).slice(2, 8)}`, displayName: `Test ${label}`, passwordHash: "!" },
  });
  created.push(u.id);
  return u;
}

export const signInAs = (u: { id: string; displayName: string }) => {
  current.id = u.id;
  current.name = u.displayName;
};

/** Remove everything the tests created (characters and campaigns cascade from users). */
export async function cleanup() {
  if (created.length) await prisma.user.deleteMany({ where: { id: { in: created } } });
  await prisma.$disconnect();
}
