"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sectionIcon } from "@/app/components/icons";
import { wikiSections } from "@/data/wikiSections";
import { cn } from "@/utils/cn";

export function WikiNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="The Tome" className="panel-flat p-2">
      <p className="eyebrow px-3 pb-2 pt-3">The Tome</p>
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {wikiSections.map((s) => {
          const Icon = sectionIcon(s.key);
          const active = pathname === s.href || pathname.startsWith(`${s.href}/`);
          return (
            <li key={s.key} className="shrink-0">
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded px-3 py-2 font-display text-xs uppercase tracking-[0.14em] transition",
                  active ? "bg-gold/15 text-goldBright shadow-[inset_3px_0_0_var(--gold)]" : "text-muted hover:bg-surface2 hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="whitespace-nowrap">{s.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
