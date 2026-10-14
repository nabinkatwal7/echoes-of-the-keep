"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { checkCredentials, hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export type AccountResult = { ok: false; error: string } | undefined;

/** Create an account and sign in. Returns an error message, or redirects on success. */
export async function register(_prev: AccountResult, formData: FormData): Promise<AccountResult> {
  const check = checkCredentials(String(formData.get("username") ?? ""), String(formData.get("password") ?? ""));
  if (!check.ok) return { ok: false, error: check.error };
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 40) || check.username;
  if (formData.get("password") !== formData.get("confirm")) return { ok: false, error: "Passwords do not match" };
  const recent = await prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 60_000) } } });
  if (recent >= 20) return { ok: false, error: "Too many new accounts right now. Try again in a minute." };

  try {
    await prisma.user.create({
      data: { username: check.username, displayName, passwordHash: hashPassword(String(formData.get("password"))) },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { ok: false, error: "That username is taken" };
    throw e;
  }
  await signIn("credentials", { username: check.username, password: String(formData.get("password")), redirectTo: "/characters" });
}

export async function login(_prev: AccountResult, formData: FormData): Promise<AccountResult> {
  try {
    await signIn("credentials", {
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: String(formData.get("next") ?? "/characters"),
    });
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: "Wrong username or password, or too many attempts. Try again later." };
    throw e; // the redirect on success is thrown by Next
  }
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
