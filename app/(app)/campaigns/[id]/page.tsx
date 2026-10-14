import Link from "next/link";
import { notFound } from "next/navigation";
import { GiCastle } from "react-icons/gi";
import { HeroAvatar } from "@/app/components/pixel/Avatars";
import { Badge } from "@/app/components/ui/Badge";
import { Card } from "@/app/components/ui/Card";
import { LinkButton } from "@/app/components/ui/Button";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { readSolo } from "@/lib/solo/config";
import { CallLink } from "@/app/components/CallLink";
import { callLinkOf } from "@/lib/campaigns/call";
import { CallLinkForm } from "./CallLinkForm";
import { HouseRulesForm } from "./HouseRulesForm";
import { readHouseRules } from "@/lib/campaigns/houseRules";
import { requireUser } from "@/lib/auth";
import { getCampaignForMember } from "@/lib/campaigns/queries";
import { listCharacters } from "@/lib/characters/queries";
import { AttachCharacter } from "./AttachCharacter";
import { CopyCode } from "./CopyCode";

export const dynamic = "force-dynamic";

const titleCase = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const c = await getCampaignForMember((await params).id, user.id);
  return { title: c?.name ?? "Campaign" };
}

export default async function CampaignHub({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const campaign = await getCampaignForMember((await params).id, user.id);
  if (!campaign) notFound();

  const me = campaign.members.find((m) => m.userId === user.id);
  const isDm = me?.role === "DM";
  const myCharacters = await listCharacters(user.id);
  const attachedIds = new Set(campaign.characters.map((c) => c.characterId));
  const available = myCharacters.filter((c) => !attachedIds.has(c.id)).map((c) => ({ id: c.id, name: c.name }));

  return (
    <>
      <Link href="/campaigns" className="eyebrow mb-4 inline-block hover:text-goldBright">
        ← All campaigns
      </Link>
      {readSolo(campaign.settings)?.humanId === user.id && (
        <p className="mb-4 rounded border border-gold/50 bg-gold/10 px-3 py-2 text-sm">
          This is a solo game. <Link className="underline" href={`/campaigns/${campaign.id}/solo`}>Open the solo page</Link> to continue the story.
        </p>
      )}
      <PageHeader
        eyebrow={isDm ? "You are the Dungeon Master" : "Campaign"}
        title={campaign.name}
        subtitle={campaign.description || undefined}
        icon={<GiCastle />}
        actions={
          <div className="flex flex-wrap gap-2">
            <CallLink url={callLinkOf(campaign.settings)} />
            {isDm && <LinkButton variant="secondary" href={`/campaigns/${campaign.id}/dm`}>DM screen</LinkButton>}
            <LinkButton variant="secondary" href={`/campaigns/${campaign.id}/world`}>World</LinkButton>
            <LinkButton variant="secondary" href={`/campaigns/${campaign.id}/journal`}>Journal</LinkButton>
            <LinkButton variant="secondary" href={`/api/campaigns/${campaign.id}/export`} prefetch={false}>Export</LinkButton>
            <LinkButton variant="secondary" href={`/api/campaigns/${campaign.id}/export?format=md`} prefetch={false}>Download journal</LinkButton>
            <LinkButton variant="secondary" href={`/campaigns/${campaign.id}/combat`}>Combat</LinkButton>
            <LinkButton href={`/campaigns/${campaign.id}/table`}>Enter the table</LinkButton>
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section className="flex flex-col gap-4">
          {isDm && <CallLinkForm campaignId={campaign.id} campaignName={campaign.name} initial={callLinkOf(campaign.settings) ?? ""} />}
          {isDm && <HouseRulesForm campaignId={campaign.id} initial={readHouseRules(campaign.settings)} />}
          <h2 className="eyebrow">The party</h2>
          {campaign.characters.length === 0 ? (
            <Card flat className="text-center text-muted">No heroes have joined yet.</Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {campaign.characters.map(({ character }) => {
                const classes = character.classes as { classIndex: string; level: number }[];
                return (
                  <Card key={character.id} flat className="flex items-center gap-3">
                    <HeroAvatar classIndex={classes[0]?.classIndex ?? "fighter"} name={character.name} portraitUrl={character.portraitUrl} size={56} />
                    <div className="min-w-0">
                      <p className="truncate font-display uppercase tracking-[0.08em]">{character.name}</p>
                      <p className="text-sm text-muted">
                        {titleCase(character.subraceIndex ?? character.raceIndex)} {classes.map((k) => `${titleCase(k.classIndex)} ${k.level}`).join(" / ")}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          <AttachCharacter campaignId={campaign.id} characters={available} />
        </section>

        <aside className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3">
            <h2 className="font-display uppercase tracking-[0.12em] text-goldBright">Invite code</h2>
            <CopyCode code={campaign.inviteCode} />
            <p className="text-sm text-muted">Share this with your players. They enter it under Campaigns → Join a party.</p>
          </Card>
          <Card flat className="flex flex-col gap-3">
            <h2 className="eyebrow">At the table</h2>
            <ul className="flex flex-col gap-2">
              {campaign.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2">
                  <span>{m.user.displayName}</span>
                  <Badge tone={m.role === "DM" ? "crimson" : "gold"}>{m.role === "DM" ? "DM" : "Player"}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}
