import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";

export const metadata = { title: "DM guide" };

export default function DmGuide() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
      <PageHeader eyebrow="Guide" title="Running the game" subtitle="The DM screen, the map, and the fight." />
      <Card className="flex flex-col gap-3 p-5 leading-relaxed">
        <p>Create a campaign and share the invite code. House rules on the campaign page turn multiclassing, feats and flanking on or off for everyone in that game.</p>
        <p>The DM screen runs the clock, travel, checks, treasure and the party. Locations with an image become the scene at the table. The exploration map on the table page is a grid of tokens; set the feet per square before you place anyone.</p>
        <p>Build an encounter from the monster library, add the party, and start it. You can damage, heal, apply conditions, and undo the last combat change. Secret rolls stay on your side of the log. Export the campaign as JSON, or the journal as Markdown, from the campaign page.</p>
      </Card>
    </div>
  );
}
