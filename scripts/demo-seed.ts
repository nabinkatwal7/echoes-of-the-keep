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
  console.log(`Campaign ${campaign.id}: /campaigns/${campaign.id}`);
  console.log(`Sign in as demo_dm or demo_player, password: ${PASSWORD}`);
  await prisma.$disconnect();
}

void main();
