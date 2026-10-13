import Link from "next/link";
import { GiSpellBook } from "react-icons/gi";
import { schoolStyle } from "@/app/components/icons";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Input, Select } from "@/app/components/ui/Input";
import { PageHeader } from "@/app/components/ui/PageHeader";
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
    <>
      <PageHeader eyebrow="The Tome" title="Spells" subtitle={`${spells.length} incantations`} icon={<GiSpellBook />} />

      <Card flat className="mb-6">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto_auto_auto] lg:items-center">
          <Input name="q" defaultValue={p.q} placeholder="Search by name" aria-label="Search by name" />
          <Select name="level" defaultValue={p.level ?? ""} aria-label="Level">
            <option value="">Any level</option>
            <option value="0">Cantrip</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n}>
                Level {n}
              </option>
            ))}
          </Select>
          <Select name="class" defaultValue={p.class ?? ""} aria-label="Class">
            <option value="">Any class</option>
            {CLASSES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="ritual" defaultChecked={p.ritual === "on"} className="accent-[var(--gold)]" /> Ritual
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="concentration" defaultChecked={p.concentration === "on"} className="accent-[var(--gold)]" /> Concentration
          </label>
          <Button>Filter</Button>
        </form>
      </Card>

      {spells.length === 0 ? (
        <Card className="text-center text-muted">Nothing matched. Try a different name, level or class.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {spells.map((s) => {
            const school = schoolStyle(s.school);
            return (
              <Link key={s.index} href={`/wiki/spells/${s.index}`} className="block">
                <Card flat interactive className={`flex h-full flex-col gap-2 border-l-4 ${school.border}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className={`font-display text-base uppercase tracking-[0.08em] ${school.text}`}>{s.name}</h2>
                    <span className="font-display text-lg text-goldBright">{s.level === 0 ? "∘" : s.level}</span>
                  </div>
                  <p className="text-sm italic text-muted">{spellLevelLabel(s.level, s.school)}</p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                    {s.concentration && <Badge tone="gold">Conc.</Badge>}
                    {s.ritual && <Badge tone="emerald">Ritual</Badge>}
                    {s.classes.slice(0, 3).map((c) => (
                      <Badge key={c}>{c}</Badge>
                    ))}
                    {s.classes.length > 3 && <Badge>+{s.classes.length - 3}</Badge>}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
