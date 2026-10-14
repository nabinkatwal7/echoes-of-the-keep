import { notFound } from "next/navigation";
import { FolkAvatar, HeroAvatar, MonsterAvatar, SceneBanner } from "@/app/components/pixel/Avatars";
import { HERO_CLASSES } from "@/engine/pixel/heroes";
import { MONSTER_SHAPES } from "@/engine/pixel/monsters";
import { SCENE_THEMES } from "@/engine/pixel/scenes";

export const metadata = { title: "Pixel gallery" };

const SAMPLE: Record<string, [string, string]> = {
  beast: ["beast", "Wolf"], skeleton: ["undead", "Skeleton"], ghost: ["undead", "Ghost"], humanoid: ["humanoid", "Bandit"], dragon: ["dragon", "Red Dragon"],
  slime: ["ooze", "Gray Ooze"], spider: ["beast", "Giant Spider"], bat: ["beast", "Swarm of Bats"], fiend: ["fiend", "Imp"], giant: ["giant", "Ogre"],
  construct: ["construct", "Animated Armor"], plant: ["plant", "Shrieker"], eye: ["aberration", "Gibbering Mouther"], wisp: ["elemental", "Fire Elemental"],
  serpent: ["beast", "Constrictor Snake"], fey: ["fey", "Sprite"],
};

/** Every sprite on one page, for checking how they look. Only in development. */
export default function PixelGallery() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 p-6">
      <h1 className="gilded text-3xl font-bold">Pixel gallery</h1>
      <section>
        <h2 className="eyebrow mb-3">Heroes</h2>
        <div className="flex flex-wrap gap-4">
          {HERO_CLASSES.map((k) => (
            <figure key={k} className="flex flex-col items-center gap-1 text-xs">
              <HeroAvatar classIndex={k} name={`Sample ${k}`} size={96} />
              <figcaption>{k}</figcaption>
            </figure>
          ))}
          <figure className="flex flex-col items-center gap-1 text-xs">
            <FolkAvatar name="Garrick" size={96} />
            <figcaption>folk</figcaption>
          </figure>
        </div>
      </section>
      <section>
        <h2 className="eyebrow mb-3">Monsters</h2>
        <div className="flex flex-wrap gap-4">
          {MONSTER_SHAPES.map((k) => (
            <figure key={k} className="flex flex-col items-center gap-1 text-xs">
              <MonsterAvatar type={SAMPLE[k][0]} name={SAMPLE[k][1]} size={96} />
              <figcaption>{k}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section>
        <h2 className="eyebrow mb-3">Scenes</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {SCENE_THEMES.map((t) => (
            <figure key={t} className="flex flex-col gap-1 text-xs">
              <SceneBanner theme={t} seed={3} className="h-40" />
              <figcaption>{t}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
