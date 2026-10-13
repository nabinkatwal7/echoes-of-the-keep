import { parseDice } from "@/engine/dice";

export type ParsedMessage =
  | { kind: "chat"; text: string; audience: "ALL" }
  | { kind: "emote"; text: string }
  | { kind: "roll"; expression: string; reason: string; secret: boolean }
  | { kind: "whisper-dm"; text: string }
  | { kind: "whisper-player"; to: string; text: string }
  | { kind: "error"; message: string };

/**
 * Chat input to an action.
 *   /roll 2d6+3 [reason]   public roll
 *   /gmroll 1d20           roll only the DM sees (DMs only; enforced by the caller)
 *   /me waves              emote
 *   /w dm message          whisper to the DM
 *   /w name message        whisper to another player (by username or display name without spaces)
 */
export function parseMessage(input: string): ParsedMessage {
  const text = input.trim();
  if (!text) return { kind: "error", message: "Message is empty" };
  if (!text.startsWith("/")) return { kind: "chat", text, audience: "ALL" };

  const [cmd, ...rest] = text.split(/\s+/);
  const args = rest.join(" ");
  switch (cmd.toLowerCase()) {
    case "/roll":
    case "/r":
    case "/gmroll": {
      const m = /^(\S+)\s*(.*)$/.exec(args);
      if (!m) return { kind: "error", message: "Usage: /roll 2d6+3 [reason]" };
      try {
        parseDice(m[1]);
      } catch {
        return { kind: "error", message: `Invalid dice expression: ${m[1]}` };
      }
      return { kind: "roll", expression: m[1], reason: m[2], secret: cmd.toLowerCase() === "/gmroll" };
    }
    case "/me":
      return args ? { kind: "emote", text: args } : { kind: "error", message: "Usage: /me waves" };
    case "/w":
    case "/whisper": {
      const m = /^(\S+)\s+(.+)$/.exec(args);
      if (!m) return { kind: "error", message: "Usage: /w name message (or /w dm message)" };
      return m[1].toLowerCase() === "dm" ? { kind: "whisper-dm", text: m[2] } : { kind: "whisper-player", to: m[1], text: m[2] };
    }
    default:
      return { kind: "error", message: `Unknown command ${cmd}` };
  }
}
