import { describe, expect, it } from "vitest";
import {
  emptyPurse,
  fromCopper,
  lifestyleCostCp,
  parseCostCp,
  pay,
  purseValueCp,
  sellPriceCp,
  splitLoot,
} from "./index";

describe("coins", () => {
  it("converts between denominations", () => {
    expect(purseValueCp({ cp: 5, sp: 1, ep: 1, gp: 1, pp: 1 })).toBe(5 + 10 + 50 + 100 + 1000);
    expect(parseCostCp("25 gp")).toBe(2500);
    expect(parseCostCp("1,500 gp")).toBe(150000);
    expect(parseCostCp("5 cp")).toBe(5);
    expect(() => parseCostCp("free")).toThrow();
  });
  it("converts copper to the largest coins", () => {
    expect(fromCopper(1234)).toEqual({ cp: 4, sp: 3, ep: 0, gp: 2, pp: 1 });
    expect(fromCopper(150, true)).toEqual({ cp: 0, sp: 0, ep: 1, gp: 1, pp: 0 });
  });
});

describe("paying and splitting", () => {
  it("makes change", () => {
    const purse = { ...emptyPurse(), gp: 10 };
    expect(pay(purse, 250)).toEqual(fromCopper(750));
  });
  it("refuses when funds are short", () => {
    expect(() => pay({ ...emptyPurse(), sp: 5 }, 100)).toThrow(/Not enough/);
  });
  it("splits evenly and keeps the remainder", () => {
    const { share, remainderCp } = splitLoot({ ...emptyPurse(), gp: 10, sp: 2, cp: 1 }, 3);
    expect(purseValueCp(share)).toBe(340);
    expect(remainderCp).toBe(1);
  });
});

describe("lifestyle and selling", () => {
  it("charges per day", () => {
    expect(lifestyleCostCp("modest", 7)).toBe(700);
    expect(lifestyleCostCp("wretched", 30)).toBe(0);
    expect(lifestyleCostCp("aristocratic", 1)).toBe(1000);
  });
  it("gear sells for half, valuables for full price", () => {
    expect(sellPriceCp(1500)).toBe(750);
    expect(sellPriceCp(1500, "valuable")).toBe(1500);
  });
});
