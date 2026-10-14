import { GiSkullCrossedBones } from "react-icons/gi";
import { SourceText } from "@/app/components/SourceText";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { getConditions } from "@/lib/content/reference";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conditions" };

export default async function ConditionsPage() {
  const conditions = await getConditions();
  return (
    <>
      <PageHeader eyebrow="The Tome" title="Conditions" subtitle="What happens when things go wrong." icon={<GiSkullCrossedBones />} />
      <div className="grid gap-5 lg:grid-cols-2">
        {conditions.map((c) => (
          <Card key={c.index} id={c.index} className="flex flex-col gap-3">
            <h2 className="font-display text-lg uppercase tracking-[0.12em] text-danger">{c.name}</h2>
            <SourceText text={c.description} className="text-sm" />
          </Card>
        ))}
      </div>
    </>
  );
}
