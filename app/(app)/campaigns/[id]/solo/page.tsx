import Link from "next/link";
import { notFound } from "next/navigation";
import { HeroAvatar, SceneBanner } from "@/app/components/pixel/Avatars";
import { SCENE_THEMES, type SceneTheme } from "@/engine/pixel/scenes";
import { Badge } from "@/app/components/ui/Badge";
import { Card } from "@/app/components/ui/Card";
import { LinkButton } from "@/app/components/ui/Button";
import { SCENES } from "@/engine/solo/story";
import { requireUser } from "@/lib/auth";
import { deriveStored, type StoredCharacter } from "@/lib/characters/derive";
import { prisma } from "@/lib/prisma";
import { readSolo } from "@/lib/solo/config";
import { readAdventure } from "@/lib/solo/director";
import { SceneIntro } from "@/app/components/cutscene/MomentScenes";
import { SoloControls } from "./SoloControls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Solo game" };

const titleCase = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const SCENE_LABEL: Record<string, string> = { intro: "The hook", "fight-1": "First fight", "rest-1": "Rest", "fight-2": "Second fight", "rest-2": "Rest", boss: "The final chamber", epilogue: "Epilogue" };

export default async function SoloGamePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({ where: { id, members: { some: { userId: user.id } } } });
  const solo = campaign ? readSolo(campaign.settings) : null;
  if (!campaign || !solo || solo.humanId !== user.id) notFound();
  const adv = readAdventure(campaign.world);

  const [links, events, encounters] = await Promise.all([
    prisma.campaignCharacter.findMany({ where: { campaignId: id }, include: { character: true } }),
    prisma.campaignEvent.findMany({ where: { campaignId: id, type: { in: ["system", "chat"] } }, orderBy: { id: "desc" }, take: 14 }),
    prisma.encounter.findMany({ where: { campaignId: id }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true, state: true, name: true } }),
  ]);
  const party = links.map(({ character: c }) => {
    const d = deriveStored(c as unknown as StoredCharacter);
    return { id: c.id, name: c.name, classIndex: (c.classes as { classIndex: string }[])[0]?.classIndex ?? "fighter", portraitUrl: c.portraitUrl, mine: c.ownerId === user.id, level: d.level, hp: c.currentHp, maxHp: d.maxHp, ac: d.armorClass.total, classes: (c.classes as { classIndex: string }[]).map((k) => titleCase(k.classIndex)).join(" / ") };
  });
  const fight = encounters[0] && encounters[0].state === "ACTIVE" ? encounters[0] : null;
  const scene = adv ? SCENES[Math.min(adv.sceneIndex, SCENES.length - 1)] : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/solo" className="eyebrow hover:text-goldBright">← Solo games</Link>
        <h1 className="gilded text-3xl font-bold">{adv?.title || campaign.name}</h1>
        <p className="text-sm text-muted">{solo.mode === "player" ? "You play a hero. The computer runs the story and your companions." : "You are the Dungeon Master. Computer heroes play the party."}</p>
      </div>

      {adv && !adv.complete && (
        <SceneIntro
          storageKey={`${id}:${adv.chapter}:${adv.sceneIndex}`}
          theme={(SCENE_THEMES as readonly string[]).includes(solo.theme) ? (solo.theme as SceneTheme) : "crypt"}
          title={SCENE_LABEL[scene ?? "intro"] ?? "The story continues"}
          text={[...events].find((e) => (e.payload as { narration?: boolean }).narration) ? String(([...events].find((e) => (e.payload as { narration?: boolean }).narration)!.payload as { text?: string }).text ?? "") : adv.title ?? ""}
          party={party.map((p) => ({ name: p.name, classIndex: p.classIndex }))}
        />
      )}
      <SceneBanner theme={(SCENE_THEMES as readonly string[]).includes(solo.theme) ? (solo.theme as SceneTheme) : "crypt"} seed={id} className="h-24 sm:h-32" />

      {adv && (
        <ol className="flex flex-wrap gap-2" aria-label="Chapter progress">
          {SCENES.map((s, i) => (
            <li key={s}>
              <Badge tone={adv.complete || i < adv.sceneIndex ? "emerald" : i === adv.sceneIndex ? "gold" : "neutral"}>
                {SCENE_LABEL[s]}
                {(adv.complete || i < adv.sceneIndex) && <span className="sr-only"> (done)</span>}
                {!adv.complete && i === adv.sceneIndex && <span className="sr-only"> (now)</span>}
              </Badge>
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-4">
            <h2 className="eyebrow">The story so far</h2>
            {events.length === 0 ? <p className="text-muted">Nothing has happened yet.</p> : (
              <ul className="flex flex-col gap-2" aria-live="polite">
                {[...events].reverse().map((e) => {
                  const p = e.payload as { text?: string; actorName?: string; narration?: boolean };
                  return p.narration ? (
                    <li key={e.id} className="border-l-2 border-gold/60 pl-3 italic">{p.text}</li>
                  ) : e.type === "chat" ? (
                    <li key={e.id}><strong className="text-gold">{p.actorName}:</strong> “{p.text}”</li>
                  ) : (
                    <li key={e.id} className="text-sm text-muted">{p.text}</li>
                  );
                })}
              </ul>
            )}
          </Card>
          <SoloControls
            campaignId={id}
            mode={solo.mode}
            autoMonsters={solo.autoMonsters}
            sceneKind={scene}
            complete={!!adv?.complete}
            fightId={fight?.id ?? null}
          />
        </div>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-4">
            <h2 className="eyebrow">The party</h2>
            <ul className="flex flex-col gap-2">
              {party.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 border-b border-border pb-2 last:border-0">
                  <HeroAvatar classIndex={p.classIndex} name={p.name} portraitUrl={p.portraitUrl} size={44} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/characters/${p.id}`} className="font-semibold hover:text-goldBright">{p.name}</Link>{p.mine && <Badge tone="gold" className="ml-2">You</Badge>}
                    <p className="text-xs text-muted">{p.classes} · level {p.level} · AC {p.ac}</p>
                  </div>
                  <Badge tone={p.hp <= p.maxHp * 0.3 ? "crimson" : "emerald"}>{p.hp}/{p.maxHp}</Badge>
                </li>
              ))}
            </ul>
          </Card>
          <div className="flex flex-wrap gap-2">
            <LinkButton variant="secondary" href={`/campaigns/${id}/combat`}>Combat</LinkButton>
            <LinkButton variant="secondary" href={`/campaigns/${id}/table`}>The table</LinkButton>
            <LinkButton variant="secondary" href={`/campaigns/${id}/journal`}>Journal</LinkButton>
            {solo.mode === "dm" && <LinkButton variant="secondary" href={`/campaigns/${id}/dm`}>DM screen</LinkButton>}
          </div>
        </div>
      </div>
    </div>
  );
}
