import Link from "next/link";
import { notFound } from "next/navigation";
import { Prose } from "@/app/components/Prose";
import { abilityModifier } from "@/engine/abilities";
import { getCreature } from "@/lib/content/gear";

export const dynamic = "force-dynamic";

const KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;

export async function generateMetadata({ params }: { params: Promise<{ index: string }> }) {
  const c = await getCreature((await params).index);
  return { title: c?.name ?? "Creature" };
}

export default async function CreaturePage({ params }: { params: Promise<{ index: string }> }) {
  const c = await getCreature((await params).index);
  if (!c) notFound();
  const abilities = c.abilities as Record<(typeof KEYS)[number], number> | null;
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
  const lines = c.text.split("\n");
  const body = lines.slice(lines.findIndex((l) => l.startsWith("Challenge")) + 1).join("\n");

  return (
    <article className="mx-auto max-w-2xl">
      <Link href="/wiki/creatures" className="eyebrow hover:text-goldBright">
        ← All creatures
      </Link>
      {/* classic stat block: parchment panel framed by crimson rules */}
      <div className="mt-4 rounded-sm bg-[#f1e6c8] px-6 py-5 text-[#2b1d12] shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <div className="border-y-[3px] border-[#8b1e1e] py-4">
          <h1 className="font-display text-3xl font-bold uppercase tracking-[0.06em] text-[#7a1520]">{c.name}</h1>
          <p className="mb-3 italic">
            {c.size} {c.type}, {c.alignment}
          </p>
          <div className="my-2 h-[3px] bg-gradient-to-r from-[#8b1e1e] via-[#c14a3a] to-transparent" />
          <dl className="flex flex-col gap-1 text-[#7a1520]">
            {facts.map(([k, v]) =>
              v ? (
                <div key={k}>
                  <dt className="inline font-bold">{k} </dt>
                  <dd className="inline text-[#2b1d12]">{v}</dd>
                </div>
              ) : null,
            )}
          </dl>
          {abilities && (
            <>
              <div className="my-3 h-[3px] bg-gradient-to-r from-[#8b1e1e] via-[#c14a3a] to-transparent" />
              <table className="w-full text-center text-[#7a1520]">
                <thead>
                  <tr>
                    {KEYS.map((k) => (
                      <th key={k} className="font-display text-sm">
                        {k.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-[#2b1d12]">
                    {KEYS.map((k) => {
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
            </>
          )}
          <div className="my-3 h-[3px] bg-gradient-to-r from-[#8b1e1e] via-[#c14a3a] to-transparent" />
          <Prose text={body} className="text-[#2b1d12]" />
        </div>
      </div>
    </article>
  );
}
