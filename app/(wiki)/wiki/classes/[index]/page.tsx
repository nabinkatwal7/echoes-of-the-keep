import Link from "next/link";
import { notFound } from "next/navigation";
import ReusableTitle from "@/app/components/ReusableTitle";
import { Prose } from "@/app/components/Prose";
import { getClass } from "@/lib/content/reference";

export const dynamic = "force-dynamic";

type Row = { level: number; proficiencyBonus: string; columns: string };

export default async function ClassPage({ params }: { params: Promise<{ index: string }> }) {
  const c = await getClass((await params).index);
  if (!c) notFound();
  const prof = c.proficiencies as Record<string, string | null>;
  const rows = c.levelTable as Row[];

  return (
    <article className="flex max-w-4xl flex-col gap-6">
      <Link href="/wiki/classes" className="text-sm text-muted hover:underline">
        &larr; All classes
      </Link>
      <ReusableTitle title={c.name} />
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="font-semibold">Hit die</dt>
        <dd>d{c.hitDie}</dd>
        {Object.entries(prof).map(([k, v]) =>
          v ? (
            <div key={k} className="contents">
              <dt className="font-semibold">{k}</dt>
              <dd>{v}</dd>
            </div>
          ) : null,
        )}
      </dl>
      <section>
        <h2 className="mb-2 text-xl font-semibold">Level table</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-1 pr-3">Level</th>
              <th className="pr-3">Prof.</th>
              <th>Features and columns</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.level} className="border-b border-border/50">
                <td className="py-1 pr-3">{r.level}</td>
                <td className="pr-3">{r.proficiencyBonus}</td>
                <td>{r.columns}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h2 className="mb-2 text-xl font-semibold">Description</h2>
        <Prose text={c.text} />
      </section>
    </article>
  );
}
