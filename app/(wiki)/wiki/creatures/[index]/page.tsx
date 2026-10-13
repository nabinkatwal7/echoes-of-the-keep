import Link from "next/link";
import { notFound } from "next/navigation";
import ReusableTitle from "@/app/components/ReusableTitle";
import { Prose } from "@/app/components/Prose";
import { abilityModifier } from "@/engine/abilities";
import { getCreature } from "@/lib/content/gear";

export const dynamic = "force-dynamic";

const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;

export default async function CreaturePage({ params }: { params: Promise<{ index: string }> }) {
  const c = await getCreature((await params).index);
  if (!c) notFound();
  const abilities = c.abilities as Record<(typeof ABILITY_KEYS)[number], number> | null;
  const facts: [string, string | null][] = [
    ["Armor Class", c.armorClass],
    ["Hit Points", c.hitPoints],
    ["Speed", c.speed],
    ["Saving Throws", c.savingThrows],
    ["Skills", c.skills],
    ["Senses", c.senses],
    ["Languages", c.languages],
    ["Challenge", c.challenge],
  ];
  // text after the Challenge line holds traits and actions
  const body = c.text.split("\n").slice(c.text.split("\n").findIndex((l) => l.startsWith("Challenge")) + 1).join("\n");

  return (
    <article className="flex max-w-2xl flex-col gap-4">
      <Link href="/wiki/creatures" className="text-sm text-muted hover:underline">
        &larr; All creatures
      </Link>
      <ReusableTitle title={c.name} />
      <p className="italic text-muted">
        {c.size} {c.type}, {c.alignment}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {facts.map(([k, v]) =>
          v ? (
            <div key={k} className="contents">
              <dt className="font-semibold">{k}</dt>
              <dd>{v}</dd>
            </div>
          ) : null,
        )}
      </dl>
      {abilities && (
        <table className="w-full text-center text-sm">
          <thead>
            <tr>
              {ABILITY_KEYS.map((k) => (
                <th key={k}>{k.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {ABILITY_KEYS.map((k) => {
                const m = abilityModifier(abilities[k]);
                return (
                  <td key={k}>
                    {abilities[k]} ({m >= 0 ? `+${m}` : m})
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      )}
      <Prose text={body} />
    </article>
  );
}
