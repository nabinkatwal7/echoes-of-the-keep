import { describe, expect, it } from "vitest";
import { combineHouseRules, isFlanking, readHouseRules } from "./houseRules";

describe("house rules", () => {
  it("keeps the book defaults when a campaign has no settings", () => {
    expect(readHouseRules({})).toEqual({ multiclass: true, feats: true, flanking: false });
    expect(readHouseRules({ multiclass: false, feats: false, flanking: true })).toEqual({ multiclass: false, feats: false, flanking: true });
  });

  it("hides multiclass and feats if any campaign turned them off", () => {
    const combined = combineHouseRules([readHouseRules({}), readHouseRules({ multiclass: false })]);
    expect(combined.multiclass).toBe(false);
    expect(combined.feats).toBe(true);
  });

  it("flanks from the opposite side and the opposite corner", () => {
    expect(isFlanking({ x: 1, y: 1 }, { x: 2, y: 1 }, [{ x: 3, y: 1 }])).toBe(true);
    expect(isFlanking({ x: 1, y: 1 }, { x: 2, y: 2 }, [{ x: 3, y: 3 }])).toBe(true);
    expect(isFlanking({ x: 1, y: 1 }, { x: 2, y: 1 }, [{ x: 2, y: 2 }])).toBe(false);
  });
});
