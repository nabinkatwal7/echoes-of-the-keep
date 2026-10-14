import { describe, expect, it } from "vitest";
import { HOLD_MS, WINDOW_MS, holdExpired, isThrottled } from "./throttle";

describe("login throttle", () => {
  it("locks after 5 failures inside the window and forgets them after", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    expect(isThrottled(4, start, start.getTime() + 1000)).toBe(false);
    expect(isThrottled(5, start, start.getTime() + 1000)).toBe(true);
    expect(isThrottled(5, start, start.getTime() + WINDOW_MS + 1)).toBe(false);
  });
  it("keeps a deleted account for 14 days", () => {
    const deleted = new Date("2026-01-01T00:00:00Z");
    expect(holdExpired(deleted, deleted.getTime() + HOLD_MS)).toBe(false);
    expect(holdExpired(deleted, deleted.getTime() + HOLD_MS + 1)).toBe(true);
  });
});