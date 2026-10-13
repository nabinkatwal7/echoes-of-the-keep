import { readFileSync } from "node:fs";
import path from "node:path";

/** Chapters turned into rule sections: [file, chapter slug, title]. */
export const RULE_CHAPTERS: [string, string, string][] = [
  ["07-using-ability-scores", "using-ability-scores", "Using Ability Scores"],
  ["08-adventuring", "adventuring", "Adventuring"],
  ["09-combat", "combat", "Combat"],
  ["10-spellcasting", "spellcasting", "Spellcasting"],
  ["appendix-b-gods-of-the-multiverse", "gods", "Gods of the Multiverse"],
  ["appendix-c-planes-of-existence", "planes", "The Planes of Existence"],
  ["appendix-e-inspirational-reading", "further-reading", "Inspirational Reading"],
];

const slugify = (s: string) => s.toLowerCase().replace(/['\u2019]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Repair OCR splits inside headings, e.g. "Two-W eapon Fighting" and "Controlling aMount". */
function cleanHeading(h: string): string {
  return h
    .replace(/-([A-Z]) ([a-z])/g, "-$1$2")
    .replace(/\ba([A-Z][a-z])/g, "a $1")
    .replace(/\s+/g, " ")
    .trim();
}

export type RuleRow = {
  id: string; chapter: string; chapterTitle: string; title: string; slug: string;
  body: string; position: number; source: string; pdfPage: number | null;
};

/** Split a chapter markdown file at "### " headings. Text before the first heading becomes an "Overview" section. */
export function splitChapter(markdown: string, chapter: string, chapterTitle: string): RuleRow[] {
  const rows: RuleRow[] = [];
  let title = "Overview";
  let buf: string[] = [];
  let page: number | null = null;
  let sectionPage: number | null = null;
  const seen = new Set<string>();

  const flush = () => {
    const body = buf.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!body) return;
    let slug = slugify(title) || "section";
    for (let n = 2; seen.has(slug); n++) slug = `${slugify(title)}-${n}`;
    seen.add(slug);
    rows.push({ id: `${chapter}/${slug}`, chapter, chapterTitle, title, slug, body, position: rows.length, source: "PHB", pdfPage: sectionPage });
  };

  for (const line of markdown.split(/\r?\n/)) {
    const pm = /^<!-- pdf-page (\d+) -->$/.exec(line.trim());
    if (pm) { page = Number(pm[1]); continue; }
    if (/^# /.test(line) && !/^### /.test(line)) continue; // chapter title line
    const hm = /^### (.+)$/.exec(line);
    if (hm) {
      flush();
      title = cleanHeading(hm[1]);
      buf = [];
      sectionPage = page;
      continue;
    }
    if (buf.length === 0 && sectionPage === null) sectionPage = page;
    buf.push(line);
  }
  flush();
  return rows;
}

export function loadRuleSections(): RuleRow[] {
  const dir = path.join(__dirname, "..", "extracted", "chapters");
  return RULE_CHAPTERS.flatMap(([file, chapter, title]) => splitChapter(readFileSync(path.join(dir, `${file}.md`), "utf-8"), chapter, title));
}
