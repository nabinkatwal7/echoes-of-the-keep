import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanup, makeUser, RUN_DB, signInAs } from "./db";
import { attachCharacter, createCampaign, joinCampaign, postMessage } from "@/lib/campaigns/actions";
import { getVisibleEventsForTest } from "./helpers";
import { createCharacter } from "@/lib/characters/actions";
import { prisma } from "@/lib/prisma";

describe.skipIf(!RUN_DB)("campaigns (database)", () => {
  let dm: Awaited<ReturnType<typeof makeUser>>;
  let alice: Awaited<ReturnType<typeof makeUser>>;
  let outsider: Awaited<ReturnType<typeof makeUser>>;
  let campaignId = "";
  let code = "";

  beforeAll(async () => {
    dm = await makeUser("dm");
    alice = await makeUser("alice");
    outsider = await makeUser("outsider");
    signInAs(dm);
  });
  afterAll(cleanup);

  it("creates a campaign with the creator as DM and an invite code", async () => {
    const r = await createCampaign("  Itest Mine  ", "A goblin ambush");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    campaignId = r.id;
    const c = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId }, include: { members: true } });
    code = c.inviteCode;
    expect(c.name).toBe("Itest Mine");
    expect(code).toMatch(/^[A-Z2-9]{8}$/);
    expect(c.members).toMatchObject([{ userId: dm.id, role: "DM" }]);
    expect((await createCampaign("x")).ok).toBe(false);
  });

  it("lets a player join with the code (case-insensitively, once)", async () => {
    signInAs(alice);
    expect((await joinCampaign("WRONGCODE")).ok).toBe(false);
    expect((await joinCampaign(code.toLowerCase())).ok).toBe(true);
    expect((await joinCampaign(code)).ok).toBe(true); // idempotent
    const members = await prisma.campaignMember.findMany({ where: { campaignId } });
    expect(members.map((m) => m.role).sort()).toEqual(["DM", "PLAYER"]);
  });

  it("attaches only the player's own heroes", async () => {
    signInAs(alice);
    const hero = await createCharacter(
      {
        name: "Itest Alice Hero", raceIndex: "dwarf", subraceIndex: "hill-dwarf", classIndex: "fighter", backgroundIndex: "soldier",
        abilityMethod: "standard", scores: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 }, classSkills: ["perception", "survival"],
      },
      "kit",
    );
    if (!hero.ok) throw new Error(hero.errors.join());
    expect((await attachCharacter(campaignId, hero.id)).ok).toBe(true);
    signInAs(outsider);
    expect((await attachCharacter(campaignId, hero.id)).ok).toBe(false); // not a member
    signInAs(dm);
    expect((await attachCharacter(campaignId, hero.id)).ok).toBe(false); // not the DM's hero
  });

  it("posts chat and rolls on the server, with secret rolls DM-only", async () => {
    signInAs(alice);
    expect((await postMessage(campaignId, "Hello table")).ok).toBe(true);
    expect((await postMessage(campaignId, "/roll 2d6+3 stealth")).ok).toBe(true);
    expect((await postMessage(campaignId, "/gmroll 1d20")).ok).toBe(false); // players cannot
    expect((await postMessage(campaignId, "/w dm I pick the lock")).ok).toBe(true);
    expect((await postMessage(campaignId, "/roll nonsense")).ok).toBe(false);

    signInAs(dm);
    expect((await postMessage(campaignId, "/gmroll 1d20 hidden trap")).ok).toBe(true);

    const roll = await prisma.campaignEvent.findFirstOrThrow({ where: { campaignId, type: "roll", audience: "ALL" } });
    const p = roll.payload as { total: number; expression: string; rolls: number[][] };
    expect(p.expression).toBe("2d6+3");
    expect(p.total).toBe(p.rolls[0][0] + p.rolls[0][1] + 3); // computed by the server's dice
  });

  it("filters what each person can see", async () => {
    const dmView = await getVisibleEventsForTest(campaignId, { userId: dm.id, isDm: true });
    const aliceView = await getVisibleEventsForTest(campaignId, { userId: alice.id, isDm: false });
    const outsiderView = await getVisibleEventsForTest(campaignId, { userId: outsider.id, isDm: false });

    const has = (view: typeof dmView, text: string) => view.some((e) => JSON.stringify(e.payload).includes(text));
    expect(has(dmView, "hidden trap")).toBe(true);
    expect(has(dmView, "I pick the lock")).toBe(true);
    expect(has(aliceView, "hidden trap")).toBe(false); // secret roll
    expect(aliceView.some((e) => e.type === "roll" && e.audience === "DM")).toBe(false);
    expect(has(aliceView, "I pick the lock")).toBe(true); // her own whisper
    expect(has(outsiderView, "I pick the lock")).toBe(false);
    expect(has(outsiderView, "Hello table")).toBe(true); // public events are public (access is enforced by the stream route)
  });

  it("refuses to post for non-members", async () => {
    signInAs(outsider);
    expect((await postMessage(campaignId, "let me in")).ok).toBe(false);
  });

  it("whispers between players reach only the two of them", async () => {
    const carol = await makeUser("carol");
    signInAs(carol);
    await joinCampaign(code);
    signInAs(alice);
    const first = await postMessage(campaignId, `/w ${carol.username} meet me at the well`);
    expect(first.ok).toBe(true);
    expect((await postMessage(campaignId, "/w nobody hello")).ok).toBe(false);
    expect((await postMessage(campaignId, `/w ${alice.username} to myself`)).ok).toBe(false);
    const sees = async (u: { id: string }, isDm: boolean) => (await getVisibleEventsForTest(campaignId, { userId: u.id, isDm })).some((e) => JSON.stringify(e.payload).includes("meet me at the well"));
    expect(await sees(alice, false)).toBe(true);
    expect(await sees(carol, false)).toBe(true);
    expect(await sees(dm, true)).toBe(false); // the DM does not read player-to-player whispers
  });
});
