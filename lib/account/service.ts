import { exportCharacter } from "@/lib/characters/portable";
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export type Outcome = { ok: true } | { ok: false; error: string };

/** Everything the account owns, in one JSON-friendly object (the person's own data only; other players' content is left out). */
export async function exportAccount(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, displayName: true, createdAt: true } });
  if (!user) return null;
  const [characters, memberships, journal] = await Promise.all([
    prisma.character.findMany({ where: { ownerId: userId } }),
    prisma.campaignMember.findMany({ where: { userId }, include: { campaign: { select: { name: true } } } }),
    prisma.journalEntry.findMany({ where: { authorId: userId }, select: { kind: true, title: true, body: true, visibility: true, createdAt: true, campaignId: true } }),
  ]);
  return {
    format: "dnd-account-export",
    exportedAt: new Date().toISOString(),
    user,
    characters: characters.map((c) => exportCharacter(c as unknown as Record<string, unknown>)),
    campaigns: memberships.map((m) => ({ name: m.campaign.name, role: m.role, joinedAt: m.joinedAt })),
    journal,
  };
}

export async function changePassword(userId: string, current: string, next: string): Promise<Outcome> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !verifyPassword(current, user.passwordHash)) return { ok: false, error: "Your current password is not right" };
  if (next.length < MIN_PASSWORD_LENGTH) return { ok: false, error: `The new password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  if (next === current) return { ok: false, error: "Choose a different password" };
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hashPassword(next) } });
  return { ok: true };
}

/**
 * Permanently delete the account. Heroes, memberships and journal entries go with it, and campaigns the person runs as DM
 * are deleted for everyone (the caller warns first). Needs the password and the exact username.
 */
export async function removeAccount(userId: string, password: string, typedUsername: string): Promise<Outcome> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "Account not found" };
  if (typedUsername.trim().toLowerCase() !== user.username) return { ok: false, error: "Type your username exactly to confirm" };
  if (!verifyPassword(password, user.passwordHash)) return { ok: false, error: "That password is not right" };
  await prisma.user.delete({ where: { id: userId } });
  return { ok: true };
}
