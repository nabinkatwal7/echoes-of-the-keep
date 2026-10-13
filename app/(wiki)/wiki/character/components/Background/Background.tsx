import Link from "next/link";
import { Card } from "@/app/components/ui/Card";
import { getBackgrounds } from "@/lib/content/reference";

export default async function Background() {
  const backgrounds = await getBackgrounds();
  return (
    <section id="backgrounds">
      <h2 className="eyebrow mb-2">Backgrounds</h2>
      <p className="mb-4 max-w-2xl text-foreground/80">
        Every story has a beginning. Your background reveals where you came from, how you became an adventurer, and your place in the world.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {backgrounds.map((b) => (
          <Link key={b.index} href={`/wiki/backgrounds/${b.index}`}>
            <Card flat interactive className="py-3">
              <span className="font-display uppercase tracking-[0.1em]">{b.name}</span>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
