"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Input } from "@/app/components/ui/Input";
import { addExploreToken, moveExploreToken, removeExploreToken, setExploreGrid } from "@/lib/world/explore";
import type { ExploreMap as Map } from "@/lib/world/exploreMap";

/** Shared exploration map. The DM places tokens; everyone sees where they stand, including as a text list. */
export function ExploreMap({ campaignId, isDm, map }: { campaignId: string; isDm: boolean; map: Map }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string | null>(map.tokens[0]?.id ?? null);
  const [name, setName] = useState("");
  const [width, setWidth] = useState(String(map.width));
  const [height, setHeight] = useState(String(map.height));
  const [scale, setScale] = useState(String(map.scale));
  const [error, setError] = useState("");

  function run(fn: () => Promise<{ ok: boolean; errors?: string[] }>) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setError("");
        router.refresh();
      } else setError(r.errors?.[0] ?? "Could not update the map");
    });
  }

  const at = new Map(map.tokens.map((t) => [`${t.x},${t.y}`, t]));

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="eyebrow">Exploration map <span className="normal-case tracking-normal text-muted">({map.scale} ft squares)</span></h2>
      <div role="grid" aria-label="Exploration map" className="inline-grid gap-px bg-border" style={{ gridTemplateColumns: `repeat(${map.width}, 1.75rem)` }}>
        {Array.from({ length: map.width * map.height }, (_, i) => {
          const x = i % map.width;
          const y = Math.floor(i / map.width);
          const t = at.get(`${x},${y}`);
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              aria-label={t ? `${t.name}, ${x * map.scale} ft by ${y * map.scale} ft` : `Empty square ${x},${y}`}
              disabled={!isDm || pending}
              onClick={() => {
                if (t) setSelected(t.id);
                else if (selected) run(() => moveExploreToken(campaignId, selected, x, y));
              }}
              className={`flex h-7 w-7 items-center justify-center bg-surface text-[0.65rem] font-bold ${t ? "text-goldBright" : "text-transparent"} ${t && selected === t.id ? "outline outline-2 outline-goldBright" : ""}`}
            >
              {t ? t.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() : "·"}
            </button>
          );
        })}
      </div>
      <ul className="text-sm" aria-label="Who is on the map">
        {map.tokens.length === 0 && <li className="text-muted">No tokens yet.</li>}
        {map.tokens.map((t) => (
          <li key={t.id}>
            {t.name} is at {t.x * map.scale} ft east, {t.y * map.scale} ft south
            {isDm && (
              <button type="button" className="ml-2 text-gold underline" onClick={() => run(() => removeExploreToken(campaignId, t.id))}>
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
      {isDm && (
        <div className="flex flex-wrap items-end gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Token name" aria-label="Token name" className="w-40" />
          <Button variant="secondary" disabled={pending || !name.trim()} onClick={() => run(async () => { const r = await addExploreToken(campaignId, name); if (r.ok) setName(""); return r; })}>
            Add token
          </Button>
          <Input value={width} onChange={(e) => setWidth(e.target.value)} aria-label="Map width" className="w-16" />
          <Input value={height} onChange={(e) => setHeight(e.target.value)} aria-label="Map height" className="w-16" />
          <Input value={scale} onChange={(e) => setScale(e.target.value)} aria-label="Feet per square" className="w-16" />
          <Button variant="secondary" disabled={pending} onClick={() => run(() => setExploreGrid(campaignId, Number(width), Number(height), Number(scale)))}>
            Set grid
          </Button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </Card>
  );
}
