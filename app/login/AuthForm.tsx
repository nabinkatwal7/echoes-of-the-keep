"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, type AccountResult } from "@/lib/accounts";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const [state, action, pending] = useActionState<AccountResult, FormData>(mode === "login" ? login : register, undefined);
  const field = "min-h-11 w-full rounded-md border border-border bg-surface px-3 py-2";
  return (
    <form action={action} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      <label className="flex flex-col gap-1 text-sm">
        Username
        <input name="username" autoComplete="username" required minLength={3} maxLength={24} className={field} />
      </label>
      {mode === "register" && (
        <label className="flex flex-col gap-1 text-sm">
          Display name <span className="text-muted">(optional)</span>
          <input name="displayName" maxLength={40} className={field} />
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} className={field} />
      </label>
      {mode === "register" && (
        <label className="flex flex-col gap-1 text-sm">
          Confirm password
          <input name="confirm" type="password" autoComplete="new-password" required minLength={8} className={field} />
        </label>
      )}
      {state && !state.ok && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className="min-h-11 rounded-md bg-accent px-4 py-2 font-medium text-white disabled:opacity-60">
        {pending ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>New here? <Link href="/register" className="underline">Create an account</Link></>
        ) : (
          <>Already have an account? <Link href="/login" className="underline">Sign in</Link></>
        )}
      </p>
    </form>
  );
}
