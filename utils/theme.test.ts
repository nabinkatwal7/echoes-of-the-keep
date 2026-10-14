import { describe, expect, it } from "vitest";
import { parsePref, resolveTheme } from "./theme";

describe("theme preference", () => {
  it("an explicit choice wins over the device", () => {
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("dark", true)).toBe("dark");
  });
  it("auto follows the device", () => {
    expect(resolveTheme("system", true)).toBe("light");
    expect(resolveTheme("system", false)).toBe("dark");
  });
  it("ignores junk in storage", () => {
    expect(parsePref("light")).toBe("light");
    expect(parsePref("purple")).toBe("system");
    expect(parsePref(null)).toBe("system");
  });
});
