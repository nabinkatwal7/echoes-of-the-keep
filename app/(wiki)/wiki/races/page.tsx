import Link from "next/link";
import { GiDwarfFace } from "react-icons/gi";
import { raceIcon } from "@/app/components/icons";
import { Badge } from "@/app/components/ui/Badge";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { getRaces } from "@/lib/content/reference";
import { parseAbilityIncrease, SUBRACES } from "@/lib/rules/race";

export const dynamic = "force-dynamic";
export const metadata = { title: "Races" };

const label = (fixed: Record<string, number | undefined>) =>
  Object.entries(fixed)
    .map(([a, n]) => `${a.toUpperCase()} +${n}`)
    .join(" ");

export default async function RacesPage() {
  const races = await getRaces();
  const subIndexes = new Set(Object.values(SUBRACES).flat());
  const bases = races.filter((r) => !subIndexes.has(r.index));
  const byIndex = new Map(races.map((r) => [r.index, r]));

  return (
    <>
      <PageHeader eyebrow="The Tome" title="Races" subtitle="The folk who walk the realms." icon={<GiDwarfFace />} />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {bases.map((r) => {
          const Icon = raceIcon(r.index);
          const asi = (r.traits as { name: string; description: string }[]).find((t) => t.name === "Ability Score Increase");
          const bonus = asi ? parseAbilityIncrease(asi.description) : { fixed: {} };
          return (
            <Card key={r.index} interactive className="flex h-full flex-col gap-3">
              <Link href={`/wiki/races/${r.index}`} className="flex items-center gap-4">
                <Icon className="h-12 w-12 shrink-0 text-gold" />
                <h2 className="font-display text-xl uppercase tracking-[0.12em]">{r.name}</h2>
              </Link>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(bonus.fixed).length > 0 && <Badge tone="gold">{label(bonus.fixed)}</Badge>}
                {"choose" in bonus && bonus.choose && <Badge tone="gold">+{bonus.choose.amount} to {bonus.choose.count} of your choice</Badge>}
              </div>
              {(SUBRACES[r.index] ?? []).length > 0 && (
                <div className="mt-auto flex flex-wrap gap-2 border-t border-border/60 pt-3 text-sm">
                  {SUBRACES[r.index].map((s) => (
                    <Link key={s} href={`/wiki/races/${s}`} className="text-muted underline-offset-4 hover:text-goldBright hover:underline">
                      {byIndex.get(s)?.name}
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
