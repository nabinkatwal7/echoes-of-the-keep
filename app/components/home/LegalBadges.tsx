"use client";

import { motion } from "framer-motion";
import Link from "next/link";

type Badge = { label: string; value: string; tone: string };

/** Which rules the app implements and under what licence, with the attribution the SRD's licence asks for. */
export function LegalBadges({ srdOnly, counts }: { srdOnly: boolean; counts: { spells: number; creatures: number } }) {
  const badges: Badge[] = [
    { label: "Rules", value: "5th Edition (2014 Player's Handbook)", tone: "border-gold/60 text-goldBright" },
    { label: "Reference", value: "SRD 5.1 · CC-BY-4.0", tone: "border-emerald/60 text-emerald" },
    { label: "SRD 5.2 (2024 rules)", value: "Not supported yet", tone: "border-ember/60 text-ember" },
    { label: "This server", value: srdOnly ? "Free-rules (SRD-only) mode" : "Full content mode", tone: srdOnly ? "border-emerald/60 text-emerald" : "border-arcane/60 text-arcane" },
    { label: "Loaded", value: `${counts.spells} spells · ${counts.creatures} creatures`, tone: "border-border text-foreground" },
  ];
  return (
    <div className="mx-auto max-w-4xl px-4">
      <ul className="flex flex-wrap justify-center gap-3" aria-label="Rules and licence">
        {badges.map((b, i) => (
          <motion.li key={b.label} initial={{ opacity: 0, y: 24, scale: 0.9 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.09, type: "spring", stiffness: 140, damping: 14 }} whileHover={{ y: -4, rotate: -1 }} className={`rounded-lg border bg-surface px-4 py-2 text-left ${b.tone}`}>
            <span className="rune-label block">{b.label}</span>
            <span className="text-sm font-semibold">{b.value}</span>
          </motion.li>
        ))}
      </ul>
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.5, duration: 0.8 }} className="panel-flat mt-6 space-y-3 p-5 text-sm text-foreground/85">
        <p>
          This work includes material taken from the System Reference Document 5.1 (&ldquo;SRD 5.1&rdquo;) by Wizards of the Coast LLC, available at{" "}
          <a className="underline hover:text-goldBright" href="https://dnd.wizards.com/resources/systems-reference-document" rel="noreferrer">dnd.wizards.com/resources/systems-reference-document</a>. The SRD 5.1 is licensed under the{" "}
          <a className="underline hover:text-goldBright" href="https://creativecommons.org/licenses/by/4.0/legalcode" rel="noreferrer">Creative Commons Attribution 4.0 International License</a>.
        </p>
        <p>Echoes of the Keep is an unofficial fan project. It is not affiliated with, endorsed by or sponsored by Wizards of the Coast. Dungeons &amp; Dragons is a trademark of Wizards of the Coast LLC.</p>
        <p>
          <Link href="/legal" className="underline hover:text-goldBright">Legal and attribution</Link>
          {" · "}
          <Link href="/rules-notes" className="underline hover:text-goldBright">Rules notes</Link>
        </p>
      </motion.div>
    </div>
  );
}
