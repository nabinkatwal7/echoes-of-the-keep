import Link from "next/link";
import { notFound } from "next/navigation";
import { raceIcon } from "@/app/components/icons";
import { Prose } from "@/app/components/Prose";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { getRace } from "@/lib/content/reference";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ index: string }> }) {
  const r = await getRace((await params).index);
  return { title: r?.name ?? "Race" };
}

export default async function RacePage({ params }: { params: Promise<{ index: string }> }) {
  const r = await getRace((await params).index);
  if (!r) notFound();
  const Icon = raceIcon(r.index);
  const traits = r.traits as { name: string; description: string }[];
  return (
    <article>
      <Link href="/wiki/races" className="eyebrow hover:text-goldBright">
        ← All races
      </Link>
      <div className="mt-4">
        <PageHeader eyebrow="Race" title={r.name} icon={<Icon />} />
      </div>
      {r.text && (
        <Card flat className="mb-8">
          <Prose text={r.text} />
        </Card>
      )}
      <h2 className="eyebrow mb-3">Racial traits</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {traits.map((t, i) => (
          <Card key={i} className="flex flex-col gap-2">
            <h3 className="font-display uppercase tracking-[0.12em] text-goldBright">{t.name}</h3>
            <p className="text-foreground/85">{t.description}</p>
          </Card>
        ))}
      </div>
    </article>
  );
}
