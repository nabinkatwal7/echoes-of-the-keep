import Link from "next/link";
import { Card } from "@/app/components/ui/Card";
import { requireUser } from "@/lib/auth";
import { listCharacters } from "@/lib/characters/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Characters" };

const titleCase = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default async function CharactersPage() {
  const user = await requireUser();
  const characters = await listCharacters(user.id);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your characters</h1>
        <Link href="/characters/new" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">
          New character
        </Link>
      </div>
      {characters.length === 0 ? (
        <p className="text-muted">No adventurers yet. Create your first one in a few minutes.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((c) => {
            const classes = c.classes as { classIndex: string; level: number }[];
            return (
              <Link key={c.id} href={`/characters/${c.id}`}>
                <Card className="hover:border-accent">
                  <h2 className="text-lg font-semibold">{c.name}</h2>
                  <p className="text-sm text-muted">
                    {titleCase(c.subraceIndex ?? c.raceIndex)} {classes.map((k) => `${titleCase(k.classIndex)} ${k.level}`).join(" / ")}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
