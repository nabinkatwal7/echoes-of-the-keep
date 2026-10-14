import { describe, expect, it } from "vitest";
import { safeImageUrl } from "./safeUrl";

describe("safeImageUrl", () => {
  it("accepts https image files and the empty string", () => {
    expect(safeImageUrl("")).toBe(true);
    expect(safeImageUrl("https://example.com/art/hero.png")).toBe(true);
    expect(safeImageUrl("https://cdn.example.com/a.JPG?size=large")).toBe(true);
  });
  it("refuses everything else", () => {
    for (const bad of ["http://example.com/a.png", "javascript:alert(1)", "data:image/png;base64,AAAA", "https://example.com/page.html", "https://u:p@example.com/a.png", "not a url", "https://example.com/" + "a".repeat(600) + ".png"]) {
      expect(safeImageUrl(bad), bad).toBe(false);
    }
  });
});
