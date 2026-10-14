"use client";

import { useActionState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Field, Input } from "@/app/components/ui/Input";
import { recoverAction } from "@/lib/account/actions";

export default function RecoverPage() {
  const [state, action, pending] = useActionState(recoverAction, undefined);
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-14">
      <h1 className="gilded text-4xl font-bold">Use a recovery code</h1>
      <Card className="p-7">
        <form action={action} className="flex flex-col gap-4">
          <Field label="Username">
            <Input name="username" autoComplete="username" required />
          </Field>
          <Field label="Recovery code">
            <Input name="code" autoComplete="one-time-code" required />
          </Field>
          <Field label="New password">
            <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
          </Field>
          {state && (
            <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-emerald" : "text-sm text-danger"}>
              {state.ok ? "Password updated. You can sign in." : state.error}
            </p>
          )}
          <Button disabled={pending}>{pending ? "One moment…" : "Set new password"}</Button>
        </form>
      </Card>
    </main>
  );
}
