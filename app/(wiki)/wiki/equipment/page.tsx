import { GiBackpack } from "react-icons/gi";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { getEquipment } from "@/lib/content/gear";

export const dynamic = "force-dynamic";
export const metadata = { title: "Equipment" };

export default async function EquipmentPage() {
  const items = await getEquipment();
  // group by the nearest sub-heading, preserving book order
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.category ?? "Other";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return (
    <>
      <PageHeader eyebrow="The Tome" title="Equipment" subtitle="Armor, weapons, gear and the price of an adventure." icon={<GiBackpack />} />
      <div className="flex flex-col gap-8">
        {[...groups].map(([category, rows]) => (
          <section key={category}>
            <h2 className="eyebrow mb-3">{category}</h2>
            <Card flat className="overflow-x-auto p-0">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-shade/30 font-display text-xs uppercase tracking-[0.14em] text-gold">
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Cost</th>
                    <th className="px-4 py-2.5">Weight</th>
                    <th className="px-4 py-2.5">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.index} className="border-b border-borderSoft align-top even:bg-foreground/[0.02]">
                      <td className="px-4 py-2 text-foreground">{r.name}</td>
                      <td className="px-4 py-2 text-goldBright">{r.cost}</td>
                      <td className="px-4 py-2 text-muted">{r.weight ?? ""}</td>
                      <td className="px-4 py-2 text-foreground/80">
                        {[r.damage, r.armorClass && `AC ${r.armorClass}`, r.strengthRequired && `Str ${r.strengthRequired}`, r.stealthDisadvantage && "Stealth disadvantage", r.properties]
                          .filter(Boolean)
                          .join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        ))}
      </div>
    </>
  );
}
