/** PHB subclasses ("archetypes") by class, and the level each class chooses one (PHB Ch.3). */
export const SUBCLASS_LEVEL: Record<string, number> = {
  barbarian: 3, bard: 3, cleric: 1, druid: 2, fighter: 3, monk: 3,
  paladin: 3, ranger: 3, rogue: 3, sorcerer: 1, warlock: 1, wizard: 2,
};

/** [class, display name]; the index is the slugged name. */
export const SUBCLASS_NAMES: [string, string][] = [
  ["barbarian", "Path of the Berserker"], ["barbarian", "Path of the Totem Warrior"],
  ["bard", "College of Lore"], ["bard", "College of Valor"],
  ["cleric", "Knowledge Domain"], ["cleric", "Life Domain"], ["cleric", "Light Domain"], ["cleric", "Nature Domain"],
  ["cleric", "Tempest Domain"], ["cleric", "Trickery Domain"], ["cleric", "War Domain"],
  ["druid", "Circle of the Land"], ["druid", "Circle of the Moon"],
  ["fighter", "Champion"], ["fighter", "Battle Master"], ["fighter", "Eldritch Knight"],
  ["monk", "Way of the Open Hand"], ["monk", "Way of Shadow"], ["monk", "Way of the Four Elements"],
  ["paladin", "Oath of Devotion"], ["paladin", "Oath of the Ancients"], ["paladin", "Oath of Vengeance"],
  ["ranger", "Hunter"], ["ranger", "Beast Master"],
  ["rogue", "Thief"], ["rogue", "Assassin"], ["rogue", "Arcane Trickster"],
  ["sorcerer", "Draconic Bloodline"], ["sorcerer", "Wild Magic"],
  ["warlock", "The Archfey"], ["warlock", "The Fiend"], ["warlock", "The Great Old One"],
  ["wizard", "School of Abjuration"], ["wizard", "School of Conjuration"], ["wizard", "School of Divination"],
  ["wizard", "School of Enchantment"], ["wizard", "School of Evocation"], ["wizard", "School of Illusion"],
  ["wizard", "School of Necromancy"], ["wizard", "School of Transmutation"],
];

export const subclassSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export type SubclassInfo = { index: string; name: string; classIndex: string };

export const SUBCLASSES: SubclassInfo[] = SUBCLASS_NAMES.map(([classIndex, name]) => ({ index: subclassSlug(name), name, classIndex }));

export const subclassesFor = (classIndex: string): SubclassInfo[] => SUBCLASSES.filter((s) => s.classIndex === classIndex);

export const isSubclassOf = (subclassIndex: string, classIndex: string) =>
  SUBCLASSES.some((s) => s.index === subclassIndex && s.classIndex === classIndex);

/** Does gaining class level `newLevel` require choosing a subclass? */
export const subclassDueAt = (classIndex: string, newLevel: number) => SUBCLASS_LEVEL[classIndex] === newLevel;
