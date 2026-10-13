import Link from "next/link";
import { logout } from "@/lib/accounts";
import { getUser } from "@/lib/auth";
import { buttonClasses } from "../ui/Button";
import { D20 } from "../ui/D20";
import { MobileNav } from "./MobileNav";

export const NAV = [
  { href: "/wiki", label: "The Tome" },
  { href: "/characters", label: "Heroes" },
  { href: "/campaigns", label: "Campaigns" },
] as const;

export async function SiteHeader() {
  const user = await getUser();
  return (
    <header className="no-print sticky top-0 z-40 border-b border-border/70 bg-[#0c0906]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="group flex items-center gap-3 text-gold">
          <D20 className="h-9 w-9 transition-transform duration-500 group-hover:rotate-[72deg]" />
          <span className="font-display text-base font-bold uppercase tracking-[0.12em] text-foreground sm:text-lg">
            Dungeons <span className="text-gold">&amp;</span> Dragons
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-3 py-2 font-display text-xs uppercase tracking-[0.16em] text-muted transition hover:text-goldBright"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="font-display text-xs uppercase tracking-[0.14em] text-muted">{user.name}</span>
              <form action={logout}>
                <button className={buttonClasses("secondary", "min-h-9 px-3 text-[0.68rem]")}>Leave</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonClasses("ghost", "min-h-9")}>
                Sign in
              </Link>
              <Link href="/register" className={buttonClasses("primary", "min-h-9 px-4")}>
                Join the party
              </Link>
            </>
          )}
        </div>

        <MobileNav signedIn={!!user} name={user?.name ?? undefined} logoutAction={logout} />
      </div>
    </header>
  );
}
