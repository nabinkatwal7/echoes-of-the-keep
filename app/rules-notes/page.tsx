import Link from "next/link";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";

export const metadata = { title: "Rules notes" };

const notes = [
  { title: "The app follows the book, then the DM", body: "When a rule is automated, the result is the one the book describes. When it is not, the table log says what happened and the DM decides the rest. A player can always roll the dice by hand and the DM can set hit points, conditions and the clock directly." },
  { title: "Spells", body: "About a third of the spells resolve on their own: attacks, saves, damage, healing, a few buffs, concentration and Counterspell. The rest spend the slot and are narrated. Bless, Shield and Shield of Faith are tracked. Other buffs are not. A summon joins the party's side. Polymorph swaps the creature's statistics until the DM changes them back; it does not end by itself at 0 hit points." },
  { title: "Class features", body: "Divine Smite and Sneak Attack are rolled with the attack. Metamagic, eldritch invocations, cleric domain spells and most other class features are shown on the sheet and used by hand. Level-up records hit points, an ability increase or a feat, and a subclass choice. It does not add every new class feature automatically." },
  { title: "Combat", body: "A readied action records the trigger and spends the reaction when it is used. The DM decides that the trigger happened. Moving away reports who could make an opportunity attack; someone still has to take that attack. Underwater fighting applies the usual penalties. Mounted combat is not built. Monster multiattack is read from the stat block. Recharge abilities and legendary actions are not." },
  { title: "The world", body: "Light sources burn down with the clock, and the time of day sets the ambient light. Falling, suffocation and starvation exist as numbers in the rules engine. The table does not apply that damage for you. Encounter difficulty is a rule of thumb, and the creature list is the animals and a few others from the handbook's appendix, plus any monster the DM builds for the campaign." },
  { title: "Maps", body: "A scene is a picture shown to the whole table. Combat uses a square grid. There is no token map for exploration, and no fog of war." },
];

export default function RulesNotes() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <PageHeader eyebrow="How this table plays" title="Rules notes" subtitle="Where the app follows the book, and where it leaves the call to the DM." />
      {notes.map((n) => (
        <Card key={n.title} className="flex flex-col gap-2 p-5">
          <h2 className="font-display text-xl text-goldBright">{n.title}</h2>
          <p className="leading-relaxed">{n.body}</p>
        </Card>
      ))}
      <p className="text-sm text-muted">
        New to the game? Start with <Link className="text-gold underline" href="/learn">Learn to play</Link>.
      </p>
    </div>
  );
}
