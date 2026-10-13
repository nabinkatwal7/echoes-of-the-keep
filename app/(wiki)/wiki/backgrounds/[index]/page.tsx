import Link from "next/link";
import { notFound } from "next/navigation";
import { GiQuillInk } from "react-icons/gi";
import { Prose } from "@/app/components/Prose";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { getBackground } from "@/lib/content/reference";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ index: string }> }) {
  const b = await getBackground((await params).index);
  return { title: b?.name ?? "Background" };
}

export default async function BackgroundPage({ params }: { params: Promise<{ index: string }> }) {
  const b = await getBackground((await params).index);
  if (!b) notFound();
  const facts: [string, string | null][] = [
    ["Skill proficiencies", b.skillProficiencies],
    ["Tool proficiencies", b.toolProficiencies],
    ["Languages", b.languages],
    ["Equipment", b.equipment],
    ["Feature", b.featureName],
  ];
  return (
    <article className="max-w-3xl">
      <Link href="/wiki/backgrounds" className="eyebrow hover:text-goldBright">
        ← All backgrounds
      </Link>
      <div className="mt-4">
        <PageHeader eyebrow="Background" title={b.name} icon={<GiQuillInk />} />
      </div>
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {facts.map(([k, v]) =>
          v ? (
            <Card key={k} flat className="p-4">
              <p className="rune-label">{k}</p>
              <p>{v}</p>
            </Card>
          ) : null,
        )}
      </div>
      <Card className="p-7">
        <Prose text={b.text} />
      </Card>
    </article>
  );
}
