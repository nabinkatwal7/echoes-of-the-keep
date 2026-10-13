import Link from "next/link";
import { notFound } from "next/navigation";
import { GiScrollUnfurled } from "react-icons/gi";
import { Prose } from "@/app/components/Prose";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { getRuleSections } from "@/lib/content/rules";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ chapter: string }> }) {
  const sections = await getRuleSections((await params).chapter);
  return { title: sections[0]?.chapterTitle ?? "Rules" };
}

export default async function RuleChapterPage({ params }: { params: Promise<{ chapter: string }> }) {
  const sections = await getRuleSections((await params).chapter);
  if (sections.length === 0) notFound();

  return (
    <article>
      <Link href="/wiki/rules" className="eyebrow hover:text-goldBright">
        ← All rules
      </Link>
      <div className="mt-4">
        <PageHeader eyebrow="Rules" title={sections[0].chapterTitle} icon={<GiScrollUnfurled />} />
      </div>
      <div className="grid gap-8 xl:grid-cols-[14rem_1fr]">
        <nav aria-label="Sections" className="no-print xl:sticky xl:top-24 xl:h-fit">
          <Card flat className="p-3">
            <p className="eyebrow mb-2 px-2">In this chapter</p>
            <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto text-sm">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.slug}`} className="block rounded px-2 py-1 text-muted hover:bg-surface2 hover:text-goldBright">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </nav>
        <div className="flex flex-col gap-6">
          {sections.map((s) => (
            <Card key={s.id} id={s.slug} className="scroll-mt-24 p-6">
              <h2 className="mb-3 font-display text-xl uppercase tracking-[0.1em] text-goldBright">{s.title}</h2>
              <Prose text={s.body} />
            </Card>
          ))}
        </div>
      </div>
    </article>
  );
}
