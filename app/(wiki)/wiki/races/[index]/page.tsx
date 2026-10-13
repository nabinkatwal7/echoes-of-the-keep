import Link from "next/link";
import { notFound } from "next/navigation";
import ReusableTitle from "@/app/components/ReusableTitle";
import { Prose } from "@/app/components/Prose";
import { getRace } from "@/lib/content/reference";

export const dynamic = "force-dynamic";

export default async function RacePage({ params }: { params: Promise<{ index: string }> }) {
  const r = await getRace((await params).index);
  if (!r) notFound();
  const traits = r.traits as { name: string; description: string }[];
  return (
    <article className="flex max-w-3xl flex-col gap-4">
      <Link href="/wiki/races" className="text-sm text-muted hover:underline">
        &larr; All races
      </Link>
      <ReusableTitle title={r.name} />
      {r.text && <Prose text={r.text} />}
      <h2 className="text-xl font-semibold">Traits</h2>
      <dl className="flex flex-col gap-2">
        {traits.map((t, i) => (
          <div key={i}>
            <dt className="font-semibold">{t.name}</dt>
            <dd>{t.description}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
