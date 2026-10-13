import Link from "next/link";
import ReusableTitle from "@/app/components/ReusableTitle";
import { getRaces } from "@/lib/content/reference";

export const dynamic = "force-dynamic";
export const metadata = { title: "Races" };

export default async function RacesPage() {
  const races = await getRaces();
  return (
    <div className="flex flex-col gap-6">
      <ReusableTitle title="Races" />
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {races.map((r) => (
          <li key={r.index}>
            <Link
              href={`/wiki/races/${r.index}`}
              className="block rounded-lg border border-border bg-surface p-3 hover:border-accent"
            >
              {r.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
