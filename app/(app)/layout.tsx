import Link from "next/link";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div>
      <header className="flex items-center gap-4 border-b p-4">
        <Link href="/characters">Characters</Link>
        <Link href="/campaigns">Campaigns</Link>
        <Link href="/wiki/character">Wiki</Link>
        <span className="ml-auto text-sm">{user.name ?? user.email}</span>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
          <button className="text-sm underline">Sign out</button>
        </form>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
