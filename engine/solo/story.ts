/** The computer Dungeon Master's narration. Short, original, and shaped by the theme and what the party faces. */

export type Rand = () => number;
const pick = <T>(list: readonly T[], rand: Rand): T => list[Math.floor(rand() * list.length)];

export const SCENES = ["intro", "fight-1", "rest-1", "fight-2", "rest-2", "boss", "epilogue"] as const;
export type SceneKind = (typeof SCENES)[number];

const PLACES: Record<string, string[]> = {
  crypt: ["the Hollow Chapel", "the Barrow of Saint Veld", "the Drowned Vault", "the Ashen Mausoleum"],
  wilds: ["the Thornwood", "the Greymarsh road", "the Stag Ridge trail", "the Whispering Dales"],
  bandits: ["the Black Fen toll road", "the abandoned mill at Corrow", "the Smuggler's Stair", "the old watchtower on Kestrel Hill"],
  caves: ["the Chimney Caves", "the Deepgutter tunnels", "the old silver mine at Brask", "the Warrens of Kell"],
};
const PATRONS = ["an anxious village reeve", "a retired captain with a limp", "a traveling merchant who has lost three wagons", "a priest with ink-stained fingers", "a ranger who will not give a name"];

const HOOKS: Record<string, string[]> = {
  crypt: ["Lights have been seen moving under {place} at night, and the dead do not stay where they are buried.", "Grave robbers went into {place} last month. Only one came out, and he will not speak.", "The bells of {place} ring by themselves at midnight."],
  wilds: ["Livestock and then travelers have gone missing near {place}, and the tracks are wrong for any beast the locals know.", "A hunting party followed something into {place} and has not returned.", "The animals around {place} have gone strangely bold, and the villagers are afraid."],
  bandits: ["A band has taken {place} and every caravan that passes pays or vanishes.", "The local lord's tax wagon was lost near {place}, and someone inside the guard is helping.", "Rumor says the leader of the gang keeps a ledger of whom he has bribed. It is somewhere near {place}."],
  caves: ["Something is driving creatures out of {place}, and the surface has begun to feel it.", "Miners at {place} sealed a tunnel and will not say what they heard behind it.", "Small raids on the farms trace back to {place}, and each one is bolder than the last."],
};

const INTRO = [
  "{patron} finds the party at the end of a long day. \"{hook}\" The reward is modest, but the need is real. The party sets out at first light.",
  "Word reaches the party through {patron}. \"{hook}\" By dusk the road to {place} is behind them, and the air has changed.",
];

const FIGHT_OPEN = [
  "The way ahead narrows, and then you are not alone. {foes} come out of the dark.",
  "A sound makes everyone stop. {foes} close in from all sides.",
  "There is no time to plan. {foes} are upon you.",
  "{foes} wait ahead, and they have clearly been expecting company.",
];
const BOSS_OPEN = [
  "The final chamber opens before you, and this is plainly the heart of the trouble. {foes} turn to face you.",
  "Whatever has been behind all of this is here. {foes} bar the way forward.",
];

const WIN = [
  "The last of them falls, and for a moment the only sound is breathing. Nothing else moves.",
  "Silence returns. It is the good kind.",
  "It is over. Everyone is still standing, and that counts for something.",
];

const REST_LINES = [
  "The party takes a few minutes to bind wounds and share water. {found}",
  "Everyone finds a corner to catch their breath. {found}",
];

const FOUND = [
  "Among the wreckage is {loot}.",
  "A quick search turns up {loot}.",
  "Tucked behind a loose stone, the party finds {loot}.",
];

const EPILOGUE = [
  "With the danger ended, the road home is quiet. {patron} keeps the promise of payment and spreads the word. The party has earned some rest, and a little more renown.",
  "The tale is told in the tavern that night, a little larger each time. The party has done what they came to do.",
];

const DEFEAT = [
  "The world goes dark. Some time later the party wakes at the edge of the place they fought, bruised and humbled. Someone dragged them out. They are alive, and they know what to expect next.",
];

export const lootTable = ["a handful of coins", "a small purse of silver", "a battered but useful tool kit", "a stub of candle and a folded note", "a silver ring that is worth something", "a pair of well-kept daggers", "a vial that smells faintly of mint"];

export function titleFor(theme: string, chapter: number, rand: Rand): string {
  const place = pick(PLACES[theme] ?? PLACES.crypt, rand);
  return `Chapter ${chapter}: ${place.replace(/^the /i, "The ").replace(/^The /, "The ")}`;
}

export function placeFor(theme: string, rand: Rand): string {
  return pick(PLACES[theme] ?? PLACES.crypt, rand);
}

const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

/** "Wolf" -> "Wolves", "Swarm of Ravens" -> "Swarms of Ravens", "Giant Spider" -> "Giant Spiders". */
export function plural(name: string): string {
  const swarm = /^(Swarm) of (.+)$/.exec(name);
  if (swarm) return `Swarms of ${swarm[2]}`;
  if (/(s|x|ch|sh)$/i.test(name)) return `${name}es`;
  if (/fe$/i.test(name)) return `${name.slice(0, -2)}ves`;
  if (/f$/i.test(name)) return `${name.slice(0, -1)}ves`;
  if (/[^aeiou]y$/i.test(name)) return `${name.slice(0, -1)}ies`;
  return `${name}s`;
}

export const foeList = (names: { name: string; count: number }[]) => {
  const parts = names.map((n) => (n.count === 1 ? `${/^[aeiou]/i.test(n.name) ? "an" : "a"} ${n.name}` : `${n.count} ${plural(n.name)}`));
  return parts.length <= 1 ? parts[0] ?? "enemies" : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
};

/** Start every sentence with a capital, including when a list of foes opens one. */
const sentences = (s: string) => s.replace(/(^|[.!?]["']?\s+)([a-z])/g, (_, lead: string, c: string) => lead + c.toUpperCase());

export function narrate(kind: SceneKind | "victory" | "defeat", theme: string, rand: Rand, vars: { place?: string; foes?: string; loot?: string } = {}): string {
  return sentences(narrateRaw(kind, theme, rand, vars));
}

function narrateRaw(kind: SceneKind | "victory" | "defeat", theme: string, rand: Rand, vars: { place?: string; foes?: string; loot?: string }): string {
  const place = vars.place ?? placeFor(theme, rand);
  switch (kind) {
    case "intro":
      return fill(pick(INTRO, rand), { patron: pick(PATRONS, rand), hook: fill(pick(HOOKS[theme] ?? HOOKS.crypt, rand), { place }), place });
    case "fight-1":
    case "fight-2":
      return fill(pick(FIGHT_OPEN, rand), { foes: vars.foes ?? "enemies" });
    case "boss":
      return fill(pick(BOSS_OPEN, rand), { foes: vars.foes ?? "enemies" });
    case "victory":
      return pick(WIN, rand);
    case "rest-1":
    case "rest-2":
      return fill(pick(REST_LINES, rand), { found: fill(pick(FOUND, rand), { loot: vars.loot ?? "very little" }) });
    case "epilogue":
      return fill(pick(EPILOGUE, rand), { patron: pick(PATRONS, rand) });
    case "defeat":
      return pick(DEFEAT, rand);
  }
}
