import { Compendium, type CreatureRow } from "./components/home/Compendium";
import { CombatHub } from "./components/home/CombatHub";
import { DiceLab } from "./components/home/DiceLab";
import { Grimoire, type SpellRow } from "./components/home/Grimoire";
import { LegalBadges } from "./components/home/LegalBadges";
import { Lorebook } from "./components/home/Lorebook";
import { RulesBar } from "./components/home/RulesBar";
import { Section } from "./components/home/Section";
import { SheetPreview } from "./components/home/SheetPreview";
import { Spotlight } from "./components/home/Spotlight";
import { Vault } from "./components/home/Vault";
import { Marquee } from "./components/motion/Marquee";
import { Reveal } from "./components/motion/Reveal";
import { CinematicHero } from "./components/pixel/CinematicHero";
import { HeroAvatar, SceneBanner } from "./components/pixel/Avatars";
import { LinkButton } from "./components/ui/Button";
import { HERO_CLASSES } from "@/engine/pixel/heroes";
import { getUser } from "@/lib/auth";
import { crLabel, crValue, parseAttacks } from "@/lib/content/attacks";
import { prisma } from "@/lib/prisma";
import { showCreature, showSpell, srdOnly } from "@/lib/srd";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [user, spellRows, creatureRows, campaignCount, heroCount] = await Promise.all([
    getUser(),
    prisma.spell.findMany({ where: { campaignId: null }, orderBy: [{ level: "asc" }, { name: "asc" }], select: { index: true, name: true, level: true, school: true, castingTime: true, components: true, ritual: true, concentration: true, source: true } }),
    prisma.creature.findMany({ where: { campaignId: null }, orderBy: { name: "asc" }, select: { index: true, name: true, type: true, size: true, challenge: true, armorClass: true, hitPoints: true, text: true } }),
    prisma.campaign.count(),
    prisma.character.count(),
  ]);

  const spells: SpellRow[] = spellRows.filter((s) => showSpell(s.name, s.source)).map((s) => ({ index: s.index, name: s.name, level: s.level, school: s.school, castingTime: s.castingTime, components: s.components, ritual: s.ritual, concentration: s.concentration }));
  const creatures: CreatureRow[] = creatureRows
    .filter((c) => showCreature(c.name))
    .map((c) => {
      const cr = crValue(c.challenge);
      return { index: c.index, name: c.name, type: c.type, size: c.size, cr, crText: crLabel(cr), ac: c.armorClass ?? "?", hp: c.hitPoints ?? "?", attacks: parseAttacks(c.text) };
    })
    .sort((a, b) => a.cr - b.cr || a.name.localeCompare(b.name));

  return (
    <div className="overflow-x-clip">
      <CinematicHero signedIn={!!user} stats={{ campaigns: campaignCount, heroes: heroCount, spells: spells.length }} />

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

      <Section id="search" icon="search" eyebrow="Spotlight search" title="Any rule, in a keystroke" blurb="Spells, creatures, items, conditions and rules, searched live. Press Ctrl K (or Cmd K) from any page to open it.">
        <Spotlight />
      </Section>

      <Section id="rules" icon="rules" tint="ember" eyebrow="At the table" title="The rules you keep forgetting" blurb="Concentration, exhaustion, cover and the action economy, one tap away.">
        <RulesBar />
      </Section>

      <Section id="dice" icon="dice" tint="arcane" eyebrow="Dice playground" title="Roll something" blurb="This tray runs the same dice engine as the game: formulas, keep-highest, modifiers, advantage and disadvantage.">
        <DiceLab />
      </Section>

      <Section id="sheet" icon="sheet" tint="emerald" eyebrow="Character architect" title="A sheet that does the maths" blurb="Slide the level and watch proficiency, saves and hit points follow the rules. Then level up.">
        <SheetPreview />
      </Section>

      <Section id="grimoire" icon="book" tint="arcane" eyebrow="The grimoire" title={`${spells.length} spells, filtered your way`} blurb="Narrow by school, level, casting time and components, then spend slots like a real caster.">
        <Grimoire spells={spells} />
      </Section>

      <Section id="bestiary" icon="eye" tint="ember" eyebrow="The bestiary" title={`${creatures.length} creatures, ready to fight`} blurb="Browse stat blocks by challenge rating and type, and roll their attacks before the fight starts.">
        <Compendium creatures={creatures} />
      </Section>

      <Section id="combat" icon="swords" tint="ember" eyebrow="Combat tracker" title="Initiative without the bookkeeping" blurb="Turn order, hit points and conditions that keep themselves tidy. This one plays itself; pause it and poke around.">
        <CombatHub />
      </Section>

      <Section id="world" icon="pin" tint="emerald" eyebrow="Worldbuilding" title="A world that remembers" blurb="People, factions, session logs and a map you can pin, kept with the campaign.">
        <Lorebook />
      </Section>

      <Section id="vault" icon="flask" eyebrow="Homebrew vault" title="Bring your own magic" blurb="Make subclasses, spells, items and monsters, and share them with your table.">
        <Vault />
      </Section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 border-t border-border/50 px-4 py-20 md:grid-cols-2">
        <Reveal>
          <div className="panel p-3">
            <SceneBanner theme="crypt" seed={5} className="h-56 sm:h-64" />
          </div>
        </Reveal>
        <Reveal delay={0.1} className="flex flex-col items-start gap-4">
          <p className="eyebrow">No party? No problem.</p>
          <h2 className="gilded text-3xl font-bold sm:text-4xl">Play alone, never lonely</h2>
          <p className="text-lg text-foreground/85">Take a seat as a hero and a computer Dungeon Master tells the story, plays the monsters and runs your companions. Or take the Dungeon Master&apos;s chair and let computer heroes fill the party.</p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/solo">Start a solo game</LinkButton>
            <LinkButton href={user ? "/characters/new" : "/register"} variant="secondary">{user ? "Forge a hero" : "Join the party"}</LinkButton>
          </div>
        </Reveal>
      </section>

      <Section id="legal" icon="seal" eyebrow="Rules and licence" title="Open about what is inside" blurb="Which edition this plays, which free reference it draws on, and what to credit.">
        <LegalBadges srdOnly={srdOnly()} counts={{ spells: spells.length, creatures: creatures.length }} />
      </Section>
    </div>
  );
}
