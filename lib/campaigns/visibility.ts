export type Viewer = { userId: string; isDm: boolean };
export type EventLike = { actorId: string | null; audience: string };

/**
 * Who may see an event. Audience is `ALL`, `DM` (DM-only, e.g. secret rolls), or `USER:<id>` (whisper).
 * Actors always see their own events; the DM sees everything except whispers between two players.
 */
export function canSee(event: EventLike, viewer: Viewer): boolean {
  if (event.audience === "ALL") return true;
  if (event.actorId && event.actorId === viewer.userId) return true;
  if (event.audience === "DM") return viewer.isDm;
  if (event.audience.startsWith("USER:")) return event.audience === `USER:${viewer.userId}`;
  return false;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

/** Random invite code, e.g. "K7QF2XMA". */
export function newInviteCode(length = 8, rand: () => number = Math.random): string {
  return Array.from({ length }, () => CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)]).join("");
}
