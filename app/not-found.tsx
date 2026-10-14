import { SceneBanner } from "./components/pixel/Avatars";
import { MonsterAvatar } from "./components/pixel/Avatars";
import { LinkButton } from "./components/ui/Button";

export const metadata = { title: "Lost in the dark" };

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-20 text-center">
      <div className="panel w-full p-3">
        <SceneBanner theme="caves" seed={404} className="h-48" />
      </div>
      <div className="anim-bob">
        <MonsterAvatar type="undead" name="Lost skeleton" size={96} />
      </div>
      <h1 className="gilded text-4xl font-bold">Lost in the dark</h1>
      <p className="text-lg text-foreground/85">This passage leads nowhere. A skeleton shrugs: it has been wandering here for a long time too.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <LinkButton href="/">Back to the Keep</LinkButton>
        <LinkButton href="/wiki" variant="secondary">Search the Tome</LinkButton>
      </div>
    </div>
  );
}
