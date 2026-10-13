"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Input } from "@/app/components/ui/Input";
import { ABILITIES, abilityModifier, type Ability, type AbilityScores, type Skill } from "@/engine/abilities";
import {
  POINT_BUY_BUDGET,
  POINT_BUY_COSTS,
  STANDARD_ARRAY,
  pointBuyCost,
  rollAbilityScores,
} from "@/engine/abilities/generation";
import { CLASS_RULES, skillOptions } from "@/engine/classes/rules";
import { deriveCharacter, explain } from "@/engine/character";
import { createCharacter } from "@/lib/characters/actions";
import { buildCharacter, type AbilityMethod, type BuildContent } from "@/lib/characters/build";
import { parseAbilityIncrease } from "@/lib/rules/race";

type Traits = { name: string; description: string }[];
export type WizardData = {
  races: { index: string; name: string; traits: Traits; subraces: { index: string; name: string; traits: Traits }[] }[];
  backgrounds: { index: string; name: string; skillProficiencies: string | null; skills: Skill[] }[];
  alignments: { index: string; name: string }[];
};

const STEPS = ["Race", "Class", "Abilities", "Background", "Skills", "Details", "Review"] as const;
const titleCase = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const blank = (): Record<Ability, number> => ({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });
const unassigned = (): Record<Ability, number> => ({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });

export function CreatorWizard({ data }: { data: WizardData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState(0);
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const [raceIndex, setRaceIndex] = useState("");
  const [subraceIndex, setSubraceIndex] = useState("");
  const [flexible, setFlexible] = useState<Ability[]>([]);
  const [classIndex, setClassIndex] = useState("");
  const [method, setMethod] = useState<AbilityMethod>("standard");
  const [scores, setScores] = useState<AbilityScores>(unassigned());
  const [rolled, setRolled] = useState<number[]>([]);
  const [backgroundIndex, setBackgroundIndex] = useState("");
  const [classSkills, setClassSkills] = useState<Skill[]>([]);
  const [name, setName] = useState("");
  const [alignment, setAlignment] = useState("");
  const [traits, setTraits] = useState("");
  const [backstory, setBackstory] = useState("");

  const race = data.races.find((r) => r.index === raceIndex);
  const subrace = race?.subraces.find((s) => s.index === subraceIndex);
  const background = data.backgrounds.find((b) => b.index === backgroundIndex);
  const raceAsi = parseAbilityIncrease(race?.traits.find((t) => t.name === "Ability Score Increase")?.description ?? "");

  const content: BuildContent | null =
    race && background
      ? {
          race: { index: race.index, traits: race.traits },
          subrace: subrace ? { index: subrace.index, traits: subrace.traits } : undefined,
          background: { index: background.index, skillProficiencies: background.skillProficiencies },
        }
      : null;

  const choices = {
    name,
    raceIndex,
    subraceIndex: subraceIndex || undefined,
    classIndex,
    backgroundIndex,
    alignment: alignment || undefined,
    abilityMethod: method,
    scores,
    rolled: method === "roll" ? rolled : undefined,
    flexibleBonuses: flexible,
    classSkills,
    personality: { traits, backstory },
  };

  const built = content && classIndex ? buildCharacter(choices, content) : null;
  const preview = built?.ok
    ? deriveCharacter({
        classes: built.character.classes,
        baseScores: built.character.baseScores,
        scoreBonuses: built.character.scoreBonuses,
        speed: built.character.speed,
        skillProficiencies: built.character.skillProficiencies,
        saveProficiencies: [...CLASS_RULES[classIndex].saves],
      })
    : null;

  function chooseMethod(m: AbilityMethod) {
    setMethod(m);
    setRolled([]);
    setScores(m === "pointbuy" ? blank() : unassigned());
  }

  const pool = method === "standard" ? [...STANDARD_ARRAY] : rolled;
  const usedValues = ABILITIES.map((a) => scores[a]).filter(Boolean);
  const available = (current: number) => {
    const rest = [...pool];
    for (const v of usedValues) {
      const i = rest.indexOf(v);
      if (i >= 0) rest.splice(i, 1);
    }
    return current ? [current, ...rest] : rest;
  };

  const stepReady = [
    !!race && (race.subraces.length === 0 || !!subrace) && (!raceAsi.choose || flexible.length === raceAsi.choose.count),
    !!classIndex,
    method === "pointbuy" ? pointBuyCost(scores) <= POINT_BUY_BUDGET : ABILITIES.every((a) => scores[a] > 0),
    !!background,
    !!classIndex && classSkills.length === CLASS_RULES[classIndex].skillChoices.count,
    name.trim().length > 0,
    !!built?.ok,
  ];

  function submit() {
    start(async () => {
      const result = await createCharacter(choices);
      if (result.ok) router.push(`/characters/${result.id}`);
      else setServerErrors(result.errors);
    });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold">New character</h1>
      <ol className="flex flex-wrap gap-2 text-sm">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              onClick={() => setStep(i)}
              disabled={i > step && !stepReady.slice(0, i).every(Boolean)}
              className={`rounded-full border px-3 py-1 disabled:opacity-40 ${i === step ? "border-accent bg-accent text-white" : "border-border"}`}
            >
              {i + 1}. {s}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="flex flex-col gap-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {data.races.map((r) => (
              <button
                key={r.index}
                onClick={() => { setRaceIndex(r.index); setSubraceIndex(""); setFlexible([]); }}
                className={`rounded-lg border p-3 text-left ${raceIndex === r.index ? "border-accent bg-surface" : "border-border"}`}
              >
                {r.name}
              </button>
            ))}
          </div>
          {race && race.subraces.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {race.subraces.map((s) => (
                <Button key={s.index} variant={subraceIndex === s.index ? "primary" : "secondary"} onClick={() => setSubraceIndex(s.index)}>
                  {s.name}
                </Button>
              ))}
            </div>
          )}
          {raceAsi.choose && (
            <Card>
              <p className="mb-2 text-sm">
                Choose {raceAsi.choose.count} abilities (not Charisma) to increase by {raceAsi.choose.amount}:
              </p>
              <div className="flex flex-wrap gap-2">
                {ABILITIES.filter((a) => !(a in raceAsi.fixed)).map((a) => (
                  <Button
                    key={a}
                    variant={flexible.includes(a) ? "primary" : "secondary"}
                    onClick={() =>
                      setFlexible((f) => (f.includes(a) ? f.filter((x) => x !== a) : f.length < raceAsi.choose!.count ? [...f, a] : f))
                    }
                  >
                    {a.toUpperCase()}
                  </Button>
                ))}
              </div>
            </Card>
          )}
        </section>
      )}

      {step === 1 && (
        <div className="grid gap-2 sm:grid-cols-3">
          {Object.entries(CLASS_RULES).map(([index, r]) => (
            <button
              key={index}
              onClick={() => { setClassIndex(index); setClassSkills([]); }}
              className={`rounded-lg border p-3 text-left ${classIndex === index ? "border-accent bg-surface" : "border-border"}`}
            >
              <div className="font-semibold">{titleCase(index)}</div>
              <div className="text-xs text-muted">d{r.hitDie} · saves {r.saves.join(", ").toUpperCase()}</div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-4">
          <div className="flex gap-2">
            {(["standard", "pointbuy", "roll"] as const).map((m) => (
              <Button key={m} variant={method === m ? "primary" : "secondary"} onClick={() => chooseMethod(m)}>
                {m === "standard" ? "Standard array" : m === "pointbuy" ? "Point buy" : "Roll 4d6"}
              </Button>
            ))}
          </div>
          {method === "roll" && rolled.length === 0 && (
            <Button onClick={() => setRolled(rollAbilityScores())}>Roll six scores</Button>
          )}
          {method === "roll" && rolled.length > 0 && <p className="text-sm">Rolled: {rolled.join(", ")}</p>}
          {method === "pointbuy" && (
            <p className="text-sm">
              Points left: {POINT_BUY_BUDGET - pointBuyCost(scores)} of {POINT_BUY_BUDGET}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ABILITIES.map((a) => {
              const bonus = (raceAsi.fixed[a] ?? 0) + (parseAbilityIncrease(subrace?.traits.find((t) => t.name === "Ability Score Increase")?.description ?? "").fixed[a] ?? 0) + (flexible.includes(a) ? raceAsi.choose?.amount ?? 0 : 0);
              return (
                <Card key={a} className="flex flex-col gap-2 text-center">
                  <div className="text-xs uppercase text-muted">{a}</div>
                  {method === "pointbuy" ? (
                    <div className="flex items-center justify-center gap-3">
                      <Button variant="secondary" disabled={scores[a] <= 8} onClick={() => setScores({ ...scores, [a]: scores[a] - 1 })}>−</Button>
                      <span className="text-xl font-bold">{scores[a]}</span>
                      <Button variant="secondary" disabled={scores[a] >= 15 || pointBuyCost({ ...scores, [a]: scores[a] + 1 }) > POINT_BUY_BUDGET} onClick={() => setScores({ ...scores, [a]: scores[a] + 1 })}>+</Button>
                    </div>
                  ) : (
                    <select
                      value={scores[a] || ""}
                      onChange={(e) => setScores({ ...scores, [a]: Number(e.target.value) })}
                      className="min-h-10 rounded-md border border-border bg-surface px-2"
                    >
                      <option value="">—</option>
                      {available(scores[a]).map((v, i) => (
                        <option key={`${v}-${i}`} value={v}>{v}</option>
                      ))}
                    </select>
                  )}
                  {scores[a] > 0 && (
                    <div className="text-sm text-muted">
                      {bonus ? `+${bonus} racial → ` : ""}
                      {scores[a] + bonus} ({signed(abilityModifier(scores[a] + bonus))})
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
          {method === "pointbuy" && (
            <p className="text-xs text-muted">Costs: {Object.entries(POINT_BUY_COSTS).map(([s, c]) => `${s}=${c}`).join(", ")}</p>
          )}
        </section>
      )}

      {step === 3 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {data.backgrounds.map((b) => (
            <button
              key={b.index}
              onClick={() => { setBackgroundIndex(b.index); setClassSkills([]); }}
              className={`rounded-lg border p-3 text-left ${backgroundIndex === b.index ? "border-accent bg-surface" : "border-border"}`}
            >
              <div className="font-semibold">{b.name}</div>
              <div className="text-xs text-muted">{b.skillProficiencies}</div>
            </button>
          ))}
        </div>
      )}

      {step === 4 && classIndex && (
        <section className="flex flex-col gap-3">
          <p className="text-sm">
            Choose {CLASS_RULES[classIndex].skillChoices.count} skills ({classSkills.length} chosen). Your background already gives{" "}
            {background?.skills.map(titleCase).join(" and ") || "none"}.
          </p>
          <div className="flex flex-wrap gap-2">
            {skillOptions(classIndex).map((s) => {
              const fromBackground = background?.skills.includes(s);
              const on = classSkills.includes(s);
              return (
                <Button
                  key={s}
                  variant={on ? "primary" : "secondary"}
                  disabled={fromBackground || (!on && classSkills.length >= CLASS_RULES[classIndex].skillChoices.count)}
                  onClick={() => setClassSkills((c) => (on ? c.filter((x) => x !== s) : [...c, s]))}
                >
                  {titleCase(s)}
                </Button>
              );
            })}
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Name
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Character name" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Alignment
            <select value={alignment} onChange={(e) => setAlignment(e.target.value)} className="min-h-10 rounded-md border border-border bg-surface px-2">
              <option value="">Unspecified</option>
              {data.alignments.map((a) => (
                <option key={a.index} value={a.index}>{a.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Personality traits
            <textarea value={traits} onChange={(e) => setTraits(e.target.value)} rows={2} className="rounded-md border border-border bg-surface px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Backstory
            <textarea value={backstory} onChange={(e) => setBackstory(e.target.value)} rows={4} className="rounded-md border border-border bg-surface px-3 py-2" />
          </label>
        </section>
      )}

      {step === 6 && (
        <section className="flex flex-col gap-4">
          {built && !built.ok && (
            <Card className="border-danger">
              <ul className="list-disc pl-5 text-sm text-danger">
                {built.errors.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </Card>
          )}
          {serverErrors.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-danger">{serverErrors.map((e) => <li key={e}>{e}</li>)}</ul>
          )}
          {preview && (
            <Card className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">{name} — {subrace?.name ?? race?.name} {titleCase(classIndex)}</h2>
              <p className="text-sm">HP {preview.maxHp} · AC {preview.armorClass.total} ({explain(preview.armorClass)}) · Speed {preview.speed} ft</p>
              <p className="text-sm">{ABILITIES.map((a) => `${a.toUpperCase()} ${preview.abilities[a].score} (${signed(preview.abilities[a].modifier)})`).join(" · ")}</p>
            </Card>
          )}
          <Button disabled={!built?.ok || pending} onClick={submit}>{pending ? "Creating…" : "Create character"}</Button>
        </section>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
        {step < STEPS.length - 1 && (
          <Button disabled={!stepReady[step]} onClick={() => setStep(step + 1)}>Next</Button>
        )}
      </div>
    </div>
  );
}
