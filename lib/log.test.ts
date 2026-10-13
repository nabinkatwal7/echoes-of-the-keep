import { afterEach, describe, expect, it, vi } from "vitest";
import { log } from "./log";

describe("structured logging", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.LOG_LEVEL;
  });
  it("writes one JSON line with the fields", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log("info", "hello", { user: "u1" });
    const line = JSON.parse(spy.mock.calls[0][0] as string);
    expect(line).toMatchObject({ level: "info", message: "hello", user: "u1" });
    expect(typeof line.time).toBe("string");
  });
  it("hides debug lines unless asked and routes errors to stderr", () => {
    const out = vi.spyOn(console, "log").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    log("debug", "quiet");
    expect(out).not.toHaveBeenCalled();
    process.env.LOG_LEVEL = "debug";
    log("debug", "loud");
    expect(out).toHaveBeenCalledTimes(1);
    log("error", "boom");
    expect(err).toHaveBeenCalledTimes(1);
  });
});
