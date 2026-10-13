import Link from "next/link";
import { notFound } from "next/navigation";
import { classIcon } from "@/app/components/icons";
import { Prose } from "@/app/components/Prose";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { getClass } from "@/lib/content/reference";

export const dynamic = "force-dynamic";

type Row = { level: number; proficiencyBonus: string; columns: string };

const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 10 > 3 || [11, 12, 13].includes(n % 100) ? 0 : n % 10]}`;

export async function generateMetadata({ params }: { params: Promise<{ index: string }> }) {
  const c = await getClass((await params).index);
  return { title: c?.name ?? "Class" };
}

export default async function ClassPage({ params }: { params: Promise<{ index: string }> }) {
  const c = await getClass((await params).index);
  if (!c) notFound();
  const Icon = classIcon(c.index);
  const prof = c.proficiencies as Record<string, string | null>;
  const rows = c.levelTable as Row[];
  const facts: [string, string][] = [
    ["Hit die", `d${c.hitDie}`],
    ...(Object.entries(prof).filter(([, v]) => v) as [string, string][]),
  ];

  return (
    <article>
      <Link href="/wiki/classes" className="eyebrow hover:text-goldBright">
        ← All classes
      </Link>
      <div className="mt-4">
        <PageHeader eyebrow="Class" title={c.name} icon={<Icon />} />
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map(([k, v]) => (
          <Card key={k} flat className="p-4">
            <p className="rune-label">{k}</p>
            <p className="text-foreground">{v}</p>
          </Card>
        ))}
      </div>

      <section className="mb-10">
        <h2 className="eyebrow mb-3">Advancement</h2>
        <Card flat className="overflow-x-auto p-0">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-black/30 font-display text-xs uppercase tracking-[0.14em] text-gold">
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Prof.</th>
                <th className="px-4 py-3">Features</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.level} className="border-b border-borderSoft even:bg-white/[0.02]">
                  <td className="px-4 py-2 font-display text-goldBright">{ordinal(r.level)}</td>
                  <td className="px-4 py-2">{r.proficiencyBonus}</td>
                  <td className="px-4 py-2 text-foreground/85">{r.columns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section>
        <h2 className="eyebrow mb-3">The {c.name}</h2>
        <Card className="p-7">
          <Prose text={c.text} />
        </Card>
      </section>
    </article>
  );
}
