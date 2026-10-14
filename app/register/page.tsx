import { HeroAvatar, SceneBanner } from "@/app/components/pixel/Avatars";
import { Card } from "@/app/components/ui/Card";
import { AuthForm } from "../login/AuthForm";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-14">
      <div className="panel w-full p-3">
        <SceneBanner theme="tavern" seed={12} className="h-36" />
      </div>
      <div className="-mt-12 flex items-end gap-2" aria-hidden>
        {["fighter", "wizard", "rogue", "cleric"].map((k, i) => (
          <div key={k} className="anim-bob" style={{ animationDelay: `${i * 0.3}s` }}>
            <HeroAvatar classIndex={k} name={`Guest ${k}`} size={52} />
          </div>
        ))}
      </div>
      <div className="text-center">
        <p className="eyebrow">Join the party</p>
        <h1 className="gilded text-4xl font-bold">Create account</h1>
      </div>
      <Card className="w-full p-7">
        <AuthForm mode="register" />
      </Card>
    </main>
  );
}
