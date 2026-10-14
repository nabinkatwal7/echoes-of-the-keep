import type { Ability, AbilityScores, Skill } from "@/engine/abilities";

/** A ready-made adventurer the computer can play: choices that are valid under the handbook's creation rules. */
export type Blueprint = {
  key: string;
  role: "tank" | "healer" | "striker" | "caster";
  classIndex: string;
  raceIndex: string;
  subraceIndex?: string;
  backgroundIndex: string;
  /** standard array already placed on abilities */
  scores: AbilityScores;
  classSkills: Skill[];
  /** chosen at the level the class asks for one */
  subclassIndex: string;
  /** ability that takes Ability Score Improvements */
  primary: Ability;
  secondary: Ability;
  names: string[];
  /** spell choices in order of preference; filled up to the class limits */
  cantrips: string[];
  spells: string[];
  /** a line each hero says as a fight starts, in character */
  battleCries: string[];
  /** and when someone is badly hurt */
  worried: string[];
};

const scores = (str: number, dex: number, con: number, int: number, wis: number, cha: number): AbilityScores => ({ str, dex, con, int, wis, cha });

export const BLUEPRINTS: Blueprint[] = [
  {
    key: "fighter", role: "tank", classIndex: "fighter", raceIndex: "human", backgroundIndex: "soldier", scores: scores(15, 13, 14, 8, 12, 10),
    classSkills: ["perception", "survival"], subclassIndex: "champion", primary: "str", secondary: "con",
    names: ["Brannoch Vale", "Tamsin Ironhart", "Edric Marrow", "Odalys Crane"], cantrips: [], spells: [],
    battleCries: ["Shields up. I will hold the line.", "Behind me. All of you.", "Let them come to me."], worried: ["I can stand a little longer.", "Cover me for a moment."],
  },
  {
    key: "cleric", role: "healer", classIndex: "cleric", raceIndex: "dwarf", subraceIndex: "hill-dwarf", backgroundIndex: "acolyte", scores: scores(13, 8, 14, 10, 15, 12),
    classSkills: ["history", "medicine"], subclassIndex: "life-domain", primary: "wis", secondary: "con",
    names: ["Sister Orla Fenn", "Brother Halden", "Mother Ysolde", "Pell Dunmore"], cantrips: ["sacred-flame", "guidance", "light"],
    spells: ["cure-wounds", "healing-word", "bless", "guiding-bolt", "shield-of-faith", "command", "inflict-wounds", "sanctuary", "spiritual-weapon", "lesser-restoration"],
    battleCries: ["Light, guide us!", "Stay close. I will mend what breaks.", "May the dawn favor us."], worried: ["Hold on, I am coming!", "Someone needs mending, quickly!"],
  },
  {
    key: "rogue", role: "striker", classIndex: "rogue", raceIndex: "halfling", subraceIndex: "lightfoot", backgroundIndex: "criminal", scores: scores(8, 15, 13, 12, 10, 14),
    classSkills: ["acrobatics", "perception", "sleight-of-hand", "investigation"], subclassIndex: "thief", primary: "dex", secondary: "con",
    names: ["Pip Thistlewick", "Nessa Quill", "Corrin Softfoot", "Wren Alder"], cantrips: [], spells: [],
    battleCries: ["Try not to look at me.", "Eyes on the big one. I will find a gap.", "Quietly now."], worried: ["That was close.", "I do not like those odds."],
  },
  {
    key: "wizard", role: "caster", classIndex: "wizard", raceIndex: "human", backgroundIndex: "sage", scores: scores(8, 14, 13, 15, 12, 10),
    classSkills: ["investigation", "medicine"], subclassIndex: "school-of-evocation", primary: "int", secondary: "dex",
    names: ["Mirela Voss", "Aldous Penn", "Isolde Marrin", "Cael Thorne"], cantrips: ["fire-bolt", "light", "mage-hand"],
    spells: ["magic-missile", "shield", "burning-hands", "sleep", "mage-armor", "thunderwave", "identify", "detect-magic", "scorching-ray", "misty-step", "fireball", "lightning-bolt"],
    battleCries: ["Stand clear, I am about to do something dramatic.", "Calculating angles.", "I did read about this."], worried: ["Keep them off me!", "My spells are running low."],
  },
  {
    key: "barbarian", role: "tank", classIndex: "barbarian", raceIndex: "half-orc", backgroundIndex: "folk-hero", scores: scores(15, 13, 14, 8, 12, 10),
    classSkills: ["athletics", "perception"], subclassIndex: "path-of-the-berserker", primary: "str", secondary: "con",
    names: ["Grask Thunderbrow", "Ulda Stonefist", "Brogan Redmane", "Hild Ashgrip"], cantrips: [], spells: [],
    battleCries: ["Now we are talking!", "Hah! More of them!", "Break them all!"], worried: ["Still standing!", "Is that all you have?"],
  },
  {
    key: "paladin", role: "tank", classIndex: "paladin", raceIndex: "human", backgroundIndex: "soldier", scores: scores(15, 8, 13, 10, 12, 14),
    classSkills: ["insight", "religion"], subclassIndex: "oath-of-devotion", primary: "str", secondary: "cha",
    names: ["Sir Aldric Vane", "Dame Rowena Hale", "Ser Tobias Wren", "Lady Isaura Pike"], cantrips: [],
    spells: ["bless", "cure-wounds", "shield-of-faith", "divine-favor", "command", "heroism", "protection-from-evil-and-good", "lesser-restoration"],
    battleCries: ["For those who cannot stand!", "Justice will be done.", "I will not yield."], worried: ["I will not fall here.", "Their strength is no match for conviction."],
  },
];

export const blueprintFor = (key: string) => BLUEPRINTS.find((b) => b.key === key);

/**
 * A balanced party of `size` heroes: always a front-liner and a healer, then a striker and a caster, then more front-liners.
 * `avoid` names classes the human already plays so the party is not a copy of them.
 */
export function pickBlueprints(size: number, avoid: string[] = [], rand: () => number = Math.random): Blueprint[] {
  const order = ["fighter", "cleric", "rogue", "wizard", "paladin", "barbarian"];
  const wanted = order.filter((k) => !avoid.includes(k));
  // keep the healer and a front-liner even if the human chose one of them, so the party can survive
  const chosen = wanted.slice(0, Math.max(0, size));
  while (chosen.length < size) chosen.push(order[Math.floor(rand() * order.length)]);
  return chosen.map((k) => blueprintFor(k)!);
}

/** A name not already used in the party. */
export function pickName(b: Blueprint, used: string[], rand: () => number = Math.random): string {
  const free = b.names.filter((n) => !used.includes(n));
  const pool = free.length ? free : b.names.map((n) => `${n} the Younger`);
  return pool[Math.floor(rand() * pool.length)];
}
