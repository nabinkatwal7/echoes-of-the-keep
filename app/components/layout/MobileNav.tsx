"use client";

import Link from "next/link";
import { useState } from "react";

const LINKS = [
  { href: "/learn", label: "Learn" },
  { href: "/wiki", label: "The Tome" },
  { href: "/characters", label: "Heroes" },
  { href: "/campaigns", label: "Campaigns" },
];

export function MobileNav({
  signedIn,
  name,
  logoutAction,
}: {
  signedIn: boolean;
  name?: string;
  logoutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const item = "rounded px-3 py-3 font-display uppercase tracking-[0.16em] hover:bg-surface2";
  return (
    <div className="md:hidden">
      <button
        aria-expanded={open}
        aria-label="Menu"
        onClick={() => setOpen(!open)}
        className="flex h-11 w-11 items-center justify-center rounded border border-border text-gold"
      >
        <span className="text-2xl leading-none">{open ? "✕" : "☰"}</span>
      </button>
      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-border bg-[#0c0906] p-4 shadow-2xl">
          <nav className="flex flex-col gap-1" onClick={() => setOpen(false)}>
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={item}>
                {l.label}
              </Link>
            ))}
            {signedIn ? (
              <>
                <Link href="/account" className={item}>
                  Account
                </Link>
                <form action={logoutAction}>
                  <button className={`${item} w-full text-left text-muted`}>Leave {name ? `(${name})` : ""}</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className={item}>
                  Sign in
                </Link>
                <Link href="/register" className={`${item} text-gold`}>
                  Join the party
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
