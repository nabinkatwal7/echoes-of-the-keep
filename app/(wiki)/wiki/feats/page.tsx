import { GiAnvil } from "react-icons/gi";
import { SourceText } from "@/app/components/SourceText";
import { Badge } from "@/app/components/ui/Badge";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { getFeats } from "@/lib/content/reference";

export const dynamic = "force-dynamic";
export const metadata = { title: "Feats" };

export default async function FeatsPage() {
  const feats = await getFeats();
  return (
    <>
      <PageHeader eyebrow="The Tome" title="Feats" subtitle="Special talents that set a character apart." icon={<GiAnvil />} />
      <div className="grid gap-5 lg:grid-cols-2">
        {feats.map((f) => (
          <Card key={f.index} id={f.index} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg uppercase tracking-[0.12em] text-goldBright">{f.name}</h2>
              {f.prerequisite && <Badge tone="crimson">Requires {f.prerequisite}</Badge>}
            </div>
            <SourceText text={f.description.replace(/^Prerequisite:.*\n?/, "")} className="text-sm" />
          </Card>
        ))}
      </div>
    </>
  );
}
