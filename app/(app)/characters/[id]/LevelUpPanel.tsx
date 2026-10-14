"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Field, Input, Select } from "@/app/components/ui/Input";
import { ABILITIES, type Ability } from "@/engine/abilities";
import { CLASS_RULES } from "@/engine/classes/rules";
import { subclassDueAt, subclassesFor } from "@/engine/classes/subclasses";
import { checkPrerequisites, type PrereqContext } from "@/engine/feats";
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
  prereq,
  subclassAllow,
  allowMulticlass = true,
  allowFeats = true,
}: {
  id: string;
  xp: number;
  classes: ClassLevel[];
  feats: { index: string; name: string; prerequisite: string | null }[];
  ownedFeats: string[];
  prereq: PrereqContext;
  subclassAllow?: readonly string[];
  allowMulticlass?: boolean;
  allowFeats?: boolean;
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
  const [subclass, setSubclass] = useState("");

  const level = totalLevel(classes);
  const xpReady = levelForXp(xp) > level;
  const nextAt = level < 20 ? XP_THRESHOLDS[level] : null;
  const due = improvementDue(classes, classIndex);
  const existing = classes.find((c) => c.classIndex === classIndex);
  const subclassDue = subclassDueAt(classIndex, (existing?.level ?? 0) + 1) && !existing?.subclassIndex;
  const progress = nextAt ? Math.min(100, Math.round(((xp - XP_THRESHOLDS[level - 1]) / (nextAt - XP_THRESHOLDS[level - 1])) * 100)) : 100;

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
    run(() => levelUpCharacter(id, { classIndex, improvement, subclassIndex: subclassDue ? subclass : undefined }, !xpReady));
  }

  return (
    <Card className="no-print flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg uppercase tracking-[0.12em] text-goldBright">Experience</h2>
        <p className="text-sm text-muted">
          Level {level} · {xp} XP{nextAt ? ` · next level at ${nextAt}` : " · maximum level"}
        </p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full border border-gold/40 bg-black/50" role="progressbar" aria-valuenow={progress} aria-valuemax={100} aria-label="Progress to next level">
        <div className="h-full bg-gradient-to-r from-[#8f6f2a] to-goldBright" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-36">
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="XP gained" aria-label="XP gained" />
        </div>
        <Button
          variant="secondary"
          disabled={pending || !amount}
          onClick={() =>
            run(() =>
              addExperience(id, Number(amount)).then((r) => {
                setAmount("");
                return r;
              }),
            )
          }
        >
          Add XP
        </Button>
        {level < 20 && <Button onClick={() => setOpen(!open)}>{xpReady ? "Level up" : "Level up (milestone)"}</Button>}
      </div>

      {open && (
        <div className="flex flex-col gap-4 border-t border-border/60 pt-4">
          <Field label="Class for the new level">
            <Select value={classIndex} onChange={(e) => setClassIndex(e.target.value)}>
              {Object.keys(CLASS_RULES).filter((c) => allowMulticlass || classes.some((x) => x.classIndex === c)).map((c) => (
                <option key={c} value={c}>
                  {titleCase(c)}
                  {classes.some((x) => x.classIndex === c) ? "" : " (multiclass)"}
                </option>
              ))}
            </Select>
          </Field>
          {subclassDue && (
            <Field label="Subclass">
              <Select value={subclass} onChange={(e) => setSubclass(e.target.value)}>
                <option value="">Choose a subclass</option>
                {subclassesFor(classIndex).filter((s) => !subclassAllow || subclassAllow.includes(s.index)).map((s) => (
                  <option key={s.index} value={s.index}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {due && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Button variant={kind === "asi" ? "primary" : "secondary"} onClick={() => setKind("asi")}>
                  Ability Score Improvement
                </Button>
                {allowFeats && (
                <Button variant={kind === "feat" ? "primary" : "secondary"} onClick={() => setKind("feat")}>
                  Feat
                </Button>
                )}
              </div>
              {kind === "asi" ? (
                <div className="flex flex-wrap items-center gap-2">
                  {ABILITIES.map((a) => (
                    <Button
                      key={a}
                      variant={picks.includes(a) ? "primary" : "secondary"}
                      onClick={() => setPicks((p) => (p.includes(a) ? p.filter((x) => x !== a) : p.length < 2 ? [...p, a] : p))}
                    >
                      {a.toUpperCase()}
                    </Button>
                  ))}
                  <span className="text-sm text-muted">One = +2, two = +1 each</span>
                </div>
              ) : (
                <Select value={feat} onChange={(e) => setFeat(e.target.value)} aria-label="Feat">
                  <option value="">Choose a feat</option>
                  {feats
                    .filter((f) => !ownedFeats.includes(f.index))
                    .map((f) => {
                      const check = checkPrerequisites(f.prerequisite, prereq);
                      return (
                        <option key={f.index} value={f.index} disabled={!check.met}>
                          {f.name}
                          {f.prerequisite ? ` (requires ${f.prerequisite.toLowerCase()})` : ""}
                        </option>
                      );
                    })}
                </Select>
              )}
            </div>
          )}
          <Button disabled={pending} onClick={levelUp}>
            {pending ? "Working…" : "Confirm level up"}
          </Button>
        </div>
      )}
      {errors.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-danger">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
