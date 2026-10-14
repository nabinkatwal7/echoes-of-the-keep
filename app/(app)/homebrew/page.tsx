import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { requireUser } from "@/lib/auth";
import { deleteHomebrew } from "@/lib/homebrew/actions";
import { prisma } from "@/lib/prisma";
import { HomebrewForms } from "./HomebrewForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Homebrew" };

export default async function HomebrewPage() {
  const user = await requireUser();
  const rows = await prisma.homebrewEntry.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Your table" title="Homebrew" subtitle="Races, backgrounds, feats and items only you see. They show up in the character creator." />
      <HomebrewForms />
      <Card className="p-5">
        <h2 className="eyebrow mb-3">Saved</h2>
        {rows.length === 0 && <p className="text-sm text-muted">Nothing yet.</p>}
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
              <span><span className="text-muted">{r.kind}.</span> {r.name}</span>
              <form action={deleteHomebrew.bind(null, r.id)}>
                <Button type="submit" variant="ghost">Remove</Button>
              </form>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          <a className="text-gold underline" href="/api/homebrew">Download as JSON</a>
        </p>
      </Card>
    </div>
  );
}
