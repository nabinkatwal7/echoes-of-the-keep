"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { GiBackpack } from "react-icons/gi";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Field, Input, Select } from "@/app/components/ui/Input";
import { carryingCapacity } from "@/engine/exploration";
import type { Purse } from "@/engine/economy";
import type { InventoryItem } from "@/lib/characters/inventory";
import { totalWeight } from "@/lib/characters/inventory";
import { addCatalogItem, addCustomItem, sellItem, setCurrency, setItemEquipped, setItemQuantity } from "@/lib/characters/sheetActions";

export type CatalogEntry = { index: string; name: string; cost: string; category: string | null };

const COINS = ["pp", "gp", "ep", "sp", "cp"] as const;

export function InventoryPanel({ id, items, purse, catalog, strength }: { id: string; items: InventoryItem[]; purse: Purse; catalog: CatalogEntry[]; strength: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [pick, setPick] = useState("");
  const [qty, setQty] = useState("1");
  const [customName, setCustomName] = useState("");
  const [coins, setCoins] = useState<Purse>(purse);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q.length < 2 ? [] : catalog.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 25);
  }, [catalog, query]);

  function run(fn: () => Promise<{ ok: boolean; errors?: string[] }>, after?: () => void) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setError("");
        after?.();
        router.refresh();
      } else setError(r.errors?.[0] ?? "Something went wrong");
    });
  }

  const weight = totalWeight(items);
  const capacity = carryingCapacity(strength);

  return (
    <Card className="no-print flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg uppercase tracking-[0.12em] text-goldBright">
          <GiBackpack /> Inventory
        </h2>
        <Badge tone={weight > capacity ? "crimson" : "neutral"}>
          {weight.toFixed(1)} / {capacity} lb
        </Badge>
      </div>

      {items.length === 0 ? (
        <p className="text-muted">Nothing but the clothes on your back.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-borderSoft">
          {items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="font-medium">{i.name}</span>
                <span className="ml-2 text-xs text-muted">
                  {[i.damage, i.kind === "armor" && i.baseAc ? `AC ${i.baseAc}` : null, i.kind === "shield" ? "+2 AC" : null, i.weight ? `${i.weight} lb` : null].filter(Boolean).join(" · ")}
                </span>
              </span>
              {["weapon", "armor", "shield"].includes(i.kind) && (
                <Button variant={i.equipped ? "primary" : "secondary"} className="min-h-8 px-3 text-[0.65rem]" disabled={pending} onClick={() => run(() => setItemEquipped(id, i.id, !i.equipped))}>
                  {i.equipped ? "Equipped" : "Equip"}
                </Button>
              )}
              <div className="flex items-center gap-1">
                <Button variant="ghost" className="min-h-8 px-2" disabled={pending} onClick={() => run(() => setItemQuantity(id, i.id, i.quantity - 1))} aria-label={`One fewer ${i.name}`}>
                  −
                </Button>
                <span className="w-6 text-center">{i.quantity}</span>
                <Button variant="ghost" className="min-h-8 px-2" disabled={pending} onClick={() => run(() => setItemQuantity(id, i.id, i.quantity + 1))} aria-label={`One more ${i.name}`}>
                  +
                </Button>
              </div>
              {i.catalogIndex && (
                <Button variant="ghost" className="min-h-8 px-2 text-[0.65rem]" disabled={pending} onClick={() => run(() => sellItem(id, i.id))}>
                  Sell
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
        <h3 className="eyebrow">Add an item</h3>
        <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr_5rem]">
          <Input value={query} onChange={(e) => { setQuery(e.target.value); setPick(""); }} placeholder="Search the catalog (rope, longsword…)" aria-label="Search items" />
          <Select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Matching items">
            <option value="">{matches.length ? "Choose…" : "Type to search"}</option>
            {matches.map((m) => (
              <option key={m.index} value={m.index}>
                {m.name} ({m.cost})
              </option>
            ))}
          </Select>
          <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} aria-label="Quantity" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={pending || !pick} onClick={() => run(() => addCatalogItem(id, pick, Number(qty), "buy"), () => { setPick(""); setQuery(""); })}>
            Buy
          </Button>
          <Button variant="ghost" disabled={pending || !pick} onClick={() => run(() => addCatalogItem(id, pick, Number(qty), "free"), () => { setPick(""); setQuery(""); })}>
            Add for free (loot)
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            <Field label="Custom item">
              <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="A strange brass key" />
            </Field>
          </div>
          <Button variant="secondary" disabled={pending || !customName.trim()} onClick={() => run(() => addCustomItem(id, customName, Number(qty) || 1), () => setCustomName(""))}>
            Add
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
        <h3 className="eyebrow">Purse</h3>
        <div className="flex flex-wrap items-end gap-3">
          {COINS.map((c) => (
            <label key={c} className="flex w-20 flex-col gap-1">
              <span className="rune-label">{c}</span>
              <Input type="number" min={0} value={coins[c]} onChange={(e) => setCoins({ ...coins, [c]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
            </label>
          ))}
          <Button variant="secondary" disabled={pending} onClick={() => run(() => setCurrency(id, coins))}>
            Save coins
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </Card>
  );
}
