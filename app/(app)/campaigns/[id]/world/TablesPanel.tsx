"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Input, Textarea } from "@/app/components/ui/Input";
import { entriesToText, oddsOf, parseEntries, type TableEntry } from "@/engine/world/tables";
import { addStarterTables, deleteTable, rollOnTable, saveTable } from "@/lib/world/tableActions";

export type TableView = { id: string; name: string; entries: TableEntry[]; shared: boolean };

/** Random tables the DM rolls on. Shared tables can be rolled by players too. */
export function TablesPanel({ campaignId, isDm, tables }: { campaignId: string; isDm: boolean; tables: TableView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", text: "", shared: false });
  const [last, setLast] = useState<Record<string, string>>({});

  const run = (fn: () => Promise<{ ok: boolean; errors?: string[] }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setMessage(null);
        after?.();
        router.refresh();
      } else setMessage({ tone: "err", text: r.errors?.[0] ?? "That did not work" });
    });

  const roll = (t: TableView, secret: boolean) =>
    start(async () => {
      const r = await rollOnTable(campaignId, t.id, secret);
      if (r.ok) {
        setMessage(null);
        setLast((l) => ({ ...l, [t.id]: `${r.index}. ${r.text}${secret ? " (only you can see this)" : ""}` }));
        router.refresh();
      } else setMessage({ tone: "err", text: r.errors[0] });
    });

  const reset = () => {
    setEditing(null);
    setForm({ name: "", text: "", shared: false });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-3">
        {message && <p role="alert" className="rounded border border-crimson/60 bg-crimson/10 px-3 py-2 text-sm text-danger">{message.text}</p>}
        {tables.length === 0 && (
          <Card className="flex flex-col items-center gap-3 p-8 text-center text-muted">
            <p>{isDm ? "No tables yet. Start with the built-in ones, or write your own." : "The DM has not shared any tables."}</p>
            {isDm && <Button variant="secondary" disabled={pending} onClick={() => run(() => addStarterTables(campaignId))}>Add the starter tables</Button>}
          </Card>
        )}
        {tables.map((t) => {
          const odds = oddsOf(t.entries);
          return (
            <Card key={t.id} className="flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="flex-1 text-lg font-bold">{t.name}</h2>
                <Badge tone={t.shared ? "emerald" : "neutral"}>{t.shared ? "Players can roll" : "DM only"}</Badge>
              </div>
              <ol className="list-decimal pl-6 text-sm">
                {t.entries.map((e, i) => (
                  <li key={i}>
                    {e.text} <span className="text-muted">({odds[i]}%)</span>
                  </li>
                ))}
              </ol>
              {last[t.id] && <p role="status" className="rounded border border-gold/50 bg-gold/10 px-3 py-2 text-sm">{last[t.id]}</p>}
              <div className="flex flex-wrap gap-2">
                <Button className="min-h-9 px-3" disabled={pending} onClick={() => roll(t, false)}>Roll</Button>
                {isDm && <Button variant="secondary" className="min-h-9 px-3" disabled={pending} onClick={() => roll(t, true)}>Roll in secret</Button>}
                {isDm && (
                  <>
                    <Button variant="ghost" className="min-h-9 px-3" onClick={() => { setEditing(t.id); setForm({ name: t.name, text: entriesToText(t.entries), shared: t.shared }); }}>Edit</Button>
                    <Button variant="ghost" className="min-h-9 px-3" disabled={pending} onClick={() => confirm("Delete this table?") && run(() => deleteTable(campaignId, t.id))}>Delete</Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {isDm && (
        <Card className="flex h-fit flex-col gap-3 p-4">
          <h2 className="eyebrow">{editing ? "Edit table" : "New table"}</h2>
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Table name" maxLength={80} />
          <Textarea placeholder={"One entry per line.\nPut a number and a bar first to weight it:\n3 | Wolves on the road"} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={9} aria-label="Entries" />
          <p className="text-xs text-muted">{parseEntries(form.text).length} entries</p>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.shared} onChange={(e) => setForm({ ...form, shared: e.target.checked })} /> Players can roll on it</label>
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending || !form.name.trim()} onClick={() => run(() => saveTable(campaignId, { id: editing ?? undefined, name: form.name, entriesText: form.text, shared: form.shared }), reset)}>{editing ? "Save changes" : "Add table"}</Button>
            {editing && <Button variant="ghost" onClick={reset}>Cancel</Button>}
            {tables.length > 0 && <Button variant="secondary" disabled={pending} onClick={() => run(() => addStarterTables(campaignId))}>Add starter tables</Button>}
          </div>
        </Card>
      )}
    </div>
  );
}
