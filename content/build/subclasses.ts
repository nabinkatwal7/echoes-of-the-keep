import { readFileSync } from "node:fs";
import path from "node:path";
import { SUBCLASSES, subclassSlug } from "../../engine/classes/subclasses";

const CLASS_START = /^(?:### )?The (Barbarian|Bard|Cleric|Druid|Fighter|Monk|Paladin|Ranger|Rogue|Sorcerer|Warlock|Wizard)\s*$/;
const CLASS_NAME = /^(Barbarian|Bard|Cleric|Druid|Fighter|Monk|Paladin|Ranger|Rogue|Sorcerer|Warlock|Wizard)$/;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

export type SubclassRow = { index: string; classIndex: string; name: string; text: string; source: string; pdfPage: number | null };

/** Slice each subclass from its heading to the next subclass heading or the next class's start. */
export function extractSubclasses(markdown: string): SubclassRow[] {
  const lines = markdown.split(/\r?\n/);
  const pageAt: (number | null)[] = [];
  let page: number | null = null;
  lines.forEach((l, i) => {
    const m = /^<!-- pdf-page (\d+) -->$/.exec(l.trim());
    if (m) page = Number(m[1]);
    pageAt[i] = page;
  });

  const wanted = new Map(SUBCLASSES.map((s) => [norm(s.name), s]));
  const heads: { line: number; sub: (typeof SUBCLASSES)[number] }[] = [];
  const found = new Set<string>();
  lines.forEach((l, i) => {
    const key = norm(l.replace(/^### /, ""));
    const sub = wanted.get(key);
    if (sub && !found.has(key)) {
      found.add(key);
      heads.push({ line: i, sub });
    }
  });

  // a class begins either at its table heading ("The Bard") or at a bare class-name line right after a page marker
  const classStarts: number[] = [];
  let prev = "";
  lines.forEach((l, i) => {
    if (CLASS_START.test(l) || (CLASS_NAME.test(l.trim()) && /^<!-- pdf-page/.test(prev))) classStarts.push(i);
    if (l.trim()) prev = l.trim();
  });
  const boundaries = [...heads.map((h) => h.line), ...classStarts, lines.length].sort((a, b) => a - b);

  return heads.map((h) => {
    const end = boundaries.find((b) => b > h.line) ?? lines.length;
    const text = lines
      .slice(h.line + 1, end)
      .filter((l) => !/^<!-- pdf-page/.test(l.trim()))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return { index: subclassSlug(h.sub.name), classIndex: h.sub.classIndex, name: h.sub.name, text, source: "PHB", pdfPage: pageAt[h.line] };
  });
}

export function loadSubclasses(): SubclassRow[] {
  return extractSubclasses(readFileSync(path.join(__dirname, "..", "extracted", "chapters", "03-classes.md"), "utf-8"));
}
