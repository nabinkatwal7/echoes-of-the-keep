import Link from "next/link";
import ReusableTitle from "@/app/components/ReusableTitle";
import { Badge } from "@/app/components/ui/Badge";
import { getSpells, spellLevelLabel } from "@/lib/content/spells";

export const dynamic = "force-dynamic";
export const metadata = { title: "Spells" };

const CLASSES = ["Bard", "Cleric", "Druid", "Paladin", "Ranger", "Sorcerer", "Warlock", "Wizard"];

type Params = { level?: string; class?: string; q?: string; ritual?: string; concentration?: string };

export default async function SpellsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const level = p.level !== undefined && p.level !== "" ? Number(p.level) : undefined;
  const spells = await getSpells({
    level,
    className: p.class || undefined,
    q: p.q || undefined,
    ritual: p.ritual === "on",
    concentration: p.concentration === "on",
  });

  return (
    <div className="flex flex-col gap-6">
      <ReusableTitle title="Spells" />
      <form className="flex flex-wrap items-end gap-3 text-sm">
        <input name="q" defaultValue={p.q} placeholder="Search name" className="rounded-md border border-border bg-surface px-3 py-2" />
        <select name="level" defaultValue={p.level ?? ""} className="rounded-md border border-border bg-surface px-3 py-2">
          <option value="">Any level</option>
          <option value="0">Cantrip</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <option key={n} value={n}>Level {n}</option>
          ))}
        </select>
        <select name="class" defaultValue={p.class ?? ""} className="rounded-md border border-border bg-surface px-3 py-2">
          <option value="">Any class</option>
          {CLASSES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className="flex items-center gap-1"><input type="checkbox" name="ritual" defaultChecked={p.ritual === "on"} /> Ritual</label>
        <label className="flex items-center gap-1"><input type="checkbox" name="concentration" defaultChecked={p.concentration === "on"} /> Concentration</label>
        <button className="rounded-md bg-accent px-4 py-2 text-white">Filter</button>
      </form>
      <p className="text-sm text-muted">{spells.length} spells</p>
      <ul className="flex flex-col divide-y divide-border">
        {spells.map((s) => (
          <li key={s.index} className="flex flex-wrap items-center gap-2 py-2">
            <Link href={`/wiki/spells/${s.index}`} className="font-medium hover:underline">{s.name}</Link>
            <span className="text-sm text-muted">{spellLevelLabel(s.level, s.school)}</span>
            {s.concentration && <Badge>Concentration</Badge>}
            {s.ritual && <Badge>Ritual</Badge>}
            <span className="ml-auto text-xs text-muted">{s.classes.join(", ")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
