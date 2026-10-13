"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Input, Select, Textarea } from "@/app/components/ui/Input";
import { addStashItem, removeStashItem, takeFromStash } from "@/lib/world/playActions";
import { deleteWorldItem, saveLocation, saveNpc, saveQuest, setQuestStatus, setRevealed, setScene } from "@/lib/world/worldActions";

type Npc = { id: string; name: string; role: string; attitude: string; notes: string; revealed: boolean };
type Place = { id: string; name: string; description: string; imageUrl: string; revealed: boolean; current: boolean };
type Quest = { id: string; title: string; description: string; reward: string; status: string; revealed: boolean };
type Stash = { id: string; name: string; quantity: number; notes: string; valueGp: number };
type Props = { campaignId: string; isDm: boolean; npcs: Npc[]; places: Place[]; quests: Quest[]; stash: Stash[]; heroes: { id: string; name: string }[] };
type Tab = "npcs" | "places" | "quests" | "stash";
type Out = { ok: boolean; errors?: string[] };

const ATTITUDE_TONE = { friendly: "emerald", indifferent: "neutral", hostile: "crimson" } as const;

export function WorldClient(p: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("quests");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const run = (fn: () => Promise<Out>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setError("");
        after?.();
        router.refresh();
      } else setError(r.errors?.[0] ?? "That did not work");
    });

  const [f, setF] = useState({ name: "", a: "", b: "", c: "", qty: 1, value: 0 });
  const set = (patch: Partial<typeof f>) => setF({ ...f, ...patch });
  const clear = () => setF({ name: "", a: "", b: "", c: "", qty: 1, value: 0 });
  const [hero, setHero] = useState(p.heroes[0]?.id ?? "");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="World">
        {([["quests", "Quests"], ["npcs", "People"], ["places", "Places"], ["stash", "Party stash"]] as const).map(([k, label]) => (
          <Button key={k} role="tab" aria-selected={tab === k} variant={tab === k ? "primary" : "secondary"} className="px-4" onClick={() => { setTab(k); clear(); }}>{label}</Button>
        ))}
      </div>
      {error && <p role="alert" className="rounded border border-crimson/60 bg-crimson/10 px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-3">
          {tab === "quests" && (p.quests.length === 0 ? <Empty /> : p.quests.map((q) => (
            <Card key={q.id} className="flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="flex-1 text-lg font-bold">{q.title}</h2>
                <Badge tone={q.status === "DONE" ? "emerald" : q.status === "FAILED" ? "crimson" : "gold"}>{q.status.toLowerCase()}</Badge>
                {p.isDm && <Badge tone={q.revealed ? "emerald" : "ember"}>{q.revealed ? "Shown" : "Hidden"}</Badge>}
              </div>
              {q.description && <p className="whitespace-pre-wrap text-sm">{q.description}</p>}
              {q.reward && <p className="text-sm text-muted">Reward: {q.reward}</p>}
              {p.isDm && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" className="min-h-9 px-3" disabled={pending} onClick={() => run(() => setRevealed(p.campaignId, "quest", q.id, !q.revealed))}>{q.revealed ? "Hide" : "Reveal"}</Button>
                  {q.status !== "DONE" && <Button variant="secondary" className="min-h-9 px-3" disabled={pending} onClick={() => run(() => setQuestStatus(p.campaignId, q.id, "DONE"))}>Complete</Button>}
                  {q.status !== "FAILED" && <Button variant="ghost" className="min-h-9 px-3" disabled={pending} onClick={() => run(() => setQuestStatus(p.campaignId, q.id, "FAILED"))}>Fail</Button>}
                  {q.status !== "ACTIVE" && <Button variant="ghost" className="min-h-9 px-3" disabled={pending} onClick={() => run(() => setQuestStatus(p.campaignId, q.id, "ACTIVE"))}>Reopen</Button>}
                  <Button variant="ghost" className="min-h-9 px-3" disabled={pending} onClick={() => confirm("Delete this quest?") && run(() => deleteWorldItem(p.campaignId, "quest", q.id))}>Delete</Button>
                </div>
              )}
            </Card>
          )))}

          {tab === "npcs" && (p.npcs.length === 0 ? <Empty /> : p.npcs.map((n) => (
            <Card key={n.id} className="flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="flex-1 text-lg font-bold">{n.name}{n.role ? <span className="ml-2 text-sm font-normal text-muted">{n.role}</span> : null}</h2>
                <Badge tone={ATTITUDE_TONE[n.attitude as keyof typeof ATTITUDE_TONE] ?? "neutral"}>{n.attitude}</Badge>
                {p.isDm && <Badge tone={n.revealed ? "emerald" : "ember"}>{n.revealed ? "Shown" : "Hidden"}</Badge>}
              </div>
              {n.notes && <p className="whitespace-pre-wrap text-sm">{n.notes}</p>}
              {p.isDm && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" className="min-h-9 px-3" disabled={pending} onClick={() => run(() => setRevealed(p.campaignId, "npc", n.id, !n.revealed))}>{n.revealed ? "Hide" : "Reveal"}</Button>
                  <Select aria-label="Attitude" value={n.attitude} className="w-auto" onChange={(e) => run(() => saveNpc(p.campaignId, { id: n.id, name: n.name, role: n.role, notes: n.notes, attitude: e.target.value as "friendly" | "indifferent" | "hostile" }))}>
                    <option value="friendly">friendly</option><option value="indifferent">indifferent</option><option value="hostile">hostile</option>
                  </Select>
                  <Button variant="ghost" className="min-h-9 px-3" disabled={pending} onClick={() => confirm("Delete this NPC?") && run(() => deleteWorldItem(p.campaignId, "npc", n.id))}>Delete</Button>
                </div>
              )}
            </Card>
          )))}

          {tab === "places" && (p.places.length === 0 ? <Empty /> : p.places.map((l) => (
            <Card key={l.id} className="flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="flex-1 text-lg font-bold">{l.name}</h2>
                {l.current && <Badge tone="gold">Current scene</Badge>}
                {p.isDm && <Badge tone={l.revealed ? "emerald" : "ember"}>{l.revealed ? "Shown" : "Hidden"}</Badge>}
              </div>
              {l.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.imageUrl} alt={`Map or scene of ${l.name}`} referrerPolicy="no-referrer" className="max-h-80 w-full rounded border border-border object-contain" />
              )}
              {l.description && <p className="whitespace-pre-wrap text-sm">{l.description}</p>}
              {p.isDm && (
                <div className="flex flex-wrap gap-2">
                  <Button className="min-h-9 px-3" disabled={pending} onClick={() => run(() => setScene(p.campaignId, l.current ? null : l.id))}>{l.current ? "Clear scene" : "Show to table"}</Button>
                  <Button variant="secondary" className="min-h-9 px-3" disabled={pending} onClick={() => run(() => setRevealed(p.campaignId, "location", l.id, !l.revealed))}>{l.revealed ? "Hide" : "Reveal"}</Button>
                  <Button variant="ghost" className="min-h-9 px-3" disabled={pending} onClick={() => confirm("Delete this place?") && run(() => deleteWorldItem(p.campaignId, "location", l.id))}>Delete</Button>
                </div>
              )}
            </Card>
          )))}

          {tab === "stash" && (p.stash.length === 0 ? <Empty text="The party has found nothing yet." /> : (
            <Card className="flex flex-col gap-2 p-4">
              {p.stash.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-2 border-b border-border py-2 last:border-0">
                  <span className="flex-1"><strong>{s.quantity} × {s.name}</strong>{s.notes ? <span className="text-sm text-muted"> · {s.notes}</span> : null}{s.valueGp ? <span className="text-sm text-muted"> · {s.valueGp} gp each</span> : null}</span>
                  {p.heroes.length > 0 && <Button variant="secondary" className="min-h-9 px-3" disabled={pending || !hero} onClick={() => run(() => takeFromStash(p.campaignId, s.id, hero, 1))}>Take 1</Button>}
                  {p.isDm && <Button variant="ghost" className="min-h-9 px-2" disabled={pending} onClick={() => run(() => removeStashItem(p.campaignId, s.id))}>Remove</Button>}
                </div>
              ))}
              {p.heroes.length > 1 && (
                <Select aria-label="Take for" value={hero} onChange={(e) => setHero(e.target.value)}>
                  {p.heroes.map((h) => <option key={h.id} value={h.id}>Take for {h.name}</option>)}
                </Select>
              )}
            </Card>
          ))}
        </div>

        {p.isDm && (
          <Card className="flex h-fit flex-col gap-3 p-4">
            <h2 className="eyebrow">Add</h2>
            <Input placeholder={tab === "quests" ? "Quest title" : "Name"} value={f.name} onChange={(e) => set({ name: e.target.value })} aria-label="Name" maxLength={120} />
            {tab === "npcs" && <Input placeholder="Role (innkeeper, guard…)" value={f.a} onChange={(e) => set({ a: e.target.value })} aria-label="Role" />}
            {tab === "places" && <Input placeholder="Map image link (https, optional)" value={f.a} onChange={(e) => set({ a: e.target.value })} aria-label="Image link" />}
            {tab === "quests" && <Input placeholder="Reward (optional)" value={f.a} onChange={(e) => set({ a: e.target.value })} aria-label="Reward" />}
            {tab === "stash" ? (
              <>
                <div className="flex gap-2">
                  <Input type="number" min={1} value={f.qty} onChange={(e) => set({ qty: Number(e.target.value) })} aria-label="Quantity" className="w-24" />
                  <Input type="number" min={0} value={f.value} onChange={(e) => set({ value: Number(e.target.value) })} aria-label="Value in gp" placeholder="gp each" />
                </div>
                <Input placeholder="Notes (optional)" value={f.b} onChange={(e) => set({ b: e.target.value })} aria-label="Notes" />
                <Button disabled={pending || !f.name.trim()} onClick={() => run(() => addStashItem(p.campaignId, f.name, f.qty, f.b, f.value), clear)}>Add to stash</Button>
              </>
            ) : (
              <>
                <Textarea placeholder="Description or notes" value={f.b} onChange={(e) => set({ b: e.target.value })} rows={5} aria-label="Description" />
                <Button
                  disabled={pending || !f.name.trim()}
                  onClick={() =>
                    run(
                      () =>
                        tab === "npcs" ? saveNpc(p.campaignId, { name: f.name, role: f.a, notes: f.b })
                        : tab === "places" ? saveLocation(p.campaignId, { name: f.name, imageUrl: f.a, description: f.b })
                        : saveQuest(p.campaignId, { title: f.name, reward: f.a, description: f.b }),
                      clear,
                    )
                  }
                >
                  Add (hidden until revealed)
                </Button>
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function Empty({ text = "Nothing here yet." }: { text?: string }) {
  return <Card className="p-8 text-center text-muted">{text}</Card>;
}
