import { describe, expect, it } from "vitest";
import { importers } from "./importers";

describe("importers", () => {
  it.each(importers.map((i) => [i.name, i] as const))("%s source data validates", (_name, importer) => {
    expect(importer.load().length).toBeGreaterThan(0);
  });

  it("has all nine alignments", () => {
    const alignments = importers.find((i) => i.name === "alignments")!.load();
    expect(alignments).toHaveLength(9);
  });
});
