import Link from "next/link";
import { Card } from "../components/ui/Card";
import { LinkButton } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { Ornament } from "../components/ui/Ornament";
import { GiBookCover } from "react-icons/gi";
import { startTutorial } from "@/lib/tutorial";

export const metadata = { title: "Learn to play" };

const steps = [
  {
    title: "1. What happens at the table",
    body: [
      "One player is the Dungeon Master (DM). The DM describes the world: a damp cave, a suspicious innkeeper, a rope bridge over a gorge. Everyone else plays a hero and says what their hero does.",
      "When the outcome is uncertain, you roll a twenty-sided die (the d20), add a bonus from your character sheet and compare the total with a Difficulty Class (DC) the DM sets. Meet or beat it and you succeed.",
    ],
  },
  {
    title: "2. Your character sheet",
    body: [
      "Six ability scores (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma) describe what your hero is good at. Each score gives a modifier you add to rolls. Skills such as Stealth or Persuasion add your proficiency bonus when you are trained in them.",
      "Hit points (HP) are how much punishment you can take. Armor Class (AC) is how hard you are to hit. The sheet works these out for you and shows where every number comes from.",
    ],
  },
  {
    title: "3. A round of combat",
    body: [
      "Everyone rolls initiative (d20 + Dexterity modifier) and acts from highest to lowest. On your turn you can move up to your speed and take one action: attack, cast a spell, dash, dodge, help an ally, hide, and more.",
      "You may also use a bonus action if a feature gives you one, and one reaction per round (for example an opportunity attack when an enemy walks away). To attack, roll a d20 plus your attack bonus. If the total meets the target's AC, you hit and roll damage.",
    ],
  },
  {
    title: "4. Hit points, death and healing",
    body: [
      "At 0 hit points a hero falls unconscious and makes death saving throws at the start of each turn: three successes and they stabilize, three failures and they die. Any healing brings them back on their feet.",
      "A short rest (an hour) lets you spend Hit Dice to heal. A long rest (eight hours) restores all your hit points and many abilities.",
    ],
  },
  {
    title: "5. Spells",
    body: [
      "Spellcasters spend spell slots to cast leveled spells. Cantrips are free. Some spells need concentration: you can keep only one going at a time, and taking damage can break it (make a Constitution save).",
      "In a campaign, open the Combat page and pick a spell from your list: the app rolls attacks and saving throws, applies damage and tracks your slots.",
    ],
  },
  {
    title: "6. Running or joining a campaign",
    body: [
      "The DM creates a campaign and shares the invite code. Players join with the code and attach a hero. The Table is where chat and dice rolls appear for everyone; secret rolls and whispers are only shown to the people meant to see them.",
      "The DM screen shows the whole party at a glance, runs the clock and travel, calls for checks, hands out rewards and keeps NPCs, places and quests hidden until the party finds them.",
    ],
  },
];

export default function Learn() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <PageHeader eyebrow="New to the game?" title="Learn to play" subtitle="Six short steps from never having rolled a die to your first adventure." icon={<GiBookCover />} />
      <div className="flex flex-wrap gap-3">
        <LinkButton href="/characters/new">Create your first hero</LinkButton>
        <LinkButton variant="secondary" href="/campaigns">Find a campaign</LinkButton>
        <form action={startTutorial}>
          <button className="inline-flex min-h-11 items-center rounded border border-gold/50 px-4 font-display text-sm uppercase tracking-wider text-gold hover:text-goldBright" type="submit">
            Play the tutorial
          </button>
        </form>
      </div>
      <Ornament />
      {steps.map((s) => (
        <Card key={s.title} className="flex flex-col gap-2 p-5">
          <h2 className="font-display text-xl text-goldBright">{s.title}</h2>
          {s.body.map((p) => (
            <p key={p} className="leading-relaxed">{p}</p>
          ))}
        </Card>
      ))}
      <Card className="p-5">
        <h2 className="font-display text-xl text-goldBright">Keep going</h2>
        <p className="mt-2 leading-relaxed">
          Read the <Link className="text-gold underline" href="/guide/player">player guide</Link>, the{" "}
          <Link className="text-gold underline" href="/guide/dm">DM guide</Link>, or the{" "}
          <Link className="text-gold underline" href="/guide/faq">FAQ</Link>. The{" "}
          <Link className="text-gold underline" href="/rules-notes">rules notes</Link> say where the app leaves a call to the DM. The{" "}
          <Link className="text-gold underline" href="/wiki/rules">rules chapters</Link> explain every detail, the{" "}
          <Link className="text-gold underline" href="/wiki/conditions">conditions list</Link> covers what blinded or grappled really mean, and the{" "}
          <Link className="text-gold underline" href="/wiki/spells">spell list</Link> is searchable by class and level.
        </p>
      </Card>
    </div>
  );
}
