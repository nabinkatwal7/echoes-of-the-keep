import Link from "next/link";
import { GiCrossedSwords } from "react-icons/gi";
import { classIcon } from "@/app/components/icons";
import { Badge } from "@/app/components/ui/Badge";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { getClasses } from "@/lib/content/reference";

export const dynamic = "force-dynamic";
export const metadata = { title: "Classes" };

export default async function ClassesPage() {
  const classes = await getClasses();
  return (
    <>
      <PageHeader eyebrow="The Tome" title="Classes" subtitle="Twelve paths to power." icon={<GiCrossedSwords />} />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {classes.map((c) => {
          const Icon = classIcon(c.index);
          const p = c.proficiencies as Record<string, string | null>;
          return (
            <Link key={c.index} href={`/wiki/classes/${c.index}`} className="block">
              <Card interactive className="flex h-full flex-col gap-3">
                <div className="flex items-center gap-4">
                  <Icon className="h-14 w-14 shrink-0 text-gold" />
                  <div>
                    <h2 className="font-display text-xl uppercase tracking-[0.12em]">{c.name}</h2>
                    <p className="text-sm text-muted">Hit die d{c.hitDie}</p>
                  </div>
                </div>
                {p["Saving Throws"] && (
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    {p["Saving Throws"].split(/[,.]/).map((s) => s.trim()).filter(Boolean).map((s) => (
                      <Badge key={s} tone="gold">{s} save</Badge>
                    ))}
                  </div>
                )}
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
