import Link from "next/link";
import { notFound } from "next/navigation";
import ReusableTitle from "@/app/components/ReusableTitle";
import { Prose } from "@/app/components/Prose";
import { getBackground } from "@/lib/content/reference";

export const dynamic = "force-dynamic";

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
    <article className="flex max-w-3xl flex-col gap-4">
      <Link href="/wiki/backgrounds" className="text-sm text-muted hover:underline">
        &larr; All backgrounds
      </Link>
      <ReusableTitle title={b.name} />
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {facts.map(([k, v]) =>
          v ? (
            <div key={k} className="contents">
              <dt className="font-semibold">{k}</dt>
              <dd>{v}</dd>
            </div>
          ) : null,
        )}
      </dl>
      <Prose text={b.text} />
    </article>
  );
}
