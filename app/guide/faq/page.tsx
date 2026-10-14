import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import Link from "next/link";

export const metadata = { title: "FAQ" };

const faqs = [
  ["I forgot my password.", "There is no email reset. Generate recovery codes on your account page and keep them. The recover page accepts one code and sets a new password."],
  ["Why is a spell missing?", "The free-rules build only shows SRD spells. A full build shows the handbook list. Homebrew spells added to a campaign appear in that campaign."],
  ["The table looks quiet.", "Open the table and stay on the page. Presence updates within a second. If the connection drops, the log resumes from the last event you saw."],
  ["Can I play with no network?", "The last character sheet you opened is kept in this browser. Visit /offline when you are disconnected. The live table still needs the server."],
  ["Where are the rules the app does not roll?", "The rules notes page lists what the DM still adjudicates."],
];

export default function Faq() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
      <PageHeader eyebrow="Guide" title="Questions" subtitle="Short answers." />
      {faqs.map(([q, a]) => (
        <Card key={q} className="p-5">
          <h2 className="font-display text-lg text-goldBright">{q}</h2>
          <p className="mt-2 leading-relaxed">{a}</p>
        </Card>
      ))}
      <p className="text-sm text-muted">
        More in the <Link className="text-gold underline" href="/guide/player">player guide</Link> and the <Link className="text-gold underline" href="/guide/dm">DM guide</Link>.
      </p>
    </div>
  );
}
