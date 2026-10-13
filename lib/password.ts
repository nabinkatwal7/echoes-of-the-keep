import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// scrypt with a per-password random salt; the cost parameters are stored in the hash so they can be raised later.
const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, KEY_LEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = scryptSync(password, Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const USERNAME_RE = /^[a-z0-9_]{3,24}$/;
export const MIN_PASSWORD_LENGTH = 8;

/** Normalised username (lowercase, trimmed) or an error message. */
export function checkCredentials(username: string, password: string): { ok: true; username: string } | { ok: false; error: string } {
  const u = username.trim().toLowerCase();
  if (!USERNAME_RE.test(u)) return { ok: false, error: "Username must be 3-24 characters: letters, numbers or underscore" };
  if (password.length < MIN_PASSWORD_LENGTH) return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  if (password.length > 200) return { ok: false, error: "Password is too long" };
  return { ok: true, username: u };
}
