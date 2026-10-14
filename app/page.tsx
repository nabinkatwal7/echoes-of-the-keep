import Link from "next/link";
import { GiCastle, GiCrossedSwords, GiSpellBook } from "react-icons/gi";
import { SceneBanner } from "./components/pixel/Avatars";
import { Tableau } from "./components/pixel/Tableau";
import { schoolStyle } from "./components/icons";
import { Badge } from "./components/ui/Badge";
import { Card } from "./components/ui/Card";
import { LinkButton } from "./components/ui/Button";
import { Ornament } from "./components/ui/Ornament";
import { getUser } from "@/lib/auth";
import { spellLevelLabel } from "@/lib/content/spells";
import { prisma } from "@/lib/prisma";
import { spellInSrd, srdOnly } from "@/lib/srd";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [user, spellCount, classCount, creatureCount, featCount] = await Promise.all([
    getUser(),
    prisma.spell.count({ where: { campaignId: null } }),
    prisma.class.count(),
    prisma.creature.count({ where: { campaignId: null } }),
    prisma.feat.count(),
  ]);

  // spell of the day: stable for a calendar day, and only a free-rules spell when that mode is on
  const day = Math.floor(Date.now() / 86_400_000);
  const pool = srdOnly()
    ? (await prisma.spell.findMany({ where: { campaignId: null }, orderBy: { index: "asc" } })).filter((s) => spellInSrd(s.name))
    : spellCount
      ? await prisma.spell.findMany({ where: { campaignId: null }, orderBy: { index: "asc" }, skip: day % spellCount, take: 1 })
      : [];
  const featured = srdOnly() ? pool[day % Math.max(pool.length, 1)] : pool[0];
  const school = featured ? schoolStyle(featured.school) : null;

  const pillars = [
    { icon: GiCrossedSwords, title: "Forge your hero", text: "Pick a race, class and background, roll or assign your scores, and watch the sheet fill itself in with every modifier explained.", href: "/characters/new", cta: "Create a character" },
    { icon: GiCastle, title: "Gather your party", text: "Run a campaign with a shared table: invite your friends, roll dice in the open or in secret, and keep one story going across sessions.", href: "/campaigns", cta: "Start a campaign" },
    { icon: GiSpellBook, title: "Consult the Tome", text: "Every spell, class, feat and creature indexed and searchable, so a rules question never stalls the game.", href: "/wiki", cta: "Open the Tome" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="grid grid-cols-1 items-center gap-10 py-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:py-20">
        <div className="flex flex-col items-start gap-6">
          <p className="eyebrow">The 5th Edition table, wherever your friends are</p>
          <h1 className="gilded text-5xl font-extrabold leading-[1.05] sm:text-6xl lg:text-7xl">
            Roll for
            <br />
            the story.
          </h1>
          <p className="max-w-xl text-xl text-foreground/85">
            Build heroes that follow the rules, run campaigns without the bookkeeping, and keep every spell, condition and stat block a click away.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {user ? (
              <>
                <LinkButton href="/characters">Your heroes</LinkButton>
                <LinkButton href="/campaigns" variant="secondary">Your campaigns</LinkButton>
              </>
            ) : (
              <>
                <LinkButton href="/register">Begin your adventure</LinkButton>
                <LinkButton href="/wiki" variant="secondary">Browse the Tome</LinkButton>
              </>
            )}
          </div>
          <dl className="mt-4 flex flex-wrap gap-8">
            {[
              [spellCount, "Spells"],
              [classCount, "Classes"],
              [featCount, "Feats"],
              [creatureCount, "Creatures"],
            ].map(([n, label]) => (
              <div key={label as string}>
                <dt className="rune-label">{label}</dt>
                <dd className="font-display text-3xl text-goldBright">{n}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="panel flex flex-col gap-4 p-4">
          <SceneBanner theme="tavern" seed={7} className="h-44 sm:h-52" />
          <Tableau />
        </div>
      </section>

      <Ornament className="my-6" />

      <section className="grid gap-6 py-10 md:grid-cols-3">
        {pillars.map((p) => (
          <Card key={p.title} interactive className="flex flex-col gap-4">
            <p.icon className="h-12 w-12 text-gold" />
            <h2 className="font-display text-xl uppercase tracking-[0.1em]">{p.title}</h2>
            <p className="flex-1 text-foreground/80">{p.text}</p>
            <Link href={p.href} className="font-display text-xs uppercase tracking-[0.18em] text-gold hover:text-goldBright">
              {p.cta} →
            </Link>
          </Card>
        ))}
      </section>

      {featured && school && (
        <section className="py-10">
          <p className="eyebrow mb-3 text-center">Spell of the day</p>
          <Link href={`/wiki/spells/${featured.index}`} className="mx-auto block max-w-3xl">
            <Card interactive className={`flex flex-col gap-3 ${school.glow}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className={`font-display text-2xl uppercase tracking-[0.1em] ${school.text}`}>{featured.name}</h3>
                <span className="italic text-muted">{spellLevelLabel(featured.level, featured.school)}</span>
              </div>
              {!srdOnly() && <p className="line-clamp-3 text-foreground/85">{featured.description}</p>}
              <div className="flex flex-wrap gap-2">
                {featured.concentration && <Badge tone="gold">Concentration</Badge>}
                {featured.ritual && <Badge tone="emerald">Ritual</Badge>}
                {featured.classes.map((c) => (
                  <Badge key={c}>{c}</Badge>
                ))}
              </div>
            </Card>
          </Link>
        </section>
      )}
    </div>
  );
}
