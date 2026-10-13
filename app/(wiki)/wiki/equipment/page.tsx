import ReusableTitle from "@/app/components/ReusableTitle";
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
    <div className="flex flex-col gap-8">
      <ReusableTitle title="Equipment" />
      {[...groups].map(([category, rows]) => (
        <section key={category}>
          <h2 className="mb-2 text-xl font-semibold">{category}</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-1 pr-3">Name</th>
                <th className="pr-3">Cost</th>
                <th className="pr-3">Weight</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.index} className="border-b border-border/50 align-top">
                  <td className="py-1 pr-3">{r.name}</td>
                  <td className="pr-3">{r.cost}</td>
                  <td className="pr-3">{r.weight ?? ""}</td>
                  <td>
                    {[r.damage, r.armorClass && `AC ${r.armorClass}`, r.strengthRequired && `Str ${r.strengthRequired}`, r.stealthDisadvantage && "Stealth disadvantage", r.properties]
                      .filter(Boolean)
                      .join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
