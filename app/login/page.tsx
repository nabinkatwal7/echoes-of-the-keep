import { D20 } from "@/app/components/ui/D20";
import { Card } from "@/app/components/ui/Card";
import { AuthForm } from "./AuthForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // only allow same-site redirects
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-14">
      <D20 className="h-16 w-16 text-gold drop-shadow-[0_0_20px_rgba(201,162,75,0.4)]" />
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
