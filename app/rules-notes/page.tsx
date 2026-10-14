import Link from "next/link";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";

export const metadata = { title: "Rules notes" };

const notes = [
  { title: "The app follows the book, then the DM", body: "When a rule is automated, the result is the one the book describes. When it is not, the table log says what happened and the DM decides the rest. A player can always roll the dice by hand and the DM can set hit points, conditions and the clock directly." },
  { title: "Spells", body: "Attacks, saves, damage, healing, concentration and Counterspell resolve on their own. Bless, Shield, Shield of Faith and Haste are tracked: Haste adds armor, speed, a Dexterity-save advantage and one extra action, then leaves the target unable to move or act on the turn it ends. Light, Darkness, Misty Step, Knock, Detect Magic and Speak with Animals write what the spell lets the table do. A summon joins the party's side. Polymorph swaps statistics and, at 0 hit points, returns the original form with any excess damage carried over. Other spells spend the slot and are narrated." },
  { title: "Class features", body: "Divine Smite and Sneak Attack are rolled with the attack. A sorcerer can spend sorcery points on Metamagic from the combat spell panel (two options at level 3, then more; the sheet can narrow the list). Agonizing Blast adds Charisma to eldritch blast when that invocation is saved on the character. A Life domain cleric's healing spells add 2 plus the spell's level. Most other class features are shown on the sheet and used by hand. Level-up records hit points, an ability increase or a feat, and a subclass choice." },
  { title: "Combat", body: "A readied action records the trigger. When the DM marks that the trigger happened, the creature who readied it is prompted and spends a reaction to follow through. Leaving an enemy's reach prompts that enemy to make an opportunity attack; someone still has to take it, and a mounted rider can be the target instead of the mount. Underwater fighting applies the usual penalties, including fire resistance. Mounting or dismounting costs half your speed and can be done once on your turn. A controlled mount uses its speed and can only Dash, Disengage or Dodge. Monster multiattack, recharge abilities and legendary actions are read from the stat block. A legendary action is taken at the end of another creature's turn, and a spent recharge ability rolls a d6 at the start of the monster's turn." },
  { title: "The world", body: "Light sources burn down with the clock, and the time of day sets the ambient light. From the combat controls the DM can drop a creature a number of feet (1d6 per 10 feet, and they land prone), mark them out of breath (they drop to 0 hit points), or add a level of exhaustion for going without food. Encounter difficulty uses the Basic Rules budget (the handbook has no table): easy, medium, hard and deadly for parties of 3 to 6 from level 1 to 20, with the usual monster-count multiplier. The creature list is the Systems Reference Document stat blocks (CC-BY) plus any monster the DM builds for the campaign. A campaign can turn off multiclassing and feats, and can turn flanking on." },
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
