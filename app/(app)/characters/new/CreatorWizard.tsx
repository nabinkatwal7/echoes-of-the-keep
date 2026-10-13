"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { classIcon, raceIcon } from "@/app/components/icons";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/app/components/ui/Input";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { ABILITIES, SKILLS, abilityModifier, type Ability, type AbilityScores, type Skill } from "@/engine/abilities";
import { POINT_BUY_BUDGET, POINT_BUY_COSTS, STANDARD_ARRAY, pointBuyCost, rollAbilityScores } from "@/engine/abilities/generation";
import { deriveCharacter, explain } from "@/engine/character";
import { CLASS_RULES, skillOptions } from "@/engine/classes/rules";
import { createCharacter } from "@/lib/characters/actions";
import { buildCharacter, type AbilityMethod, type BuildContent } from "@/lib/characters/build";
import { OPTIONAL_SUBRACE, VARIANT_HUMAN, parseAbilityIncrease } from "@/lib/rules/race";
import { checkPrerequisites } from "@/engine/feats";
import { GiCrossedSwords } from "react-icons/gi";

type Traits = { name: string; description: string }[];
export type WizardData = {
  races: { index: string; name: string; traits: Traits; subraces: { index: string; name: string; traits: Traits }[] }[];
  backgrounds: { index: string; name: string; skillProficiencies: string | null; skills: Skill[] }[];
  alignments: { index: string; name: string }[];
  feats: { index: string; name: string; prerequisite: string | null }[];
};

const STEPS = ["Race", "Class", "Abilities", "Background", "Skills", "Details", "Review"] as const;
const titleCase = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const blank = (): Record<Ability, number> => ({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });
const unassigned = (): Record<Ability, number> => ({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });
const FULL: Record<Ability, string> = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" };

function Choice({ selected, onClick, children, disabled }: { selected: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`interactive-panel rounded border p-4 text-left transition disabled:opacity-40 ${
        selected ? "border-goldBright bg-gold/10 shadow-[0_0_22px_rgba(201,162,75,0.25)]" : "border-border bg-surface/70 hover:border-gold"
      }`}
    >
      {children}
    </button>
  );
}

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
  const [variantSkill, setVariantSkill] = useState<Skill | "">("");
  const [variantFeat, setVariantFeat] = useState("");
  const [name, setName] = useState("");
  const [alignment, setAlignment] = useState("");
  const [traits, setTraits] = useState("");
  const [backstory, setBackstory] = useState("");

  const race = data.races.find((r) => r.index === raceIndex);
  const subrace = race?.subraces.find((s) => s.index === subraceIndex);
  const background = data.backgrounds.find((b) => b.index === backgroundIndex);
  const asiText = (t?: Traits) => t?.find((x) => x.name === "Ability Score Increase")?.description ?? "";
  const raceAsi = parseAbilityIncrease(asiText(race?.traits));
  const subAsi = parseAbilityIncrease(asiText(subrace?.traits));
  const variant = subraceIndex === VARIANT_HUMAN;
  const chooseRule = variant ? subAsi.choose : raceAsi.choose;
  const fixedRaceKeys = variant ? [] : Object.keys(raceAsi.fixed);

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
    variantSkill: variant && variantSkill ? variantSkill : undefined,
    variantFeat: variant && variantFeat ? variantFeat : undefined,
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
    !!race && (race.subraces.length === 0 || !!subrace || OPTIONAL_SUBRACE.includes(race.index)) && (!chooseRule || flexible.length === chooseRule.count),
    !!classIndex,
    method === "pointbuy" ? pointBuyCost(scores) <= POINT_BUY_BUDGET : ABILITIES.every((a) => scores[a] > 0),
    !!background,
    !!classIndex && classSkills.length === CLASS_RULES[classIndex].skillChoices.count && (!variant || (!!variantSkill && !!variantFeat)),
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
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader eyebrow="The forge" title="Forge a hero" subtitle={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`} icon={<GiCrossedSwords />} />

      <ol className="flex flex-wrap gap-2" aria-label="Steps">
        {STEPS.map((s, i) => {
          const reachable = i <= step || stepReady.slice(0, i).every(Boolean);
          return (
            <li key={s}>
              <button
                onClick={() => setStep(i)}
                disabled={!reachable}
                aria-current={i === step ? "step" : undefined}
                className={`flex items-center gap-2 rounded-full border px-4 py-1.5 font-display text-[0.7rem] uppercase tracking-[0.14em] transition disabled:opacity-35 ${
                  i === step ? "border-goldBright bg-gold/15 text-goldBright" : i < step && stepReady[i] ? "border-gold/50 text-gold" : "border-border text-muted"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[0.65rem]">{i < step && stepReady[i] ? "✓" : i + 1}</span>
                {s}
              </button>
            </li>
          );
        })}
      </ol>

      <Card className="flex flex-col gap-6 p-6 sm:p-8">
        {step === 0 && (
          <section className="flex flex-col gap-5">
            <h2 className="eyebrow">Choose a race</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {data.races.map((r) => {
                const Icon = raceIcon(r.index);
                return (
                  <Choice key={r.index} selected={raceIndex === r.index} onClick={() => { setRaceIndex(r.index); setSubraceIndex(""); setFlexible([]); }}>
                    <Icon className="mb-2 h-8 w-8 text-gold" />
                    <div className="font-display uppercase tracking-[0.1em]">{r.name}</div>
                  </Choice>
                );
              })}
            </div>
            {race && race.subraces.length > 0 && (
              <div>
                <p className="rune-label mb-2">Subrace</p>
                <div className="flex flex-wrap gap-2">
                  {OPTIONAL_SUBRACE.includes(race.index) && (
                    <Button variant={!subraceIndex ? "primary" : "secondary"} onClick={() => { setSubraceIndex(""); setFlexible([]); }}>
                      Standard
                    </Button>
                  )}
                  {race.subraces.map((s) => (
                    <Button key={s.index} variant={subraceIndex === s.index ? "primary" : "secondary"} onClick={() => { setSubraceIndex(s.index); setFlexible([]); }}>
                      {s.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {chooseRule && (
              <div className="rounded border border-gold/40 bg-gold/5 p-4">
                <p className="mb-3 text-sm">
                  Choose {chooseRule.count} different abilities{fixedRaceKeys.length ? " (other than Charisma)" : ""} to increase by {chooseRule.amount}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {ABILITIES.filter((a) => !fixedRaceKeys.includes(a)).map((a) => (
                    <Button
                      key={a}
                      variant={flexible.includes(a) ? "primary" : "secondary"}
                      onClick={() => setFlexible((f) => (f.includes(a) ? f.filter((x) => x !== a) : f.length < chooseRule.count ? [...f, a] : f))}
                    >
                      {a.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {step === 1 && (
          <section className="flex flex-col gap-5">
            <h2 className="eyebrow">Choose a class</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.entries(CLASS_RULES).map(([index, r]) => {
                const Icon = classIcon(index);
                return (
                  <Choice key={index} selected={classIndex === index} onClick={() => { setClassIndex(index); setClassSkills([]); }}>
                    <Icon className="mb-2 h-9 w-9 text-gold" />
                    <div className="font-display uppercase tracking-[0.1em]">{titleCase(index)}</div>
                    <div className="mt-1 text-xs text-muted">
                      d{r.hitDie} · {r.saves.map((s) => s.toUpperCase()).join(" ")} saves
                      {r.spellcasting ? " · caster" : ""}
                    </div>
                  </Choice>
                );
              })}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="flex flex-col gap-5">
            <h2 className="eyebrow">Ability scores</h2>
            <div className="flex flex-wrap gap-2">
              {(["standard", "pointbuy", "roll"] as const).map((m) => (
                <Button key={m} variant={method === m ? "primary" : "secondary"} onClick={() => chooseMethod(m)}>
                  {m === "standard" ? "Standard array" : m === "pointbuy" ? "Point buy" : "Roll 4d6"}
                </Button>
              ))}
            </div>
            {method === "roll" && rolled.length === 0 && <Button onClick={() => setRolled(rollAbilityScores())}>Roll six scores</Button>}
            {method === "roll" && rolled.length > 0 && <p>Rolled (4d6, drop lowest): <strong className="font-display text-goldBright">{rolled.join(" · ")}</strong></p>}
            {method === "pointbuy" && (
              <p>
                Points left: <strong className="font-display text-goldBright">{POINT_BUY_BUDGET - pointBuyCost(scores)}</strong> of {POINT_BUY_BUDGET}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {ABILITIES.map((a) => {
                const bonus = (variant ? 0 : (raceAsi.fixed[a] ?? 0)) + (subAsi.fixed[a] ?? 0) + (flexible.includes(a) ? (chooseRule?.amount ?? 0) : 0);
                return (
                  <Card key={a} flat className="flex flex-col items-center gap-3 p-4 text-center">
                    <span className="rune-label">{FULL[a]}</span>
                    {method === "pointbuy" ? (
                      <div className="flex items-center gap-3">
                        <Button variant="secondary" className="min-h-9 w-9 px-0" disabled={scores[a] <= 8} onClick={() => setScores({ ...scores, [a]: scores[a] - 1 })} aria-label={`Lower ${FULL[a]}`}>
                          −
                        </Button>
                        <span className="w-8 font-display text-2xl">{scores[a]}</span>
                        <Button
                          variant="secondary"
                          className="min-h-9 w-9 px-0"
                          disabled={scores[a] >= 15 || pointBuyCost({ ...scores, [a]: scores[a] + 1 }) > POINT_BUY_BUDGET}
                          onClick={() => setScores({ ...scores, [a]: scores[a] + 1 })}
                          aria-label={`Raise ${FULL[a]}`}
                        >
                          +
                        </Button>
                      </div>
                    ) : (
                      <Select value={scores[a] || ""} onChange={(e) => setScores({ ...scores, [a]: Number(e.target.value) })} aria-label={FULL[a]} className="text-center">
                        <option value="">—</option>
                        {available(scores[a]).map((v, i) => (
                          <option key={`${v}-${i}`} value={v}>
                            {v}
                          </option>
                        ))}
                      </Select>
                    )}
                    {scores[a] > 0 && (
                      <div className="text-sm text-muted">
                        {bonus ? <span className="text-emerald">+{bonus} racial → </span> : null}
                        <span className="font-display text-base text-goldBright">{scores[a] + bonus}</span> ({signed(abilityModifier(scores[a] + bonus))})
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
            {method === "pointbuy" && <p className="text-xs text-muted">Costs: {Object.entries(POINT_BUY_COSTS).map(([s, c]) => `${s}=${c}`).join(", ")}</p>}
          </section>
        )}

        {step === 3 && (
          <section className="flex flex-col gap-5">
            <h2 className="eyebrow">Choose a background</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.backgrounds.map((b) => (
                <Choice key={b.index} selected={backgroundIndex === b.index} onClick={() => { setBackgroundIndex(b.index); setClassSkills([]); }}>
                  <div className="font-display uppercase tracking-[0.1em]">{b.name}</div>
                  <div className="mt-1 text-sm text-muted">{b.skillProficiencies}</div>
                </Choice>
              ))}
            </div>
          </section>
        )}

        {step === 4 && classIndex && (
          <section className="flex flex-col gap-5">
            <h2 className="eyebrow">Class skills</h2>
            <p>
              Choose <strong className="text-goldBright">{CLASS_RULES[classIndex].skillChoices.count}</strong> skills ({classSkills.length} chosen). Your background already gives{" "}
              <strong>{background?.skills.map(titleCase).join(" and ") || "no skills"}</strong>.
            </p>
            {variant && (
              <div className="grid gap-4 rounded border border-gold/40 bg-gold/5 p-4 sm:grid-cols-2">
                <Field label="Variant human skill">
                  <Select value={variantSkill} onChange={(e) => setVariantSkill(e.target.value as Skill)}>
                    <option value="">Choose a skill</option>
                    {(Object.keys(SKILLS) as Skill[])
                      .filter((s) => !background?.skills.includes(s) && !classSkills.includes(s))
                      .map((s) => (
                        <option key={s} value={s}>
                          {titleCase(s)}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Field label="Starting feat">
                  <Select value={variantFeat} onChange={(e) => setVariantFeat(e.target.value)}>
                    <option value="">Choose a feat</option>
                    {data.feats.map((f) => {
                      const ok = checkPrerequisites(f.prerequisite, {
                        scores: { ...blank(), ...scores },
                        armorProficiencies: CLASS_RULES[classIndex].armor as string[],
                        canCastSpells: !!CLASS_RULES[classIndex].spellcasting,
                      }).met;
                      return (
                        <option key={f.index} value={f.index} disabled={!ok}>
                          {f.name}
                          {f.prerequisite ? ` (requires ${f.prerequisite.toLowerCase()})` : ""}
                        </option>
                      );
                    })}
                  </Select>
                </Field>
              </div>
            )}
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
          <section className="flex flex-col gap-5">
            <h2 className="eyebrow">Who are they?</h2>
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Character name" />
            </Field>
            <Field label="Alignment">
              <Select value={alignment} onChange={(e) => setAlignment(e.target.value)}>
                <option value="">Unspecified</option>
                {data.alignments.map((a) => (
                  <option key={a.index} value={a.index}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Personality traits">
              <Textarea value={traits} onChange={(e) => setTraits(e.target.value)} rows={2} />
            </Field>
            <Field label="Backstory">
              <Textarea value={backstory} onChange={(e) => setBackstory(e.target.value)} rows={4} />
            </Field>
          </section>
        )}

        {step === 6 && (
          <section className="flex flex-col gap-5">
            <h2 className="eyebrow">Review</h2>
            {built && !built.ok && (
              <div className="rounded border border-crimson/60 bg-crimson/10 p-4">
                <ul className="list-disc pl-5 text-sm text-danger">
                  {built.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {serverErrors.length > 0 && (
              <ul className="list-disc pl-5 text-sm text-danger">
                {serverErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            {preview && (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="gilded text-3xl font-bold">{name}</h3>
                  <p className="text-foreground/80">
                    {subrace?.name ?? race?.name} {titleCase(classIndex)} · {background?.name}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Hit Points" value={preview.maxHp} />
                  <Stat label="Armor Class" value={preview.armorClass.total} />
                  <Stat label="Speed" value={`${preview.speed} ft`} />
                </div>
                <p className="text-xs text-muted">AC: {explain(preview.armorClass)}</p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {ABILITIES.map((a) => (
                    <div key={a} className="rounded border border-border bg-black/30 p-3 text-center">
                      <div className="rune-label">{a.toUpperCase()}</div>
                      <div className="font-display text-xl text-goldBright">{signed(preview.abilities[a].modifier)}</div>
                      <div className="text-xs text-muted">{preview.abilities[a].score}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {built?.ok && built.character.skillProficiencies.map((s) => <Badge key={s} tone="gold">{titleCase(s)}</Badge>)}
                </div>
              </div>
            )}
            <Button disabled={!built?.ok || pending} onClick={submit} className="self-start">
              {pending ? "Forging…" : "Create character"}
            </Button>
          </section>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
          ← Back
        </Button>
        {step < STEPS.length - 1 && (
          <Button disabled={!stepReady[step]} onClick={() => setStep(step + 1)}>
            Next →
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-gold/40 bg-gold/5 p-3 text-center">
      <div className="font-display text-2xl">{value}</div>
      <div className="rune-label">{label}</div>
    </div>
  );
}
