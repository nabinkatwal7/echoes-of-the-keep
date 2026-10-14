"use server";

import { signOut } from "@/auth";
import { requireUser } from "@/lib/auth";
import { changePassword, createRecoveryCodes, recoverWithCode, removeAccount, type Outcome } from "./service";

export async function changePasswordAction(_prev: Outcome | undefined, form: FormData): Promise<Outcome> {
  const user = await requireUser();
  if (form.get("next") !== form.get("confirm")) return { ok: false, error: "The new passwords do not match" };
  return changePassword(user.id, String(form.get("current") ?? ""), String(form.get("next") ?? ""));
}

export async function recoveryCodesAction(): Promise<{ ok: true; codes: string[] } | { ok: false; error: string }> {
  const user = await requireUser();
  const codes = await createRecoveryCodes(user.id);
  return { ok: true, codes };
}

export async function recoverAction(_prev: Outcome | undefined, form: FormData): Promise<Outcome> {
  return recoverWithCode(String(form.get("username") ?? ""), String(form.get("code") ?? ""), String(form.get("password") ?? ""));
}

export async function deleteAccountAction(_prev: Outcome | undefined, form: FormData): Promise<Outcome> {
  const user = await requireUser();
  const r = await removeAccount(user.id, String(form.get("password") ?? ""), String(form.get("username") ?? ""));
  if (!r.ok) return r;
  await signOut({ redirectTo: "/" });
  return r;
}
