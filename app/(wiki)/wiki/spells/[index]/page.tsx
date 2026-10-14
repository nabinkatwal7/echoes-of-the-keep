import Link from "next/link";
import { notFound } from "next/navigation";
import { schoolStyle } from "@/app/components/icons";
import { SourceText } from "@/app/components/SourceText";
import { Badge } from "@/app/components/ui/Badge";
import { Card } from "@/app/components/ui/Card";
import { Ornament } from "@/app/components/ui/Ornament";
import { getSpell, spellLevelLabel } from "@/lib/content/spells";
import { srdOnly } from "@/lib/srd";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ index: string }> }) {
  const spell = await getSpell((await params).index);
  return { title: spell?.name ?? "Spell" };
}

export default async function SpellPage({ params }: { params: Promise<{ index: string }> }) {
  const spell = await getSpell((await params).index);
  if (!spell) notFound();
  const school = schoolStyle(spell.school);

  const stats: [string, string][] = [
    ["Casting time", spell.castingTime],
    ["Range", spell.range],
    ["Components", spell.components],
    ["Duration", spell.duration],
  ];

  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/wiki/spells" className="eyebrow hover:text-goldBright">
        ← All spells
      </Link>
      <Card className={`mt-4 flex flex-col gap-5 p-7 ${school.glow}`}>
        <header className="flex flex-col gap-2">
          <p className={`rune-label ${school.text}`}>{school.label}</p>
          <h1 className={`font-display text-3xl font-bold uppercase tracking-[0.08em] sm:text-4xl ${school.text}`}>{spell.name}</h1>
          <p className="italic text-muted">{spellLevelLabel(spell.level, spell.school)}</p>
          <div className="flex flex-wrap gap-2">
            {spell.concentration && <Badge tone="gold">Concentration</Badge>}
            {spell.ritual && <Badge tone="emerald">Ritual</Badge>}
          </div>
        </header>

        <Ornament />

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {stats.map(([k, v]) => (
            <div key={k}>
              <dt className="rune-label">{k}</dt>
              <dd className="text-lg text-foreground">{v}</dd>
            </div>
          ))}
        </dl>

        <Ornament />

        <SourceText text={spell.description} />

        {spell.higherLevels && !srdOnly() && (
          <div className="rounded border border-gold/40 bg-gold/5 p-4">
            <p className="rune-label mb-1 text-gold">At higher levels</p>
            <p>{spell.higherLevels}</p>
          </div>
        )}

        <footer className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          <span className="rune-label mr-2">Spell lists</span>
          {spell.classes.map((c) => (
            <Link key={c} href={`/wiki/spells?class=${c}`}>
              <Badge tone="gold">{c}</Badge>
            </Link>
          ))}
        </footer>
      </Card>
    </article>
  );
}
