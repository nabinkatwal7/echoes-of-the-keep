import { HeroAvatar, SceneBanner } from "@/app/components/pixel/Avatars";
import { Card } from "@/app/components/ui/Card";
import { AuthForm } from "./AuthForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // only allow same-site redirects
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-14">
      <div className="panel w-full p-3">
        <SceneBanner theme="tavern" seed={11} className="h-36" />
      </div>
      <div className="-mt-12 flex items-end gap-2" aria-hidden>
        {["fighter", "wizard", "rogue", "cleric"].map((k, i) => (
          <div key={k} className="anim-bob" style={{ animationDelay: `${i * 0.3}s` }}>
            <HeroAvatar classIndex={k} name={`Guest ${k}`} size={52} />
          </div>
        ))}
      </div>
      <div className="text-center">
        <p className="eyebrow">Welcome back</p>
        <h1 className="gilded text-4xl font-bold">Sign in</h1>
      </div>
      <Card className="w-full p-7">
        <AuthForm mode="login" next={safe} />
      </Card>
    </main>
  );
}
