import Link from "next/link";
import ReusableTitle from "@/app/components/ReusableTitle";
import { getCreatures } from "@/lib/content/gear";

export const dynamic = "force-dynamic";
export const metadata = { title: "Creatures" };

export default async function CreaturesPage() {
  const creatures = await getCreatures();
  return (
    <div className="flex flex-col gap-6">
      <ReusableTitle title="Creatures" />
      <ul className="flex flex-col divide-y divide-border">
        {creatures.map((c) => (
          <li key={c.index} className="flex flex-wrap items-center gap-3 py-2">
            <Link href={`/wiki/creatures/${c.index}`} className="font-medium hover:underline">
              {c.name}
            </Link>
            <span className="text-sm text-muted">
              {c.size} {c.type}
            </span>
            {c.challenge && <span className="ml-auto text-xs text-muted">CR {c.challenge}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
