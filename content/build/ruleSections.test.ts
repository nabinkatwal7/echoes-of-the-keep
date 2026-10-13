import { describe, expect, it } from "vitest";
import { loadRuleSections, splitChapter } from "./ruleSections";

describe("splitChapter", () => {
  it("splits at headings, tolerating CRLF, and keeps page numbers", () => {
    const md = "# Combat\r\n\r\n<!-- pdf-page 5 -->\r\n\r\nIntro text.\r\n\r\n### Surprise\r\n\r\nBody one.\r\n\r\n<!-- pdf-page 6 -->\r\n\r\n### Initiative\r\n\r\nBody two.";
    const rows = splitChapter(md, "combat", "Combat");
    expect(rows.map((r) => r.title)).toEqual(["Overview", "Surprise", "Initiative"]);
    expect(rows[1]).toMatchObject({ id: "combat/surprise", body: "Body one.", pdfPage: 5 });
    expect(rows[2].pdfPage).toBe(6);
  });
  it("makes duplicate headings unique", () => {
    const rows = splitChapter("### Attack\nA\n### Attack\nB", "combat", "Combat");
    expect(rows.map((r) => r.slug)).toEqual(["attack", "attack-2"]);
  });
});

describe("loadRuleSections", () => {
  it("loads the handbook chapters with real sections", () => {
    const rows = loadRuleSections();
    const titles = (c: string) => rows.filter((r) => r.chapter === c).map((r) => r.title);
    expect(titles("combat")).toEqual(expect.arrayContaining(["Initiative", "Cover", "Surprise"]));
    expect(titles("using-ability-scores").length).toBeGreaterThan(8);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });
});
