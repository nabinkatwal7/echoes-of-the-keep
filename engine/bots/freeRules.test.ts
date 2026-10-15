import { describe, expect, it } from "vitest";
import { CLASS_RULES } from "@/engine/classes/rules";
import { BLUEPRINTS } from "./blueprints";
import { FREE_RULES_BACKGROUND, forFreeRules } from "./freeRules";

describe("computer heroes in the free-rules build", () => {
  it("leaves a hero alone when its background is allowed", () => {
    const cleric = BLUEPRINTS.find((b) => b.backgroundIndex === "acolyte")!;
    expect(forFreeRules(cleric, ["acolyte"])).toBe(cleric);
  });
  it("gives every ready-made hero the Acolyte background and valid, non-overlapping class skills", () => {
    for (const bp of BLUEPRINTS) {
      const free = forFreeRules(bp, ["acolyte"]);
      expect(free.backgroundIndex).toBe("acolyte");
      expect(free.classSkills).toHaveLength(CLASS_RULES[bp.classIndex].skillChoices.count);
      expect(new Set(free.classSkills).size).toBe(free.classSkills.length);
      for (const s of free.classSkills) expect(FREE_RULES_BACKGROUND.skills).not.toContain(s);
      const from = CLASS_RULES[bp.classIndex].skillChoices.from;
      if (from !== "any") for (const s of free.classSkills) expect(from).toContain(s);
    }
  });
});

describe("free-rules legality of the whole blueprint", () => {
  it("every race, subrace, background and subclass is in the SRD", async () => {
    const { allowed } = await import("@/lib/srd");
    const prev = process.env.CONTENT_LICENSE_MODE;
    process.env.CONTENT_LICENSE_MODE = "SRD_ONLY";
    try {
      for (const bp of BLUEPRINTS) {
        const free = forFreeRules(bp, ["acolyte"]);
        expect(allowed("race", free.raceIndex), `${bp.key} race`).toBe(true);
        if (free.subraceIndex) expect(allowed("race", free.subraceIndex), `${bp.key} subrace`).toBe(true);
        expect(allowed("background", free.backgroundIndex), `${bp.key} background`).toBe(true);
        expect(allowed("subclass", free.subclassIndex), `${bp.key} subclass`).toBe(true);
      }
    } finally {
      if (prev === undefined) delete process.env.CONTENT_LICENSE_MODE;
      else process.env.CONTENT_LICENSE_MODE = prev;
    }
  });
});
