"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Field, Select } from "@/app/components/ui/Input";
import { startSoloGame } from "@/lib/solo/actions";

type Props = {
  atLimit: boolean;
  heroes: { id: string; name: string; summary: string }[];
  premade: { key: string; label: string; role: string }[];
};

const THEMES = [
  ["crypt", "The crypt: restless dead"],
  ["wilds", "The wilds: beasts and bad weather"],
  ["bandits", "The road: bandits and cultists"],
  ["caves", "The caves: goblins and worse"],
] as const;

/** Start a solo game: choose which seat you take, and the computer fills the rest. */
export function NewSoloForm({ atLimit, heroes, premade }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"player" | "dm">("player");
  const [bots, setBots] = useState(3);
  const [level, setLevel] = useState(1);
  const [theme, setTheme] = useState<(typeof THEMES)[number][0]>("crypt");
  const [hero, setHero] = useState<string>("premade:fighter");

  const setModeAndBots = (m: "player" | "dm") => {
    setMode(m);
    setBots(m === "player" ? 3 : 3);
  };

  const submit = () =>
    start(async () => {
      const [kind, value] = hero.split(":");
      const r = await startSoloGame({
        mode, bots, level, theme,
        heroId: mode === "player" && kind === "mine" ? value : undefined,
        heroKey: mode === "player" && kind === "premade" ? value : undefined,
      });
      if (r.ok) router.push(`/campaigns/${r.id}/solo`);
      else setError(r.errors[0]);
    });

  const botsMin = mode === "player" ? 1 : 2;
  const botsMax = mode === "player" ? 4 : 5;

  return (
    <Card className="flex h-fit flex-col gap-4 p-5">
      <h2 className="eyebrow">New solo game</h2>
      <fieldset className="flex flex-col gap-2">
        <legend className="rune-label mb-1">Where do you sit?</legend>
        <label className="flex cursor-pointer items-start gap-2 rounded border border-border p-3 has-[:checked]:border-gold">
          <input type="radio" name="mode" checked={mode === "player"} onChange={() => setModeAndBots("player")} className="mt-1" />
          <span><strong>Player.</strong> You play a hero. A computer Dungeon Master runs the story and computer companions fill your party.</span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 rounded border border-border p-3 has-[:checked]:border-gold">
          <input type="radio" name="mode" checked={mode === "dm"} onChange={() => setModeAndBots("dm")} className="mt-1" />
          <span><strong>Dungeon Master.</strong> You run the world and the monsters. Computer heroes play the party.</span>
        </label>
      </fieldset>

      {mode === "player" && (
        <Field label="Your hero">
          <Select value={hero} onChange={(e) => setHero(e.target.value)}>
            <optgroup label="Ready-made">{premade.map((p) => <option key={p.key} value={`premade:${p.key}`}>{p.label} ({p.role})</option>)}</optgroup>
            {heroes.length > 0 && <optgroup label="Your heroes (levels 1-5)">{heroes.map((h) => <option key={h.id} value={`mine:${h.id}`}>{h.name}, {h.summary}</option>)}</optgroup>}
          </Select>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Computer heroes" hint={`${botsMin}-${botsMax}`}>
          <Select value={bots} onChange={(e) => setBots(Number(e.target.value))}>
            {Array.from({ length: botsMax - botsMin + 1 }, (_, i) => botsMin + i).map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </Field>
        <Field label={mode === "player" ? "Level (ready-made)" : "Party level"}>
          <Select value={level} onChange={(e) => setLevel(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </Field>
      </div>

      <Field label="Adventure">
        <Select value={theme} onChange={(e) => setTheme(e.target.value as typeof theme)}>
          {THEMES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </Select>
      </Field>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {atLimit && <p className="text-sm text-muted">You have the most solo games allowed. Open one and delete it first.</p>}
      <Button disabled={pending || atLimit} onClick={submit}>{pending ? "Gathering the party…" : "Begin"}</Button>
    </Card>
  );
}
