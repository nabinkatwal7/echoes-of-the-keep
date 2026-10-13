import Link from "next/link";
import ReusableTitle from "@/app/components/ReusableTitle";
import { getBackgrounds } from "@/lib/content/reference";

export const dynamic = "force-dynamic";
export const metadata = { title: "Backgrounds" };

export default async function BackgroundsPage() {
  const backgrounds = await getBackgrounds();
  return (
    <div className="flex flex-col gap-6">
      <ReusableTitle title="Backgrounds" />
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {backgrounds.map((b) => (
          <li key={b.index}>
            <Link
              href={`/wiki/backgrounds/${b.index}`}
              className="block rounded-lg border border-border bg-surface p-3 hover:border-accent"
            >
              <span className="font-medium">{b.name}</span>
              {b.skillProficiencies && <span className="block text-sm text-muted">{b.skillProficiencies}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
