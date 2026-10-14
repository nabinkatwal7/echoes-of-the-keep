import Link from "next/link";
import { GiCrossedSwords } from "react-icons/gi";
import { HeroAvatar } from "@/app/components/pixel/Avatars";
import { Card } from "@/app/components/ui/Card";
import { LinkButton } from "@/app/components/ui/Button";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { requireUser } from "@/lib/auth";
import { listCharacters } from "@/lib/characters/queries";
import { ImportButton } from "./ImportButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Heroes" };

const titleCase = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default async function CharactersPage() {
  const user = await requireUser();
  const characters = await listCharacters(user.id);
  return (
    <>
      <PageHeader
        eyebrow="Your roster"
        title="Heroes"
        subtitle="The adventurers you have forged."
        icon={<GiCrossedSwords />}
        actions={
          <>
            <ImportButton />
            <LinkButton href="/characters/new">Forge a hero</LinkButton>
          </>
        }
      />
      {characters.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 py-14 text-center">
          <GiCrossedSwords className="h-14 w-14 text-gold/60" />
          <p className="max-w-md text-muted">No adventurers yet. Forge your first hero. It takes a few minutes, and every number is explained.</p>
          <LinkButton href="/characters/new">Forge a hero</LinkButton>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {characters.map((c) => {
            const classes = c.classes as { classIndex: string; level: number }[];
            return (
              <Link key={c.id} href={`/characters/${c.id}`} className="block">
                <Card interactive className="flex items-center gap-4">
                  <HeroAvatar classIndex={classes[0]?.classIndex ?? "fighter"} name={c.name} portraitUrl={c.portraitUrl} size={64} />
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-lg uppercase tracking-[0.1em]">{c.name}</h2>
                    <p className="text-sm text-muted">
                      {titleCase(c.subraceIndex ?? c.raceIndex)} {classes.map((k) => `${titleCase(k.classIndex)} ${k.level}`).join(" / ")}
                    </p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
