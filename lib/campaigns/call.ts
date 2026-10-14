/** The voice or video call link a DM shares with the table. Stored in the campaign settings. */

const MAX_LENGTH = 300;

/** A plain https link, or null. Anything else (javascript:, data:, http:, a bare word) is refused. */
export function safeCallUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw || raw.length > MAX_LENGTH) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !url.hostname.includes(".") || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function callLinkOf(settings: unknown): string | null {
  const s = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {};
  return typeof s.callUrl === "string" ? safeCallUrl(s.callUrl) : null;
}

/** A short name for the button: "Discord", "Google Meet", "Zoom", or the host. */
export function callProvider(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host.endsWith("discord.gg") || host.endsWith("discord.com")) return "Discord";
  if (host === "meet.google.com") return "Google Meet";
  if (host.endsWith("zoom.us")) return "Zoom";
  if (host.endsWith("teams.microsoft.com") || host.endsWith("teams.live.com")) return "Teams";
  if (host === "meet.jit.si") return "Jitsi";
  if (host.endsWith("whereby.com")) return "Whereby";
  return host;
}

/** A free Jitsi room needs no account. The name is random so strangers cannot guess it. */
export function newJitsiRoom(campaignName: string, random: string): string {
  const slug = campaignName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16) || "table";
  return `https://meet.jit.si/dnd-${slug}-${random}`;
}
