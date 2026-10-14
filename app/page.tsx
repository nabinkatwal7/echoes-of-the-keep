import Link from "next/link";
import { GiCastle, GiCrossedSwords, GiSpellBook } from "react-icons/gi";
import { schoolStyle } from "./components/icons";
import { CountUp } from "./components/motion/CountUp";
import { Marquee } from "./components/motion/Marquee";
import { MonsterHover } from "./components/motion/MonsterHover";
import { Reveal, Stagger, StaggerItem } from "./components/motion/Reveal";
import { HeroAvatar, MonsterAvatar, SceneBanner } from "./components/pixel/Avatars";
import { CinematicHero } from "./components/pixel/CinematicHero";
import { Badge } from "./components/ui/Badge";
import { Card } from "./components/ui/Card";
import { LinkButton } from "./components/ui/Button";
import { HERO_CLASSES } from "@/engine/pixel/heroes";
import { getUser } from "@/lib/auth";
import { spellLevelLabel } from "@/lib/content/spells";
import { prisma } from "@/lib/prisma";
import { spellInSrd, srdOnly } from "@/lib/srd";

export const dynamic = "force-dynamic";

const PILLARS = [
  { icon: GiCrossedSwords, title: "Forge your hero", text: "Pick a race, class and background, roll or assign your scores, and watch the sheet fill itself in with every modifier explained.", href: "/characters/new", cta: "Create a character" },
  { icon: GiCastle, title: "Gather your party", text: "Run a campaign with a shared table: invite your friends, roll dice in the open or in secret, and keep one story going across sessions.", href: "/campaigns", cta: "Start a campaign" },
  { icon: GiSpellBook, title: "Consult the Tome", text: "Every spell, class, feat and creature indexed and searchable, so a rules question never stalls the game.", href: "/wiki", cta: "Open the Tome" },
];

const STEPS = [
  ["1", "Forge", "Build a hero in a few guided minutes. Every number on the sheet explains itself."],
  ["2", "Gather", "Share a code with friends, or start a solo game and let computer companions fill the party."],
  ["3", "Descend", "Roll initiative, walk the battle map, cast spells and let the Keep remember it all."],
];

const BESTIARY = [
  ["beast", "Wolf"], ["undead", "Skeleton"], ["undead", "Ghost"], ["humanoid", "Goblin"], ["dragon", "Red Dragon"], ["ooze", "Gray Ooze"],
  ["beast", "Giant Spider"], ["fiend", "Imp"], ["giant", "Ogre"], ["construct", "Animated Armor"], ["elemental", "Fire Elemental"], ["fey", "Sprite"],
];

export default async function Home() {
  const [user, spellCount, classCount, creatureCount, featCount, campaignCount, heroCount] = await Promise.all([
    getUser(),
    prisma.spell.count({ where: { campaignId: null } }),
    prisma.class.count(),
    prisma.creature.count({ where: { campaignId: null } }),
    prisma.feat.count(),
    prisma.campaign.count(),
    prisma.character.count(),
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

  return (
    <div className="overflow-x-clip">
      <CinematicHero signedIn={!!user} stats={{ campaigns: campaignCount, heroes: heroCount, spells: spellCount }} />

      {/* parade of heroes */}
      <section className="border-y border-border/60 bg-shade/[0.04] py-8" aria-label="Twelve classes to play">
        <Marquee>
          {HERO_CLASSES.map((k) => (
            <div key={k} className="flex flex-col items-center gap-2">
              <HeroAvatar classIndex={k} name={`Parade ${k}`} size={88} />
              <span className="font-display text-xs uppercase tracking-[0.18em] text-muted">{k}</span>
            </div>
          ))}
        </Marquee>
      </section>

      {/* numbers */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Stagger className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            [spellCount, "Spells"],
            [classCount, "Classes"],
            [featCount, "Feats"],
            [creatureCount, "Creatures"],
          ].map(([n, label]) => (
            <StaggerItem key={label as string} className="panel-flat flex flex-col items-center gap-1 py-6 text-center">
              <span className="font-display text-5xl text-goldBright"><CountUp to={n as number} /></span>
              <span className="rune-label">{label}</span>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* pillars */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <Reveal><h2 className="gilded mb-8 text-center text-3xl font-bold sm:text-4xl">Everything a table needs</h2></Reveal>
        <Stagger className="grid gap-6 md:grid-cols-3">
          {PILLARS.map((p) => (
            <StaggerItem key={p.title} className="h-full">
              <Card interactive className="flex h-full flex-col gap-4">
                <p.icon className="h-12 w-12 text-gold" />
                <h3 className="font-display text-xl uppercase tracking-[0.1em]">{p.title}</h3>
                <p className="flex-1 text-foreground/80">{p.text}</p>
                <Link href={p.href} className="font-display text-xs uppercase tracking-[0.18em] text-gold hover:text-goldBright">
                  {p.cta} →
                </Link>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* how it goes */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Reveal><p className="eyebrow mb-6 text-center">How it goes</p></Reveal>
        <Stagger className="grid gap-8 md:grid-cols-3">
          {STEPS.map(([n, t, d]) => (
            <StaggerItem key={n} className="flex gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-gold bg-surface2 font-display text-2xl text-goldBright [clip-path:polygon(25%_0,75%_0,100%_50%,75%_100%,25%_100%,0_50%)]">{n}</span>
              <div>
                <h3 className="font-display text-lg uppercase tracking-[0.12em]">{t}</h3>
                <p className="text-foreground/80">{d}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* bestiary */}
      <section className="border-y border-border/60 bg-shade/[0.04] py-16">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">The bestiary</p>
              <h2 className="gilded text-3xl font-bold sm:text-4xl">{creatureCount} things that want you dead</h2>
            </div>
            <Link href="/wiki/creatures" className="font-display text-xs uppercase tracking-[0.18em] text-gold hover:text-goldBright">See them all →</Link>
          </Reveal>
          <Stagger className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {BESTIARY.map(([type, name]) => (
              <StaggerItem key={name}>
                <MonsterHover>
                  <MonsterAvatar type={type} name={name} size={84} />
                  <span className="text-center text-xs text-muted">{name}</span>
                </MonsterHover>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* solo */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2">
        <Reveal>
          <div className="panel p-3">
            <SceneBanner theme="crypt" seed={5} className="h-56 sm:h-64" />
          </div>
        </Reveal>
        <Reveal delay={0.1} className="flex flex-col items-start gap-4">
          <p className="eyebrow">No party? No problem.</p>
          <h2 className="gilded text-3xl font-bold sm:text-4xl">Play alone, never lonely</h2>
          <p className="text-lg text-foreground/85">Take a seat as a hero and a computer Dungeon Master tells the story, plays the monsters and runs your companions. Or take the Dungeon Master&apos;s chair and let computer heroes fill the party.</p>
          <LinkButton href="/solo">Start a solo game</LinkButton>
        </Reveal>
      </section>

      {featured && school && (
        <section className="mx-auto max-w-6xl px-4 pb-10">
          <Reveal>
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
          </Reveal>
        </section>
      )}

      {/* closing call */}
      <section className="mx-auto max-w-4xl px-4 pb-20 pt-10">
        <Reveal>
          <div className="panel flex flex-col items-center gap-5 px-6 py-12 text-center">
            <h2 className="gilded text-3xl font-bold sm:text-5xl">The Keep is waiting</h2>
            <p className="max-w-xl text-lg text-foreground/85">Forge a hero in minutes. The torches are lit.</p>
            <LinkButton href={user ? "/characters/new" : "/register"}>{user ? "Forge a hero" : "Join the party"}</LinkButton>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
