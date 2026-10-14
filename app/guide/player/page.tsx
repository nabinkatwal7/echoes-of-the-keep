import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import Link from "next/link";

export const metadata = { title: "Player guide" };

export default function PlayerGuide() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
      <PageHeader eyebrow="Guide" title="Playing a hero" subtitle="What you do at the table, in this app." />
      <Card className="flex flex-col gap-3 p-5 leading-relaxed">
        <p>Make a character from Characters, or use Play the tutorial on the learn page. Join a campaign with the invite code your DM shares, then attach your hero.</p>
        <p>On your turn you move, take one action, and sometimes a bonus action. The combat page shows your attacks, spells and hit points. End your turn when you are done. If you drop to 0 hit points, death saves are rolled for you at the start of your turn.</p>
        <p>The table is the shared chat and dice log. <code>/roll 1d20+5</code> rolls in public. <code>/w Name message</code> whispers. Your sheet stays in sync with the fight: slots, hit points and conditions update when the table uses them.</p>
        <p>Start with the <Link className="text-gold underline" href="/learn">learn page</Link> if you have never played.</p>
      </Card>
    </div>
  );
}
