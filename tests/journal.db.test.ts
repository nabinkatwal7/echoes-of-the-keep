import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanup, makeUser, RUN_DB, signInAs } from "./db";
import { createCampaign, joinCampaign } from "@/lib/campaigns/actions";
import { createEntry, deleteEntry, setVisibility, updateEntry } from "@/lib/journal/actions";
import { visibleEntries, sessionState } from "@/lib/journal/queries";
import { endSession, startSession } from "@/lib/journal/sessionActions";
import { prisma } from "@/lib/prisma";

describe.skipIf(!RUN_DB)("journal and sessions (database)", () => {
  let dm: Awaited<ReturnType<typeof makeUser>>;
  let alice: Awaited<ReturnType<typeof makeUser>>;
  let bob: Awaited<ReturnType<typeof makeUser>>;
  let cid = "";

  beforeAll(async () => {
    dm = await makeUser("dm");
    alice = await makeUser("alice");
    bob = await makeUser("bob");
    signInAs(dm);
    const c = await createCampaign("Itest Journal");
    if (!c.ok) throw new Error("setup");
    cid = c.id;
    const code = (await prisma.campaign.findUniqueOrThrow({ where: { id: cid } })).inviteCode;
    signInAs(alice);
    await joinCampaign(code);
    signInAs(bob);
    await joinCampaign(code);
  });
  afterAll(cleanup);

  it("keeps notes private to their author", async () => {
    signInAs(alice);
    const r = await createEntry(cid, { kind: "NOTE", title: "Suspicious innkeeper", body: "He knew our names." });
    expect(r.ok).toBe(true);
    expect((await visibleEntries(cid, alice.id)).map((e) => e.title)).toContain("Suspicious innkeeper");
    expect((await visibleEntries(cid, bob.id)).map((e) => e.title)).not.toContain("Suspicious innkeeper");
    expect((await visibleEntries(cid, dm.id)).map((e) => e.title)).not.toContain("Suspicious innkeeper");
    if (r.ok) {
      expect((await setVisibility(r.id, "PARTY")).ok).toBe(false); // players cannot publish notes
      signInAs(bob);
      expect((await updateEntry(r.id, { title: "x", body: "y" })).ok).toBe(false);
      expect((await deleteEntry(r.id)).ok).toBe(false);
    }
  });

  it("only the DM writes handouts, and they stay hidden until shared", async () => {
    signInAs(alice);
    expect((await createEntry(cid, { kind: "HANDOUT", title: "Map", body: "" })).ok).toBe(false);
    signInAs(dm);
    const h = await createEntry(cid, { kind: "HANDOUT", title: "The Sunken Map", body: "X marks the spot" });
    if (!h.ok) throw new Error("setup");
    expect((await visibleEntries(cid, bob.id)).map((e) => e.title)).not.toContain("The Sunken Map");
    expect((await setVisibility(h.id, "PARTY")).ok).toBe(true);
    expect((await visibleEntries(cid, bob.id)).map((e) => e.title)).toContain("The Sunken Map");
    expect(await prisma.campaignEvent.count({ where: { campaignId: cid, type: "system" } })).toBeGreaterThan(0);
    expect((await createEntry(cid, { kind: "NOTE", title: "", body: "" })).ok).toBe(false);
  });

  it("runs a session: start, save with a recap, and resume with it", async () => {
    signInAs(alice);
    expect((await startSession(cid)).ok).toBe(false);
    signInAs(dm);
    expect(await startSession(cid, "The Road North")).toEqual({ ok: true, number: 1 });
    expect((await startSession(cid)).ok).toBe(false); // already running
    expect((await endSession(cid, "  ")).ok).toBe(false);
    expect((await endSession(cid, "The party crossed the ford.", "Find the toll keeper")).ok).toBe(true);
    const { active, last } = await sessionState(cid);
    expect(active).toBeNull();
    expect(last).toMatchObject({ number: 1, summary: "The party crossed the ford.", nextUp: "Find the toll keeper" });
    expect((await visibleEntries(cid, bob.id)).some((e) => e.kind === "RECAP" && e.title.startsWith("Session 1"))).toBe(true);

    expect(await startSession(cid)).toEqual({ ok: true, number: 2 });
    const opening = await prisma.campaignEvent.findFirst({ where: { campaignId: cid, type: "system" }, orderBy: { id: "desc" } });
    expect((opening!.payload as { text: string }).text).toContain("Previously: The party crossed the ford.");
  });
});
