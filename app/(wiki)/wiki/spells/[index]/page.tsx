import Link from "next/link";
import { notFound } from "next/navigation";
import ReusableTitle from "@/app/components/ReusableTitle";
import { Badge } from "@/app/components/ui/Badge";
import { getSpell, spellLevelLabel } from "@/lib/content/spells";

export const dynamic = "force-dynamic";

export default async function SpellPage({ params }: { params: Promise<{ index: string }> }) {
  const spell = await getSpell((await params).index);
  if (!spell) notFound();

  const stats: [string, string][] = [
    ["Casting time", spell.castingTime],
    ["Range", spell.range],
    ["Components", spell.components],
    ["Duration", spell.duration],
  ];

  return (
    <article className="flex max-w-3xl flex-col gap-4">
      <Link href="/wiki/spells" className="text-sm text-muted hover:underline">&larr; All spells</Link>
      <ReusableTitle title={spell.name} />
      <p className="italic text-muted">{spellLevelLabel(spell.level, spell.school)}</p>
      <div className="flex gap-2">
        {spell.concentration && <Badge>Concentration</Badge>}
        {spell.ritual && <Badge>Ritual</Badge>}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {stats.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-semibold">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="whitespace-pre-line">{spell.description}</p>
      {spell.higherLevels && (
        <p><strong>At Higher Levels.</strong> {spell.higherLevels}</p>
      )}
      <p className="text-sm text-muted">Classes: {spell.classes.join(", ")}</p>
    </article>
  );
}
