export type Attack = { name: string; bonus: number; damage: string; kind: string };

const ATTACK = /([A-Z][A-Za-z' ]{1,30})\.\s*(?:Melee|Ranged)(?: or Ranged)? (?:Weapon|Spell) Attack:\s*\+(\d+) to hit[^.]*?\.[^.]*?\.\s*Hit:\s*\d+\s*\(([^)]+)\)\s*([a-z]+) damage/g;

/** Pulls "Bite. Melee Weapon Attack: +5 to hit ... Hit: 10 (2d6 + 3) piercing damage" lines out of a stat block's text. */
export function parseAttacks(text: string): Attack[] {
  const out: Attack[] = [];
  for (const m of text.replace(/\s+/g, " ").matchAll(ATTACK)) {
    const name = m[1].trim().split(". ").pop()!.trim();
    out.push({ name, bonus: Number(m[2]), damage: m[3].replace(/\s+/g, ""), kind: m[4] });
  }
  return out;
}

/** "1/4 (50 XP)" becomes 0.25, "17 (18,000 XP)" becomes 17. Unknown becomes 0. */
export function crValue(challenge: string | null | undefined): number {
  const head = (challenge ?? "").trim().split(/\s+/)[0] ?? "";
  if (head.includes("/")) {
    const [a, b] = head.split("/").map(Number);
    return b ? a / b : 0;
  }
  const n = Number(head);
  return Number.isFinite(n) ? n : 0;
}

export const crLabel = (v: number) => (v === 0.125 ? "1/8" : v === 0.25 ? "1/4" : v === 0.5 ? "1/2" : String(v));
