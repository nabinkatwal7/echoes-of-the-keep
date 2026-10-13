"use server";

import { signOut } from "@/auth";
import { requireUser } from "@/lib/auth";
import { changePassword, removeAccount, type Outcome } from "./service";

export async function changePasswordAction(_prev: Outcome | undefined, form: FormData): Promise<Outcome> {
  const user = await requireUser();
  if (form.get("next") !== form.get("confirm")) return { ok: false, error: "The new passwords do not match" };
  return changePassword(user.id, String(form.get("current") ?? ""), String(form.get("next") ?? ""));
}

export async function deleteAccountAction(_prev: Outcome | undefined, form: FormData): Promise<Outcome> {
  const user = await requireUser();
  const r = await removeAccount(user.id, String(form.get("password") ?? ""), String(form.get("username") ?? ""));
  if (!r.ok) return r;
  await signOut({ redirectTo: "/" });
  return r;
}
