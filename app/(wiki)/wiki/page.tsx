import Link from "next/link";
import { sectionIcon } from "@/app/components/icons";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { wikiSections } from "@/data/wikiSections";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "The Tome" };

export default async function WikiHome() {
  const [races, classes, backgrounds, feats, equipment, spells, conditions, creatures, rules] = await Promise.all([
    prisma.race.count(),
    prisma.class.count(),
    prisma.background.count(),
    prisma.feat.count(),
    prisma.equipmentItem.count(),
    prisma.spell.count(),
    prisma.condition.count(),
    prisma.creature.count({ where: { campaignId: null } }),
    prisma.ruleSection.count(),
  ]);
  const counts: Record<string, number | undefined> = { races, classes, backgrounds, feats, equipment, spells, conditions, creatures, rules };

  return (
    <>
      <PageHeader eyebrow="Rules reference" title="The Tome" subtitle="Everything the table argues about, one click away." />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {wikiSections.map((s) => {
          const Icon = sectionIcon(s.key);
          return (
            <Link key={s.key} href={s.href} className="block">
              <Card interactive className="flex h-full flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Icon className="h-9 w-9 text-gold" />
                  {counts[s.key] !== undefined && <span className="font-display text-2xl text-goldBright">{counts[s.key]}</span>}
                </div>
                <h2 className="font-display text-lg uppercase tracking-[0.12em]">{s.label}</h2>
                <p className="text-sm text-muted">{s.blurb}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
