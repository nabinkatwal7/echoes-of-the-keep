import Link from "next/link";
import { GiDragonHead } from "react-icons/gi";
import { Badge } from "@/app/components/ui/Badge";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { getCreatures } from "@/lib/content/gear";

export const dynamic = "force-dynamic";
export const metadata = { title: "Creatures" };

export default async function CreaturesPage() {
  const creatures = await getCreatures();
  return (
    <>
      <PageHeader eyebrow="The Tome" title="Creatures" subtitle="Beasts, familiars and things that bite." icon={<GiDragonHead />} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {creatures.map((c) => (
          <Link key={c.index} href={`/wiki/creatures/${c.index}`} className="block">
            <Card flat interactive className="flex h-full flex-col gap-2 border-l-4 border-l-crimson">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display uppercase tracking-[0.1em]">{c.name}</h2>
                {c.challenge && <Badge tone="crimson">CR {c.challenge.split(" ")[0]}</Badge>}
              </div>
              <p className="text-sm italic text-muted">
                {c.size} {c.type}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
