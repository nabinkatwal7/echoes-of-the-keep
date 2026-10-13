import { D20 } from "@/app/components/ui/D20";
import { Card } from "@/app/components/ui/Card";
import { AuthForm } from "../login/AuthForm";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-14">
      <D20 className="h-16 w-16 text-gold drop-shadow-[0_0_20px_rgba(201,162,75,0.4)]" />
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
