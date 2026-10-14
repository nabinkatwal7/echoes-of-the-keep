import { describe, expect, it } from "vitest";
import { callLinkOf, callProvider, newJitsiRoom, safeCallUrl } from "./call";

describe("call links", () => {
  it("accepts plain https links and refuses everything else", () => {
    expect(safeCallUrl("https://meet.google.com/abc-defg-hij")).toBe("https://meet.google.com/abc-defg-hij");
    expect(safeCallUrl("  https://discord.gg/xyz  ")).toBe("https://discord.gg/xyz");
    for (const bad of ["", "http://example.com/x", "javascript:alert(1)", "data:text/html,hi", "discord.gg/xyz", "https://localhost/x", "https://user:pw@example.com/x", "https://" + "a".repeat(400) + ".com"]) {
      expect(safeCallUrl(bad), bad).toBeNull();
    }
  });
  it("reads the link from campaign settings and ignores a bad one", () => {
    expect(callLinkOf({ callUrl: "https://zoom.us/j/123" })).toBe("https://zoom.us/j/123");
    expect(callLinkOf({ callUrl: "javascript:alert(1)" })).toBeNull();
    expect(callLinkOf({})).toBeNull();
    expect(callLinkOf(null)).toBeNull();
  });
  it("names the provider", () => {
    expect(callProvider("https://discord.com/channels/1/2")).toBe("Discord");
    expect(callProvider("https://us02web.zoom.us/j/1")).toBe("Zoom");
    expect(callProvider("https://meet.jit.si/room")).toBe("Jitsi");
    expect(callProvider("https://example.org/room")).toBe("example.org");
  });
  it("builds an unguessable free room name", () => {
    expect(newJitsiRoom("The Sunken Crypt!", "k3j9x2")).toBe("https://meet.jit.si/dnd-thesunkencrypt-k3j9x2");
    expect(newJitsiRoom("!!!", "ab")).toBe("https://meet.jit.si/dnd-table-ab");
  });
});
