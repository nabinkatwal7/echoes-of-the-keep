import { Card } from "@/app/components/ui/Card";
import { DAMAGE_TYPES } from "@/engine/damage";
import { prisma } from "@/lib/prisma";

export default async function Language() {
  const languages = await prisma.language.findMany({ orderBy: [{ type: "desc" }, { name: "asc" }] });
  const groups = [
    ["Standard languages", languages.filter((l) => l.type === "Standard")],
    ["Exotic languages", languages.filter((l) => l.type === "Exotic")],
  ] as const;

  return (
    <>
      <section id="languages">
        <h2 className="eyebrow mb-4">Languages</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {groups.map(([title, rows]) => (
            <Card key={title} flat className="p-0">
              <table className="w-full text-left text-sm">
                <caption className="border-b border-border bg-shade/30 px-4 py-3 text-left font-display text-xs uppercase tracking-[0.14em] text-gold">{title}</caption>
                <tbody>
                  {rows.map((l) => (
                    <tr key={l.index} className="border-b border-borderSoft last:border-0">
                      <td className="px-4 py-2">{l.name}</td>
                      <td className="px-4 py-2 text-muted">{l.script} script</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      </section>

      <section id="damage-types">
        <h2 className="eyebrow mb-4">Damage types</h2>
        <div className="flex flex-wrap gap-2">
          {DAMAGE_TYPES.map((d) => (
            <span key={d} className="rounded-full border border-border px-4 py-1 font-display text-xs uppercase tracking-[0.14em] text-foreground/85">
              {d}
            </span>
          ))}
        </div>
      </section>
    </>
  );
}
