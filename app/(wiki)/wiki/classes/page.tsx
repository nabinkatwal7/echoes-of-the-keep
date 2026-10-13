import Link from "next/link";
import ReusableTitle from "@/app/components/ReusableTitle";
import { Card } from "@/app/components/ui/Card";
import { getClasses } from "@/lib/content/reference";

export const dynamic = "force-dynamic";
export const metadata = { title: "Classes" };

export default async function ClassesPage() {
  const classes = await getClasses();
  return (
    <div className="flex flex-col gap-6">
      <ReusableTitle title="Classes" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((c) => {
          const p = c.proficiencies as Record<string, string | null>;
          return (
            <Link key={c.index} href={`/wiki/classes/${c.index}`}>
              <Card className="h-full hover:border-accent">
                <h2 className="text-xl font-semibold">{c.name}</h2>
                <p className="text-sm text-muted">Hit die d{c.hitDie}</p>
                {p["Saving Throws"] && <p className="text-sm">Saves: {p["Saving Throws"]}</p>}
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
