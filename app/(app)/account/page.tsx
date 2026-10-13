import { LinkButton } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountForms } from "./AccountForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  const me = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { username: true, displayName: true, _count: { select: { characters: true, campaignsDm: true } } } });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Signed in as" title={me.displayName} subtitle={`@${me.username}`} />
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="eyebrow">Your data</h2>
        <p className="text-sm text-muted">Download your heroes, campaign memberships and journal entries as a JSON file.</p>
        <div>
          <LinkButton href="/api/account/export" variant="secondary" prefetch={false}>
            Download my data
          </LinkButton>
        </div>
      </Card>
      <AccountForms username={me.username} heroes={me._count.characters} campaignsRun={me._count.campaignsDm} />
    </div>
  );
}
