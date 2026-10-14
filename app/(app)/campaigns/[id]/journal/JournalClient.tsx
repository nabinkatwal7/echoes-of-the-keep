"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Input, Select, Textarea } from "@/app/components/ui/Input";
import { createEntry, deleteEntry, setVisibility, togglePinned, updateEntry, type EntryKind } from "@/lib/journal/actions";

type Entry = {
  id: string;
  kind: EntryKind;
  title: string;
  body: string;
  imageUrl: string;
  visibility: "PRIVATE" | "PARTY";
  pinned: boolean;
  authorId: string;
  author: string;
  updatedAt: string;
};

const KIND_LABEL: Record<EntryKind, string> = { NOTE: "Note", HANDOUT: "Handout", RECAP: "Recap" };

export function JournalClient({ campaignId, isDm, userId, entries }: { campaignId: string; isDm: boolean; userId: string; entries: Entry[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | EntryKind>("ALL");
  const [kind, setKind] = useState<EntryKind>("NOTE");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", body: "" });

  const run = (fn: () => Promise<{ ok: boolean; errors?: string[] }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setError("");
        after?.();
        router.refresh();
      } else setError(r.errors?.[0] ?? "That did not work");
    });

  const shown = entries.filter((e) => filter === "ALL" || e.kind === filter);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2" role="tablist" aria-label="Entry type">
          {(["ALL", "NOTE", "HANDOUT", "RECAP"] as const).map((k) => (
            <Button key={k} role="tab" aria-selected={filter === k} variant={filter === k ? "primary" : "secondary"} className="px-3" onClick={() => setFilter(k)}>
              {k === "ALL" ? "All" : KIND_LABEL[k] + "s"}
            </Button>
          ))}
        </div>
        {error && <p role="alert" className="rounded border border-crimson/60 bg-crimson/10 px-3 py-2 text-sm text-danger">{error}</p>}
        {shown.length === 0 && <Card className="p-8 text-center text-muted">Nothing here yet.</Card>}
        {shown.map((e) => {
          const mine = e.authorId === userId;
          return (
            <Card key={e.id} className="flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="flex-1 text-lg font-bold">{e.pinned ? "📌 " : ""}{e.title}</h2>
                <Badge tone={e.kind === "NOTE" ? "neutral" : e.kind === "HANDOUT" ? "arcane" : "gold"}>{KIND_LABEL[e.kind]}</Badge>
                <Badge tone={e.visibility === "PARTY" ? "emerald" : "ember"}>{e.visibility === "PARTY" ? "Shared" : "Private"}</Badge>
              </div>
              {editing === e.id ? (
                <div className="flex flex-col gap-2">
                  <Input value={draft.title} onChange={(ev) => setDraft({ ...draft, title: ev.target.value })} aria-label="Title" maxLength={120} />
                  <Textarea value={draft.body} onChange={(ev) => setDraft({ ...draft, body: ev.target.value })} aria-label="Body" rows={8} />
                  <div className="flex gap-2">
                    <Button disabled={pending} onClick={() => run(() => updateEntry(e.id, draft), () => setEditing(null))}>Save</Button>
                    <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  {e.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.imageUrl} alt={`Handout: ${e.title}`} referrerPolicy="no-referrer" className="max-h-96 w-full rounded border border-border object-contain" />
                  )}
                <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed">{e.body || <span className="text-muted">(empty)</span>}</p>
                </>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>{e.author} · {new Date(e.updatedAt).toLocaleDateString()}</span>
                <span className="flex-1" />
                {(mine || isDm) && <Button variant="ghost" className="min-h-9 px-2" disabled={pending} onClick={() => run(() => togglePinned(e.id))}>{e.pinned ? "Unpin" : "Pin"}</Button>}
                {mine && editing !== e.id && <Button variant="ghost" className="min-h-9 px-2" onClick={() => { setEditing(e.id); setDraft({ title: e.title, body: e.body }); }}>Edit</Button>}
                {mine && (e.kind !== "NOTE" || isDm) && (
                  <Button variant="secondary" className="min-h-9 px-3" disabled={pending} onClick={() => run(() => setVisibility(e.id, e.visibility === "PARTY" ? "PRIVATE" : "PARTY"))}>
                    {e.visibility === "PARTY" ? "Unshare" : "Share with party"}
                  </Button>
                )}
                {(mine || (isDm && e.visibility === "PARTY")) && (
                  <Button variant="ghost" className="min-h-9 px-2" disabled={pending} onClick={() => { if (confirm("Delete this entry?")) run(() => deleteEntry(e.id)); }}>Delete</Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="flex h-fit flex-col gap-3 p-4">
        <h2 className="eyebrow">New entry</h2>
        <Select aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value as EntryKind)}>
          <option value="NOTE">Private note</option>
          {isDm && <option value="HANDOUT">Handout (draft until shared)</option>}
          {isDm && <option value="RECAP">Recap</option>}
        </Select>
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label="Title" />
        <Input type="url" placeholder="Image link (https, optional)" value={image} onChange={(e) => setImage(e.target.value)} aria-label="Image link" maxLength={500} />
        <Textarea placeholder="Write here…" value={body} onChange={(e) => setBody(e.target.value)} rows={8} aria-label="Body" />
        <Button disabled={pending || !title.trim()} onClick={() => run(() => createEntry(campaignId, { kind, title, body, imageUrl: image }), () => { setTitle(""); setBody(""); setImage(""); })}>Add to journal</Button>
      </Card>
    </div>
  );
}
