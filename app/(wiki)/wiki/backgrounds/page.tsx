import Link from "next/link";
import { GiQuillInk } from "react-icons/gi";
import { Badge } from "@/app/components/ui/Badge";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { getBackgrounds } from "@/lib/content/reference";

export const dynamic = "force-dynamic";
export const metadata = { title: "Backgrounds" };

export default async function BackgroundsPage() {
  const backgrounds = await getBackgrounds();
  return (
    <>
      <PageHeader eyebrow="The Tome" title="Backgrounds" subtitle="Where your hero came from." icon={<GiQuillInk />} />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {backgrounds.map((b) => (
          <Link key={b.index} href={`/wiki/backgrounds/${b.index}`} className="block">
            <Card interactive className="flex h-full flex-col gap-3">
              <h2 className="font-display text-xl uppercase tracking-[0.12em]">{b.name}</h2>
              {b.featureName && <p className="text-sm italic text-muted">{b.featureName}</p>}
              <div className="mt-auto flex flex-wrap gap-1.5">
                {b.skillProficiencies?.split(",").map((s) => (
                  <Badge key={s} tone="gold">
                    {s.trim()}
                  </Badge>
                ))}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
