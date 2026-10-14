import { afterAll, describe, expect, it } from "vitest";
import { RUN_DB } from "./db";
import { BLUEPRINTS } from "@/engine/bots/blueprints";
import { buildBotHero, createBotUser } from "@/lib/solo/party";
import { prisma } from "@/lib/prisma";

const created: string[] = [];

describe.skipIf(!RUN_DB)("computer-played heroes (database)", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: created } } });
    await prisma.$disconnect();
  });

  it("builds every blueprint at levels 1, 3 and 5 under the normal creation and level-up rules", async () => {
    for (const bp of BLUEPRINTS) {
      for (const level of [1, 3, 5]) {
        const owner = await createBotUser(`Bot ${bp.key}`);
        created.push(owner.id);
        const id = await buildBotHero({ id: owner.id, name: owner.displayName }, bp, level, `Itest ${bp.key} ${level}`);
        const c = await prisma.character.findUniqueOrThrow({ where: { id } });
        expect(c.ownerId).toBe(owner.id);
        expect((c.classes as { level: number }[]).reduce((s, k) => s + k.level, 0), `${bp.key} level`).toBe(level);
        expect(c.currentHp).toBeGreaterThan(0);
        const state = (c.spells ?? {}) as { byClass?: Record<string, { known: string[]; prepared: string[] }> };
        if (bp.cantrips.length && !(bp.classIndex === "paladin" && level < 2)) {
          const sel = state.byClass?.[bp.classIndex];
          expect((sel?.prepared.length ?? 0) + (sel?.known.length ?? 0), `${bp.key} spells`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("makes bot accounts nobody can sign in to", async () => {
    const bot = await createBotUser("Bot Test");
    created.push(bot.id);
    expect(bot.isBot).toBe(true);
    expect(bot.passwordHash).toBe("!");
    expect(bot.username).toMatch(/^bot_[0-9a-f]{10}$/);
  });
});
