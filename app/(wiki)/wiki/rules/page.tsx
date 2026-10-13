import Link from "next/link";
import { GiScrollUnfurled } from "react-icons/gi";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { RULE_CHAPTERS } from "@/content/build/ruleSections";
import { getRuleChapters } from "@/lib/content/rules";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rules" };

const BLURBS: Record<string, string> = {
  "using-ability-scores": "Ability checks, saving throws, advantage and proficiency.",
  adventuring: "Time, travel, the environment, social interaction and rest.",
  combat: "Initiative, actions, attacks, cover, damage and dying.",
  spellcasting: "Spell slots, components, concentration and areas of effect.",
  gods: "The pantheons of the multiverse.",
  planes: "The Material Plane and what lies beyond it.",
  "further-reading": "Books that inspired the game.",
};

export default async function RulesPage() {
  const chapters = await getRuleChapters();
  const order = RULE_CHAPTERS.map(([, slug]) => slug);
  chapters.sort((a, b) => order.indexOf(a.chapter) - order.indexOf(b.chapter));
  return (
    <>
      <PageHeader eyebrow="The Tome" title="Rules" subtitle="The rules of play, section by section." icon={<GiScrollUnfurled />} />
      <div className="grid gap-5 sm:grid-cols-2">
        {chapters.map((c) => (
          <Link key={c.chapter} href={`/wiki/rules/${c.chapter}`} className="block">
            <Card interactive className="flex h-full flex-col gap-2">
              <h2 className="font-display text-xl uppercase tracking-[0.1em]">{c.title}</h2>
              <p className="text-muted">{BLURBS[c.chapter]}</p>
              <p className="mt-auto text-xs text-gold">{c.sections} sections</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
