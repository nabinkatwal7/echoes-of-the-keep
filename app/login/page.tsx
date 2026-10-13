import { signIn, providerIds } from "@/auth";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic"; // provider list depends on runtime env

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Sign in</h1>
      {providerIds.length === 0 && (
        <p className="text-sm text-red-600">
          No sign-in providers configured. Set Google, Discord or email variables in .env (see .env.example).
        </p>
      )}
      {providerIds.includes("google") && (
        <form action={async () => { "use server"; await signIn("google", { redirectTo: "/characters" }); }}>
          <button className="w-full rounded border px-4 py-2">Continue with Google</button>
        </form>
      )}
      {providerIds.includes("discord") && (
        <form action={async () => { "use server"; await signIn("discord", { redirectTo: "/characters" }); }}>
          <button className="w-full rounded border px-4 py-2">Continue with Discord</button>
        </form>
      )}
      {providerIds.includes("nodemailer") && (
        <form
          className="flex flex-col gap-2"
          action={async (formData: FormData) => {
            "use server";
            await signIn("nodemailer", { email: formData.get("email"), redirectTo: "/characters" });
          }}
        >
          <input name="email" type="email" required placeholder="you@example.com" className="rounded border px-3 py-2" />
          <button className="rounded border px-4 py-2">Email me a sign-in link</button>
        </form>
      )}
    </main>
  );
}
