/** "13 (2d10 + 2)" -> 13 */
export const parseHitPoints = (text: string | null | undefined): number => {
  const m = /^(\d+)/.exec((text ?? "").trim());
  return m ? Number(m[1]) : 1;
};

/** "1/4 (50 XP)" -> 0.25, "2" -> 2 */
export function parseChallenge(text: string | null | undefined): number {
  const m = /^(\d+)(?:\/(\d+))?/.exec((text ?? "").trim());
  if (!m) return 0;
  return m[2] ? Number(m[1]) / Number(m[2]) : Number(m[1]);
}

export const hasFlying = (speed: string | null | undefined) => /fly/i.test(speed ?? "");
export const hasSwimming = (speed: string | null | undefined) => /swim/i.test(speed ?? "");

export type WildShapeLimits = { maxCr: number; noFlying: boolean; noSwimming: boolean };

/** Druid Wild Shape limits (PHB p.66): CR 1/4 and no flying or swimming at 2nd, CR 1/2 and no flying at 4th, CR 1 at 8th. Moon druids get more. */
export function wildShapeLimits(druidLevel: number, moon = false): WildShapeLimits | null {
  if (druidLevel < 2) return null;
  if (moon) {
    const maxCr = druidLevel >= 18 ? 6 : Math.floor(druidLevel / 3);
    return { maxCr: druidLevel < 6 ? 1 : maxCr, noFlying: druidLevel < 8, noSwimming: false };
  }
  return { maxCr: druidLevel >= 8 ? 1 : druidLevel >= 4 ? 0.5 : 0.25, noFlying: druidLevel < 8, noSwimming: druidLevel < 4 };
}

export type CreatureLike = { type: string; challenge: string | null; speed: string | null };

export function canWildShapeInto(creature: CreatureLike, druidLevel: number, moon = false): { ok: true } | { ok: false; reason: string } {
  const limits = wildShapeLimits(druidLevel, moon);
  if (!limits) return { ok: false, reason: "Wild Shape starts at 2nd-level druid" };
  if (!/^beast/i.test(creature.type)) return { ok: false, reason: "You can only Wild Shape into a beast" };
  if (parseChallenge(creature.challenge) > limits.maxCr) return { ok: false, reason: `Challenge rating is above your limit (${limits.maxCr})` };
  if (limits.noFlying && hasFlying(creature.speed)) return { ok: false, reason: "You cannot yet take a form with a flying speed" };
  if (limits.noSwimming && hasSwimming(creature.speed)) return { ok: false, reason: "You cannot yet take a form with a swimming speed" };
  return { ok: true };
}

/** Hours a druid can stay in a beast shape: half druid level, rounded down (min 1). */
export const wildShapeHours = (druidLevel: number) => Math.max(1, Math.floor(druidLevel / 2));

/**
 * Familiar (Find Familiar) forms allowed by the spell: bat, cat, crab, frog, hawk, lizard, octopus, owl, poisonous snake,
 * fish, rat, raven, sea horse, spider or weasel. Only those present in the handbook's Appendix D are selectable here.
 */
export const FAMILIAR_FORMS = ["bat", "cat", "frog", "hawk-falcon", "owl", "poisonous-snake", "rat", "raven"] as const;
export const isFamiliarForm = (creatureIndex: string) => (FAMILIAR_FORMS as readonly string[]).includes(creatureIndex);

/** Beast Master companion: a beast of CR 1/4 or lower (Ranger, PHB p.93). */
export const canBeBeastCompanion = (creature: CreatureLike) => /^beast/i.test(creature.type) && parseChallenge(creature.challenge) <= 0.25;
