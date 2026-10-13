"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Field, Input } from "@/app/components/ui/Input";
import { login, register, type AccountResult } from "@/lib/accounts";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const [state, action, pending] = useActionState<AccountResult, FormData>(mode === "login" ? login : register, undefined);
  return (
    <form action={action} className="flex flex-col gap-5">
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Username">
        <Input name="username" autoComplete="username" required minLength={3} maxLength={24} />
      </Field>
      {mode === "register" && (
        <Field label="Display name" hint="shown to your party">
          <Input name="displayName" maxLength={40} />
        </Field>
      )}
      <Field label="Password">
        <Input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} />
      </Field>
      {mode === "register" && (
        <Field label="Confirm password">
          <Input name="confirm" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
      )}
      {state && !state.ok && (
        <p role="alert" className="rounded border border-crimson/60 bg-crimson/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button disabled={pending} className="w-full">
        {pending ? "One moment…" : mode === "login" ? "Enter the realm" : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            New adventurer?{" "}
            <Link href="/register" className="text-gold underline-offset-4 hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have a character sheet?{" "}
            <Link href="/login" className="text-gold underline-offset-4 hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
