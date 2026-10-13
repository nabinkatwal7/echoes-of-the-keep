import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/app/components/ui/Card";
import { ABILITIES, SKILLS, type Skill } from "@/engine/abilities";
import { explain } from "@/engine/character";
import { requireUser } from "@/lib/auth";
import { deleteCharacter } from "@/lib/characters/actions";
import { deriveStored } from "@/lib/characters/derive";
import { getOwnedCharacter } from "@/lib/characters/queries";
import { prisma } from "@/lib/prisma";
import { LevelUpPanel } from "./LevelUpPanel";

export const dynamic = "force-dynamic";

const titleCase = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export default async function CharacterSheet({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const c = await getOwnedCharacter((await params).id, user.id);
  if (!c) notFound();

  const d = deriveStored(c);
  const feats = await prisma.feat.findMany({ select: { index: true, name: true }, orderBy: { name: "asc" } });
  const classes = c.classes as { classIndex: string; level: number }[];
  const proficient = new Set(c.skillProficiencies as Skill[]);

  async function remove() {
    "use server";
    await deleteCharacter(c!.id);
    redirect("/characters");
  }

  return (
    <article className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link href="/characters" className="text-sm text-muted hover:underline">&larr; All characters</Link>
      <header>
        <h1 className="text-3xl font-bold">{c.name}</h1>
        <p className="text-muted">
          {titleCase(c.subraceIndex ?? c.raceIndex)} {classes.map((k) => `${titleCase(k.classIndex)} ${k.level}`).join(" / ")} ·{" "}
          {titleCase(c.backgroundIndex)}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Armor Class" value={d.armorClass.total} title={explain(d.armorClass)} />
        <Stat label="Hit Points" value={`${c.currentHp}/${d.maxHp}`} />
        <Stat label="Initiative" value={signed(d.initiative.total)} title={explain(d.initiative)} />
        <Stat label="Speed" value={`${d.speed} ft`} />
        <Stat label="Proficiency" value={signed(d.proficiencyBonus)} />
      </section>

      <section className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {ABILITIES.map((a) => (
          <Card key={a} className="text-center">
            <div className="text-xs uppercase text-muted">{a}</div>
            <div className="text-2xl font-bold">{signed(d.abilities[a].modifier)}</div>
            <div className="text-sm text-muted">{d.abilities[a].score}</div>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="mb-2 text-lg font-semibold">Saving throws</h2>
          <ul className="text-sm">
            {ABILITIES.map((a) => (
              <li key={a} title={explain(d.saves[a])} className="flex justify-between border-b border-border/50 py-1">
                <span>{a.toUpperCase()}</span>
                <span>{signed(d.saves[a].total)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold">Skills</h2>
          <ul className="text-sm">
            {(Object.keys(SKILLS) as Skill[]).map((s) => (
              <li key={s} title={explain(d.skills[s])} className="flex justify-between border-b border-border/50 py-1">
                <span>
                  {proficient.has(s) ? "● " : "○ "}
                  {titleCase(s)} <span className="text-muted">({SKILLS[s].toUpperCase()})</span>
                </span>
                <span>{signed(d.skills[s].total)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">Passive Perception {d.passivePerception}</p>
        </section>
      </div>

      <LevelUpPanel id={c.id} xp={c.xp} classes={classes} feats={feats} ownedFeats={c.feats as string[]} />

      <form action={remove}>
        <button className="text-sm text-danger underline">Delete character</button>
      </form>
    </article>
  );
}

function Stat({ label, value, title }: { label: string; value: string | number; title?: string }) {
  return (
    <Card className="text-center" >
      <div className="text-xs uppercase text-muted">{label}</div>
      <div className="text-2xl font-bold" title={title}>{value}</div>
    </Card>
  );
}
