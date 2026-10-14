"use client";

import { useActionState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Field, Input, Select } from "@/app/components/ui/Input";
import { addHomebrew, importHomebrew } from "@/lib/homebrew/actions";

export function HomebrewForms() {
  const [added, add, adding] = useActionState(addHomebrew, undefined);
  const [imported, load, loading] = useActionState(importHomebrew, undefined);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <form action={add} className="flex flex-col gap-3">
          <h2 className="eyebrow">New entry</h2>
          <Field label="Kind">
            <Select name="kind" defaultValue="race">
              <option value="race">Race</option>
              <option value="background">Background</option>
              <option value="feat">Feat</option>
              <option value="item">Item</option>
            </Select>
          </Field>
          <Field label="Name">
            <Input name="name" required minLength={2} maxLength={60} />
          </Field>
          <Field label="Ability (races)" hint="Strength, Dexterity, Constitution, Intelligence, Wisdom or Charisma">
            <Input name="ability" defaultValue="Strength" />
          </Field>
          <Field label="Increase (races)">
            <Input name="amount" type="number" min={0} max={2} defaultValue={2} />
          </Field>
          <Field label="Speed in feet (races)">
            <Input name="speed" type="number" min={15} max={60} defaultValue={30} />
          </Field>
          <Field label="Skills (backgrounds)" hint="comma separated, for example Athletics, Intimidation">
            <Input name="skills" />
          </Field>
          <Field label="Prerequisite (feats)">
            <Input name="prerequisite" />
          </Field>
          <Field label="Description (feats)">
            <Input name="description" />
          </Field>
          <Field label="Cost (items)">
            <Input name="cost" placeholder="0 gp" />
          </Field>
          {added && <p role={added.ok ? "status" : "alert"} className={added.ok ? "text-sm text-emerald" : "text-sm text-danger"}>{added.ok ? "Saved." : added.error}</p>}
          <Button disabled={adding}>Save</Button>
        </form>
      </Card>
      <Card className="p-5">
        <form action={load} className="flex flex-col gap-3">
          <h2 className="eyebrow">Import JSON</h2>
          <p className="text-sm text-muted">A list of objects with kind, name and data. This is the same shape as the download.</p>
          <textarea name="json" required rows={8} className="rounded border border-border bg-shade/40 p-2 font-mono text-sm" aria-label="Homebrew JSON" />
          {imported && <p role={imported.ok ? "status" : "alert"} className={imported.ok ? "text-sm text-emerald" : "text-sm text-danger"}>{imported.ok ? "Imported." : imported.error}</p>}
          <Button disabled={loading} variant="secondary">Import</Button>
        </form>
      </Card>
    </div>
  );
}
