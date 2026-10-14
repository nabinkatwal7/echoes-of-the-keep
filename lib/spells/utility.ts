/**
 * Spells whose useful result is a fact the table can act on. Damage and conditions are resolved elsewhere;
 * these lines are what the players are allowed to do because the spell was cast.
 */
export const UTILITY_SPELLS: Record<string, string> = {
  light: "The object sheds bright light in a 20-foot radius and dim light for 20 feet beyond that, for 1 hour. Covering it blocks the light.",
  darkness: "Magical darkness fills a 15-foot-radius sphere for 10 minutes (concentration). Darkvision cannot see through it, and nonmagical light cannot light it.",
  "misty-step": "You teleport up to 30 feet to an unoccupied space you can see. This is a bonus action.",
  knock: "One locked door, chest or set of restraints is unlocked. The knock is audible out to 300 feet.",
  "detect-magic": "For 10 minutes (concentration) you sense magic within 30 feet. Using your action, you learn the school of one effect.",
  "speak-with-animals": "For 10 minutes you can talk with beasts. They can be understood, and they are not compelled to be friendly.",
};
