import { describe, expect, it } from "vitest";
import { parseEnv } from "../env";

const valid = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/dnd",
  AUTH_SECRET: "a-secret-that-is-long-enough",
};

describe("parseEnv", () => {
  it("accepts a minimal valid environment and applies defaults", () => {
    expect(parseEnv(valid).CONTENT_LICENSE_MODE).toBe("FULL");
  });

  it("lists every problem when variables are missing", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL[\s\S]*AUTH_SECRET/);
  });

  it("rejects an unknown license mode", () => {
    expect(() => parseEnv({ ...valid, CONTENT_LICENSE_MODE: "ALL" })).toThrow(/CONTENT_LICENSE_MODE/);
  });
});
