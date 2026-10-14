import Link from "next/link";
import { logout } from "@/lib/accounts";
import { getUser } from "@/lib/auth";
import { buttonClasses } from "../ui/Button";
import { Brand } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";
import { MobileNav } from "./MobileNav";
import { SearchPalette } from "./SearchPalette";

export const NAV = [
  { href: "/learn", label: "Learn" },
  { href: "/wiki", label: "The Tome" },
  { href: "/characters", label: "Heroes" },
  { href: "/homebrew", label: "Homebrew" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/solo", label: "Solo play" },
] as const;

export async function SiteHeader() {
  const user = await getUser();
  return (
    <header className="no-print sticky top-0 z-40 border-b border-border/70 bg-[var(--header-bg)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-4 sm:px-4">
        <Brand />

        <nav className="ml-4 hidden items-center gap-1 xl:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded px-3 py-2 font-display text-xs uppercase tracking-[0.14em] text-muted transition hover:text-goldBright"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <SearchPalette />
          <ThemeToggle className="hidden sm:inline-flex" />
          <div className="hidden items-center gap-2 xl:flex">
            {user ? (
              <>
                <Link href="/account" className="max-w-[8rem] truncate px-2 font-display text-xs uppercase tracking-[0.14em] text-muted hover:text-goldBright" title={user.name ?? undefined}>
                  {user.name}
                </Link>
                <form action={logout}>
                  <button className={buttonClasses("secondary", "min-h-10 px-3 text-[0.68rem]")}>Leave</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className={buttonClasses("ghost", "min-h-10 px-3")}>
                  Sign in
                </Link>
                <Link href="/register" className={buttonClasses("primary", "min-h-10 whitespace-nowrap px-4")}>
                  Join
                </Link>
              </>
            )}
          </div>
          <MobileNav signedIn={!!user} name={user?.name ?? undefined} logoutAction={logout} />
        </div>
      </div>
    </header>
  );
}
