"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Input } from "@/app/components/ui/Input";
import { ABILITIES, type Ability } from "@/engine/abilities";
import { CLASS_RULES } from "@/engine/classes/rules";
import { XP_THRESHOLDS, levelForXp, type ClassLevel } from "@/engine/progression";
import { addExperience, levelUpCharacter } from "@/lib/characters/actions";
import { improvementDue, totalLevel, type ImprovementChoice } from "@/lib/characters/levelup";

const titleCase = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function LevelUpPanel({
  id,
  xp,
  classes,
  feats,
  ownedFeats,
}: {
  id: string;
  xp: number;
  classes: ClassLevel[];
  feats: { index: string; name: string }[];
  ownedFeats: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);
  const [classIndex, setClassIndex] = useState(classes[0].classIndex);
  const [kind, setKind] = useState<"asi" | "feat">("asi");
  const [picks, setPicks] = useState<Ability[]>([]);
  const [feat, setFeat] = useState("");

  const level = totalLevel(classes);
  const xpReady = levelForXp(xp) > level;
  const nextAt = level < 20 ? XP_THRESHOLDS[level] : null;
  const due = improvementDue(classes, classIndex);

  function run(fn: () => Promise<{ ok: boolean; errors?: string[] }>) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setErrors([]);
        setOpen(false);
        router.refresh();
      } else setErrors(r.errors ?? []);
    });
  }

  function levelUp() {
    const improvement: ImprovementChoice | undefined = !due ? undefined : kind === "feat" ? { kind: "feat", feat } : { kind: "asi", abilities: picks };
    run(() => levelUpCharacter(id, { classIndex, improvement }, !xpReady));
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Experience and levels</h2>
      <p className="text-sm">
        Level {level} · {xp} XP{nextAt ? ` (next level at ${nextAt})` : " (maximum level)"}
      </p>
      <div className="flex gap-2">
        <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="XP gained" className="max-w-32" />
        <Button variant="secondary" disabled={pending || !amount} onClick={() => run(() => addExperience(id, Number(amount)).then((r) => { setAmount(""); return r; }))}>
          Add XP
        </Button>
        {level < 20 && (
          <Button onClick={() => setOpen(!open)}>{xpReady ? "Level up" : "Level up (milestone)"}</Button>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <label className="flex flex-col gap-1 text-sm">
            Class for the new level
            <select
              value={classIndex}
              onChange={(e) => setClassIndex(e.target.value)}
              className="min-h-10 rounded-md border border-border bg-surface px-2"
            >
              {Object.keys(CLASS_RULES).map((c) => (
                <option key={c} value={c}>
                  {titleCase(c)}
                  {classes.some((x) => x.classIndex === c) ? "" : " (multiclass)"}
                </option>
              ))}
            </select>
          </label>
          {due && (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex gap-2">
                <Button variant={kind === "asi" ? "primary" : "secondary"} onClick={() => setKind("asi")}>Ability Score Improvement</Button>
                <Button variant={kind === "feat" ? "primary" : "secondary"} onClick={() => setKind("feat")}>Feat</Button>
              </div>
              {kind === "asi" ? (
                <div className="flex flex-wrap gap-2">
                  {ABILITIES.map((a) => (
                    <Button
                      key={a}
                      variant={picks.includes(a) ? "primary" : "secondary"}
                      onClick={() => setPicks((p) => (p.includes(a) ? p.filter((x) => x !== a) : p.length < 2 ? [...p, a] : p))}
                    >
                      {a.toUpperCase()}
                    </Button>
                  ))}
                  <span className="self-center text-muted">One = +2, two = +1 each</span>
                </div>
              ) : (
                <select value={feat} onChange={(e) => setFeat(e.target.value)} className="min-h-10 rounded-md border border-border bg-surface px-2">
                  <option value="">Choose a feat</option>
                  {feats.filter((f) => !ownedFeats.includes(f.index)).map((f) => (
                    <option key={f.index} value={f.index}>{f.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}
          <Button disabled={pending} onClick={levelUp}>{pending ? "Working…" : "Confirm level up"}</Button>
        </div>
      )}
      {errors.length > 0 && <ul className="list-disc pl-5 text-sm text-danger">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
    </Card>
  );
}
