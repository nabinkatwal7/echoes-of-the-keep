import { Card } from "@/app/components/ui/Card";
import { getAlignments } from "@/lib/content/alignments";

const ORDER = ["lawful-good", "neutral-good", "chaotic-good", "lawful-neutral", "neutral", "chaotic-neutral", "lawful-evil", "neutral-evil", "chaotic-evil"];

const TONE: Record<string, string> = {
  good: "text-emerald",
  evil: "text-danger",
  neutral: "text-goldBright",
};

export default async function Alignment() {
  const alignments = await getAlignments();
  const sorted = [...alignments].sort((a, b) => ORDER.indexOf(a.index) - ORDER.indexOf(b.index));
  return (
    <section id="alignments">
      <h2 className="eyebrow mb-4">Alignments</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((a) => {
          const tone = a.index.includes("good") ? TONE.good : a.index.includes("evil") ? TONE.evil : TONE.neutral;
          return (
            <Card key={a.index} flat className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <h3 className={`font-display uppercase tracking-[0.12em] ${tone}`}>{a.name}</h3>
                <span className="font-display text-sm text-muted">{a.abbreviation}</span>
              </div>
              <p className="text-sm text-foreground/80">{a.description}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
