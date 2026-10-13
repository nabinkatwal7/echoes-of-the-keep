import { describe, expect, it } from "vitest";
import { checkCredentials, hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the right password and rejects others", () => {
    const hash = hashPassword("correct horse battery");
    expect(verifyPassword("correct horse battery", hash)).toBe(true);
    expect(verifyPassword("wrong password", hash)).toBe(false);
  });
  it("salts every hash", () => {
    expect(hashPassword("same password")).not.toBe(hashPassword("same password"));
  });
  it("rejects malformed or placeholder hashes", () => {
    expect(verifyPassword("x", "!")).toBe(false);
    expect(verifyPassword("x", "scrypt$1$2")).toBe(false);
  });
});

describe("checkCredentials", () => {
  it("normalises the username", () => {
    expect(checkCredentials("  Gandalf_1 ", "longenough")).toEqual({ ok: true, username: "gandalf_1" });
  });
  it("rejects bad usernames and short passwords", () => {
    expect(checkCredentials("ab", "longenough").ok).toBe(false);
    expect(checkCredentials("has space", "longenough").ok).toBe(false);
    expect(checkCredentials("a".repeat(25), "longenough").ok).toBe(false);
    expect(checkCredentials("valid_name", "short").ok).toBe(false);
  });
});
