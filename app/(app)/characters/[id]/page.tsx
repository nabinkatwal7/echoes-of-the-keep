import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GiHearts, GiRoundShield } from "react-icons/gi";
import { classIcon } from "@/app/components/icons";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Ornament } from "@/app/components/ui/Ornament";
import { ABILITIES, SKILLS, type Skill } from "@/engine/abilities";
import { explain } from "@/engine/character";
import { CLASS_RULES } from "@/engine/classes/rules";
import { requireUser } from "@/lib/auth";
import { deleteCharacter } from "@/lib/characters/actions";
import { deriveStored, prereqContext } from "@/lib/characters/derive";
import { getOwnedCharacter } from "@/lib/characters/queries";
import { prisma } from "@/lib/prisma";
import { LevelUpPanel } from "./LevelUpPanel";

export const dynamic = "force-dynamic";

const titleCase = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const FULL: Record<string, string> = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const c = await getOwnedCharacter((await params).id, user.id);
  return { title: c?.name ?? "Hero" };
}

export default async function CharacterSheet({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const c = await getOwnedCharacter((await params).id, user.id);
  if (!c) notFound();

  const d = deriveStored(c);
  const feats = await prisma.feat.findMany({ select: { index: true, name: true, prerequisite: true }, orderBy: { name: "asc" } });
  const classes = c.classes as { classIndex: string; level: number }[];
  const proficient = new Set(c.skillProficiencies as Skill[]);
  const saveProf = new Set(CLASS_RULES[classes[0].classIndex]?.saves ?? []);
  const Icon = classIcon(classes[0].classIndex);
  const hpPct = Math.max(0, Math.min(100, Math.round((c.currentHp / d.maxHp) * 100)));

  async function remove() {
    "use server";
    await deleteCharacter(c!.id);
    redirect("/characters");
  }

  return (
    <article className="flex flex-col gap-8">
      <Link href="/characters" className="eyebrow hover:text-goldBright">
        ← All heroes
      </Link>

      {/* header */}
      <header className="panel flex flex-wrap items-center gap-6 p-6">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-gold/70 bg-black/40 text-6xl text-gold shadow-[0_0_30px_rgba(201,162,75,0.25)]">
          <Icon />
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{titleCase(c.backgroundIndex)}</p>
          <h1 className="gilded text-4xl font-bold">{c.name}</h1>
          <p className="text-lg text-foreground/80">
            {titleCase(c.subraceIndex ?? c.raceIndex)} {classes.map((k) => `${titleCase(k.classIndex)} ${k.level}`).join(" / ")}
          </p>
          {c.alignment && <Badge tone="gold" className="mt-2">{titleCase(c.alignment)}</Badge>}
        </div>
        <div className="flex gap-3">
          <Vital icon={<GiRoundShield />} label="Armor Class" value={d.armorClass.total} title={explain(d.armorClass)} />
          <Vital icon={<GiHearts />} label="Hit Points" value={`${c.currentHp}/${d.maxHp}`} tone="crimson" />
        </div>
        <div className="basis-full">
          <div className="h-2 overflow-hidden rounded-full border border-crimson/60 bg-black/50" role="progressbar" aria-valuenow={c.currentHp} aria-valuemax={d.maxHp} aria-label="Hit points">
            <div className="h-full bg-gradient-to-r from-[#7a1b2a] to-[#d4566a]" style={{ width: `${hpPct}%` }} />
          </div>
        </div>
      </header>

      {/* quick stats */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Mini label="Initiative" value={signed(d.initiative.total)} title={explain(d.initiative)} />
        <Mini label="Speed" value={`${d.speed} ft`} />
        <Mini label="Proficiency" value={signed(d.proficiencyBonus)} />
        <Mini label="Passive Perception" value={d.passivePerception} />
      </section>

      {/* abilities */}
      <section>
        <h2 className="eyebrow mb-3">Abilities</h2>
        <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
          {ABILITIES.map((a) => (
            <Card key={a} className="flex flex-col items-center gap-1 px-2 py-4 text-center">
              <span className="rune-label">{FULL[a]}</span>
              <span className="font-display text-4xl text-goldBright">{signed(d.abilities[a].modifier)}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-black/40 font-display text-sm">{d.abilities[a].score}</span>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        {/* saves */}
        <section>
          <h2 className="eyebrow mb-3">Saving throws</h2>
          <Card flat className="p-2">
            <ul>
              {ABILITIES.map((a) => (
                <li key={a} title={explain(d.saves[a])} className="flex items-center gap-3 border-b border-borderSoft px-3 py-2 last:border-0">
                  <Pip on={saveProf.has(a)} />
                  <span className="flex-1">{FULL[a]}</span>
                  <span className="font-display text-goldBright">{signed(d.saves[a].total)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* skills */}
        <section>
          <h2 className="eyebrow mb-3">Skills</h2>
          <Card flat className="p-2">
            <ul className="grid sm:grid-cols-2 sm:gap-x-4">
              {(Object.keys(SKILLS) as Skill[]).map((s) => (
                <li key={s} title={explain(d.skills[s])} className="flex items-center gap-3 border-b border-borderSoft px-3 py-2">
                  <Pip on={proficient.has(s)} />
                  <span className="flex-1">
                    {titleCase(s)} <span className="text-xs text-muted">{SKILLS[s].toUpperCase()}</span>
                  </span>
                  <span className="font-display text-goldBright">{signed(d.skills[s].total)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </div>

      <Ornament />

      <LevelUpPanel id={c.id} xp={c.xp} classes={classes} feats={feats} ownedFeats={c.feats as string[]} prereq={prereqContext(c)} />

      <form action={remove} className="no-print">
        <Button variant="danger">Retire this hero</Button>
      </form>
    </article>
  );
}

function Pip({ on }: { on: boolean }) {
  return (
    <span
      aria-label={on ? "proficient" : "not proficient"}
      className={`h-3.5 w-3.5 shrink-0 rotate-45 border ${on ? "border-goldBright bg-gold shadow-[0_0_8px_rgba(239,205,111,0.6)]" : "border-border"}`}
    />
  );
}

function Vital({ icon, label, value, title, tone }: { icon: React.ReactNode; label: string; value: string | number; title?: string; tone?: "crimson" }) {
  return (
    <div
      title={title}
      className={`flex min-w-28 flex-col items-center gap-0.5 rounded border px-4 py-3 text-center ${tone === "crimson" ? "border-crimson/60 bg-crimson/10" : "border-gold/50 bg-gold/5"}`}
    >
      <span className={`text-2xl ${tone === "crimson" ? "text-danger" : "text-gold"}`}>{icon}</span>
      <span className="font-display text-3xl">{value}</span>
      <span className="rune-label">{label}</span>
    </div>
  );
}

function Mini({ label, value, title }: { label: string; value: string | number; title?: string }) {
  return (
    <Card flat className="flex flex-col items-center py-4 text-center" title={title}>
      <span className="font-display text-3xl text-goldBright">{value}</span>
      <span className="rune-label">{label}</span>
    </Card>
  );
}
