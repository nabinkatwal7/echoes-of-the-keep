import { randomBytes } from "node:crypto";
import { exportCharacter } from "@/lib/characters/portable";
import { checkCredentials, hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { HOLD_MS } from "./throttle";
import { deleteSoloGamesOf } from "@/lib/solo/cleanup";

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
  await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
  return { ok: true };
}

/** Permanently delete accounts whose 14-day hold has passed (heroes, journal and the campaigns they run go with them). Returns how many. */
export async function purgeExpiredAccounts(now = Date.now()): Promise<number> {
  const cutoff = new Date(now - HOLD_MS);
  const due = await prisma.user.findMany({ where: { deletedAt: { not: null, lt: cutoff } }, select: { id: true } });
  for (const u of due) await deleteSoloGamesOf(u.id);
  const r = await prisma.user.deleteMany({ where: { id: { in: due.map((u) => u.id) } } });
  return r.count;
}

/** Eight one-time codes. The plaintext is returned once; only hashes are stored. */
export async function createRecoveryCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: 8 }, () => randomCode());
  await prisma.user.update({ where: { id: userId }, data: { recoveryHashes: codes.map(hashPassword) } });
  return codes;
}

function randomCode() {
  const alphabet = "abcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** A recovery code sets a new password and is then discarded. */
export async function recoverWithCode(username: string, code: string, next: string): Promise<Outcome> {
  const check = checkCredentials(username, next);
  if (!check.ok) return check;
  const user = await prisma.user.findUnique({ where: { username: check.username } });
  if (!user) return { ok: false, error: "That code does not match" };
  const index = user.recoveryHashes.findIndex((hash) => verifyPassword(code.trim().toLowerCase(), hash));
  if (index < 0) return { ok: false, error: "That code does not match" };
  const recoveryHashes = user.recoveryHashes.filter((_, i) => i !== index);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(next), recoveryHashes, deletedAt: null },
  });
  return { ok: true };
}
