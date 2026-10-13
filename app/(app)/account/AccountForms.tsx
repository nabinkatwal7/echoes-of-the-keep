"use client";

import { useActionState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Field, Input } from "@/app/components/ui/Input";
import { changePasswordAction, deleteAccountAction } from "@/lib/account/actions";

export function AccountForms({ username, heroes, campaignsRun }: { username: string; heroes: number; campaignsRun: number }) {
  const [pw, changePw, pwPending] = useActionState(changePasswordAction, undefined);
  const [del, deleteIt, delPending] = useActionState(deleteAccountAction, undefined);
  return (
    <>
      <Card className="p-5">
        <form action={changePw} className="flex max-w-md flex-col gap-3">
          <h2 className="eyebrow">Change password</h2>
          <Field label="Current password">
            <Input name="current" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="New password" hint="at least 8 characters">
            <Input name="next" type="password" autoComplete="new-password" required minLength={8} />
          </Field>
          <Field label="Repeat new password">
            <Input name="confirm" type="password" autoComplete="new-password" required minLength={8} />
          </Field>
          {pw && (
            <p role={pw.ok ? "status" : "alert"} className={pw.ok ? "text-sm text-emerald" : "text-sm text-danger"}>
              {pw.ok ? "Password changed." : pw.error}
            </p>
          )}
          <div>
            <Button type="submit" disabled={pwPending}>
              Change password
            </Button>
          </div>
        </form>
      </Card>
      <Card className="border-crimson/50 p-5">
        <form action={deleteIt} className="flex max-w-md flex-col gap-3">
          <h2 className="eyebrow text-danger">Delete account</h2>
          <p className="text-sm">
            This permanently deletes your {heroes} hero{heroes === 1 ? "" : "es"}, your journal entries and your place in every campaign.
            {campaignsRun > 0 && (
              <strong>
                {" "}
                The {campaignsRun} campaign{campaignsRun === 1 ? "" : "s"} you run as DM will be deleted for every player.
              </strong>
            )}{" "}
            It cannot be undone, so download your data first.
          </p>
          <Field label={`Type your username (${username}) to confirm`}>
            <Input name="username" autoComplete="off" required />
          </Field>
          <Field label="Password">
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
          {del && !del.ok && (
            <p role="alert" className="text-sm text-danger">
              {del.error}
            </p>
          )}
          <div>
            <Button type="submit" variant="danger" disabled={delPending}>
              Delete my account forever
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
