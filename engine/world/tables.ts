import { cryptoRng, type Rng } from "@/engine/dice";

export type TableEntry = { text: string; weight: number };

/**
 * Entries typed one per line. "3 | A tavern brawl" gives that line three times the chance; a line with no number counts once.
 * Blank lines are skipped and each line is cut to 200 characters.
 */
export function parseEntries(input: string): TableEntry[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = /^(\d{1,3})\s*\|\s*(.+)$/.exec(line);
      return m ? { weight: Math.max(1, Number(m[1])), text: m[2].trim().slice(0, 200) } : { weight: 1, text: line.slice(0, 200) };
    });
}

export const entriesToText = (entries: TableEntry[]) => entries.map((e) => (e.weight > 1 ? `${e.weight} | ${e.text}` : e.text)).join("\n");

/** Pick one entry by weight. Returns the entry and its 1-based position in the list. */
export function rollTable(entries: TableEntry[], rng: Rng = cryptoRng): { entry: TableEntry; index: number } {
  if (!entries.length) throw new Error("The table is empty");
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let pick = Math.floor(rng() * total);
  for (let i = 0; i < entries.length; i++) {
    if (pick < entries[i].weight) return { entry: entries[i], index: i + 1 };
    pick -= entries[i].weight;
  }
  return { entry: entries[entries.length - 1], index: entries.length };
}

/** Chance of each entry, as whole percentages for display. */
export const oddsOf = (entries: TableEntry[]) => {
  const total = entries.reduce((s, e) => s + e.weight, 0) || 1;
  return entries.map((e) => Math.round((e.weight / total) * 100));
};

/** Small starter tables in original wording, so a new campaign has something to roll on. */
export const STARTER_TABLES: { name: string; entries: TableEntry[] }[] = [
  {
    name: "Tavern rumors",
    entries: [
      "A merchant swears the old mill road is haunted after dark.",
      "The miller's daughter left town with a stranger and has not written.",
      "Someone is paying double for wolf pelts, no questions asked.",
      "The bridge toll doubled last week and nobody will say why.",
      "A hooded traveler asked about the crypt beneath the chapel.",
      "The baron's guards have stopped patrolling the east gate.",
      "Prices of salt and lamp oil keep climbing.",
      "An old map is being sold in the market, and it may be real.",
    ].map((text) => ({ text, weight: 1 })),
  },
  {
    name: "Wilderness encounters",
    entries: [
      { text: "A pack of wolves trails the party at a distance.", weight: 3 },
      { text: "A lone traveler on the road, nervous and watching the trees.", weight: 3 },
      { text: "Fresh tracks of something large cross the path.", weight: 2 },
      { text: "A broken wagon with no driver and no horses.", weight: 2 },
      { text: "A patrol of the local lord's soldiers asks for the party's business.", weight: 2 },
      { text: "Bandits wait in ambush at a narrow place in the road.", weight: 1 },
      { text: "A sudden storm forces the party to find shelter.", weight: 1 },
    ],
  },
  {
    name: "Small treasure",
    entries: [
      { text: "A handful of copper and silver coins (2d6 sp).", weight: 4 },
      { text: "A small pouch of gold coins (3d6 gp).", weight: 3 },
      { text: "A tarnished silver ring worth 10 gp.", weight: 2 },
      { text: "A glass vial holding a healing draught.", weight: 1 },
      { text: "A carved ivory figurine worth 25 gp.", weight: 1 },
      { text: "A sealed letter addressed to someone the party may know.", weight: 1 },
    ],
  },
  {
    name: "Quirks for a new NPC",
    entries: [
      "Speaks very softly, and leans in to be heard.",
      "Constantly counts something: coins, steps, ceiling beams.",
      "Calls everyone by a nickname, never their real name.",
      "Cannot stand silence and fills every pause.",
      "Always has a snack in hand and offers to share.",
      "Tells every story as though it happened to a cousin.",
      "Nervously fixes their clothes while talking.",
      "Laughs at the wrong moments, then apologizes.",
    ].map((text) => ({ text, weight: 1 })),
  },
];
