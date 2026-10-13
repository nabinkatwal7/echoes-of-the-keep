import { AuthForm } from "../login/AuthForm";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold">Create account</h1>
      <AuthForm mode="register" />
    </main>
  );
}
