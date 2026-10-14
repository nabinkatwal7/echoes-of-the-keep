import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

/**
 * Local demo data: a DM, a player with a wizard, a campaign with an active encounter. Safe to run repeatedly.
 * Sign in as demo_dm / demo_player with the password "demo-password-1" (local development only).
 */
const PASSWORD = "demo-password-1";

async function main() {
  const passwordHash = hashPassword(PASSWORD);
  const dm = await prisma.user.upsert({ where: { username: "demo_dm" }, update: { passwordHash }, create: { username: "demo_dm", displayName: "Demo DM", passwordHash } });
  const player = await prisma.user.upsert({ where: { username: "demo_player" }, update: { passwordHash }, create: { username: "demo_player", displayName: "Demo Player", passwordHash } });

  let campaign = await prisma.campaign.findFirst({ where: { dmId: dm.id, name: "Demo: The Sunken Crypt" } });
  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: {
        name: "Demo: The Sunken Crypt",
        description: "A short demo campaign for trying the table, combat and DM tools.",
        dmId: dm.id,
        inviteCode: "DEMO2345",
        members: { create: [{ userId: dm.id, role: "DM" }, { userId: player.id, role: "PLAYER" }] },
      },
    });
  }
  if (!(await prisma.encounter.findFirst({ where: { campaignId: campaign.id } }))) {
    const enc = await prisma.encounter.create({ data: { campaignId: campaign.id, name: "Demo: wolves on the road" } });
    await prisma.combatant.createMany({
      data: [1, 2].map((n) => ({ encounterId: enc.id, kind: "monster", creatureIndex: "wolf", name: `Wolf ${n}`, dexMod: 2, ac: 13, hp: 11, maxHp: 11, speed: 40, x: 4 + n, y: 3 })),
    });
  }
  let hero = await prisma.character.findFirst({ where: { ownerId: player.id, name: "Demo Hero" } });
  if (!hero) {
    hero = await prisma.character.create({
      data: {
        ownerId: player.id, name: "Demo Hero", raceIndex: "human", backgroundIndex: "soldier", alignment: "neutral-good",
        classes: [{ classIndex: "fighter", level: 1 }], baseScores: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 }, abilityMethod: "standard",
        scoreBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, skillProficiencies: ["athletics", "perception"], speed: 30, currentHp: 13,
        equipment: [], currency: { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 }, personality: {},
      },
    });
  }
  await prisma.campaignCharacter.upsert({ where: { campaignId_characterId: { campaignId: campaign.id, characterId: hero.id } }, update: {}, create: { campaignId: campaign.id, characterId: hero.id } });
  console.log(`Hero /characters/${hero.id}`);
  console.log(`Campaign ${campaign.id}: /campaigns/${campaign.id}`);
  console.log(`Sign in as demo_dm or demo_player, password: ${PASSWORD}`);
  await prisma.$disconnect();
}

void main();
