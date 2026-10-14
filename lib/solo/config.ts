/** What makes a campaign a solo game, stored under `settings.solo`. */
export type SoloConfig = {
  /** the one person playing */
  humanId: string;
  /** "player": a computer Dungeon Master runs the world. "dm": the person runs it and computer heroes fill the party. */
  mode: "player" | "dm";
  /** in DM mode, let the computer play the monsters too when asked */
  autoMonsters: boolean;
  /** the computer Dungeon Master's account (player mode) */
  botDmId: string | null;
  /** bot heroes' accounts */
  botIds: string[];
  theme: string;
};

export const THEMES = ["crypt", "wilds", "bandits", "caves"] as const;
export type Theme = (typeof THEMES)[number];

export function readSolo(settings: unknown): SoloConfig | null {
  const s = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {};
  const v = s.solo && typeof s.solo === "object" ? (s.solo as Record<string, unknown>) : null;
  if (!v || typeof v.humanId !== "string" || (v.mode !== "player" && v.mode !== "dm")) return null;
  return {
    humanId: v.humanId,
    mode: v.mode,
    autoMonsters: v.autoMonsters === true,
    botDmId: typeof v.botDmId === "string" ? v.botDmId : null,
    botIds: Array.isArray(v.botIds) ? v.botIds.filter((x): x is string => typeof x === "string") : [],
    theme: typeof v.theme === "string" ? v.theme : "crypt",
  };
}

export type Controller = { who: "human" } | { who: "ai-dm"; userId: string } | { who: "bot"; userId: string };

/**
 * Who decides this combatant's turn. Heroes belong to whoever owns them; monsters and other non-heroes belong to the Dungeon Master,
 * which is a computer in "player" mode and the person in "dm" mode unless they asked the computer to play monsters.
 */
export function controllerOf(solo: SoloConfig | null, c: { kind: string; characterOwnerId: string | null }, dmUserId: string): Controller {
  if (!solo) return { who: "human" };
  if (c.kind === "character" && c.characterOwnerId) {
    return c.characterOwnerId === solo.humanId ? { who: "human" } : { who: "bot", userId: c.characterOwnerId };
  }
  if (solo.mode === "player") return { who: "ai-dm", userId: solo.botDmId ?? dmUserId };
  return solo.autoMonsters ? { who: "ai-dm", userId: dmUserId } : { who: "human" };
}
