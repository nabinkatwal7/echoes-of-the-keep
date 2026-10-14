import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanup, makeUser, RUN_DB } from "./db";
import { changePassword, exportAccount, purgeExpiredAccounts, removeAccount } from "@/lib/account/service";
import { createCampaign } from "@/lib/campaigns/actions";
import { createCharacter } from "@/lib/characters/actions";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { signInAs } from "./db";

describe.skipIf(!RUN_DB)("account data (database)", () => {
  let user: Awaited<ReturnType<typeof makeUser>>;
  beforeAll(async () => {
    user = await makeUser("acct");
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword("correct horse") } });
    signInAs(user);
    await createCharacter({ name: "Itest Keeper", raceIndex: "human", classIndex: "fighter", backgroundIndex: "soldier", abilityMethod: "standard", scores: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 }, classSkills: ["acrobatics", "perception"] }, "kit");
    await createCampaign("Itest Account Campaign");
  });
  afterAll(cleanup);

  it("exports the person's own heroes, campaigns and journal", async () => {
    const data = await exportAccount(user.id);
    expect(data?.user.username).toBe(user.username);
    expect(data?.characters).toHaveLength(1);
    expect(data?.campaigns).toEqual([expect.objectContaining({ name: "Itest Account Campaign", role: "DM" })]);
    expect(JSON.stringify(data)).not.toContain("passwordHash");
    expect(await exportAccount("missing")).toBeNull();
  });

  it("changes the password only with the current one and a long enough new one", async () => {
    expect((await changePassword(user.id, "wrong", "another long one")).ok).toBe(false);
    expect((await changePassword(user.id, "correct horse", "short")).ok).toBe(false);
    expect((await changePassword(user.id, "correct horse", "correct horse")).ok).toBe(false);
    expect((await changePassword(user.id, "correct horse", "battery staple")).ok).toBe(true);
    expect((await changePassword(user.id, "correct horse", "again again")).ok).toBe(false); // the old one no longer works
  });

  it("hides a deleted account for 14 days, then purges it with its heroes and campaigns", async () => {
    expect((await removeAccount(user.id, "battery staple", "someone_else")).ok).toBe(false);
    expect((await removeAccount(user.id, "wrong password", user.username)).ok).toBe(false);
    expect((await removeAccount(user.id, "battery staple", user.username.toUpperCase())).ok).toBe(true);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).deletedAt).not.toBeNull();
    expect(await purgeExpiredAccounts()).toBe(0); // still inside the hold
    expect(await prisma.character.count({ where: { ownerId: user.id } })).toBe(1);
    const later = Date.now() + 15 * 24 * 60 * 60 * 1000;
    expect(await purgeExpiredAccounts(later)).toBeGreaterThanOrEqual(1);
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(0);
    expect(await prisma.character.count({ where: { ownerId: user.id } })).toBe(0);
    expect(await prisma.campaign.count({ where: { dmId: user.id } })).toBe(0);
  });
});
