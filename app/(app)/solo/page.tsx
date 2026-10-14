import Link from "next/link";
import { GiDiceTwentyFacesTwenty } from "react-icons/gi";
import { SceneBanner } from "@/app/components/pixel/Avatars";
import { SCENE_THEMES, type SceneTheme } from "@/engine/pixel/scenes";
import { Badge } from "@/app/components/ui/Badge";
import { Card } from "@/app/components/ui/Card";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { BLUEPRINTS } from "@/engine/bots/blueprints";
import type { ClassLevel } from "@/engine/progression";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_SOLO_GAMES, soloGamesOf } from "@/lib/solo/games";
import { readSolo } from "@/lib/solo/config";
import { readAdventure } from "@/lib/solo/director";
import { NewSoloForm } from "./NewSoloForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Solo play" };

const titleCase = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default async function SoloPage() {
  const user = await requireUser();
  const [games, heroes] = await Promise.all([soloGamesOf(user.id), prisma.character.findMany({ where: { ownerId: user.id }, orderBy: { name: "asc" } })]);

  return (
    <>
      <PageHeader eyebrow="No party needed" title="Solo play" subtitle="Play as a hero with a computer Dungeon Master and companions, or run the game yourself while computer heroes fill the party." icon={<GiDiceTwentyFacesTwenty />} />
      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <section className="flex flex-col gap-4">
          <h2 className="eyebrow">Your solo games</h2>
          {games.length === 0 ? (
            <Card className="py-12 text-center text-muted">No solo games yet. Start one on the right.</Card>
          ) : (
            games.map((g) => {
              const solo = readSolo(g.settings)!;
              const adv = readAdventure(g.world);
              return (
                <Link key={g.id} href={`/campaigns/${g.id}/solo`} className="block">
                  <Card className="flex flex-wrap items-center gap-3 p-4 transition hover:border-gold">
                    <SceneBanner theme={(SCENE_THEMES as readonly string[]).includes(solo.theme) ? (solo.theme as SceneTheme) : "crypt"} seed={g.id} className="h-16 w-28 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold">{g.name}</h3>
                      <p className="text-sm text-muted">
                        {solo.mode === "player" ? "You play a hero" : "You are the Dungeon Master"} · {titleCase(solo.theme)}
                        {adv ? ` · Chapter ${adv.chapter}` : ""}
                      </p>
                    </div>
                    {adv?.complete && <Badge tone="emerald">Chapter complete</Badge>}
                    {adv?.encounterId && <Badge tone="crimson">In a fight</Badge>}
                  </Card>
                </Link>
              );
            })
          )}
        </section>
        <NewSoloForm
          atLimit={games.length >= MAX_SOLO_GAMES}
          heroes={heroes.map((h) => ({ id: h.id, name: h.name, summary: (h.classes as ClassLevel[]).map((k) => `${titleCase(k.classIndex)} ${k.level}`).join(" / ") }))}
          premade={BLUEPRINTS.map((b) => ({ key: b.key, label: titleCase(b.classIndex), role: b.role }))}
        />
      </div>
    </>
  );
}
