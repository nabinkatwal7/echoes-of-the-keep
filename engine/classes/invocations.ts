/** PHB eldritch invocations the sheet can record. Agonizing Blast is applied to eldritch blast; the rest are noted. */
export const INVOCATION_OPTIONS = [
  "agonizing-blast", "armor-of-shadows", "beast-speech", "beguiling-influence", "devils-sight",
  "eldritch-sight", "eyes-of-the-rune-keeper", "fiendish-vigor", "mask-of-many-faces", "misty-visions",
  "repelling-blast", "thief-of-five-fates",
] as const;

/** Invocations known: 2 at 2nd level, then one more at 5, 7, 9, 12, 15 and 18. */
export const invocationSlots = (level: number) =>
  level >= 18 ? 8 : level >= 15 ? 7 : level >= 12 ? 6 : level >= 9 ? 5 : level >= 7 ? 4 : level >= 5 ? 3 : level >= 2 ? 2 : 0;
