import { z } from "zod";

const base = {
  index: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  pdfPages: z.array(z.number().int()).default([]),
  source: z.string().default("PHB"),
};

export const conditionSchema = z.object({ ...base, description: z.string().min(10) });

export const featSchema = z.object({
  ...base,
  prerequisite: z.string().nullable().default(null),
  description: z.string().min(20),
});

export const backgroundSchema = z.object({
  ...base,
  skillProficiencies: z.string().nullable(),
  toolProficiencies: z.string().nullable(),
  languages: z.string().nullable(),
  equipment: z.string().nullable(),
  featureName: z.string().nullable(),
  text: z.string().min(50),
});

export const spellSchema = z.object({
  index: base.index,
  name: base.name,
  level: z.number().int().min(0).max(9),
  school: z.enum(["abjuration", "conjuration", "divination", "enchantment", "evocation", "illusion", "necromancy", "transmutation"]),
  ritual: z.boolean(),
  concentration: z.boolean(),
  castingTime: z.string().min(1),
  range: z.string().min(1),
  components: z.string().min(1),
  duration: z.string().min(1),
  description: z.string().min(10),
  higherLevels: z.string().default(""),
  classes: z.array(z.enum(["Bard", "Cleric", "Druid", "Paladin", "Ranger", "Sorcerer", "Warlock", "Wizard"])).min(1),
  source: base.source,
});

export const raceSchema = z.object({
  ...base,
  traits: z.array(z.object({ name: z.string().min(1), description: z.string().min(1) })),
  text: z.string(),
});

export const classSchema = z.object({
  ...base,
  hitDie: z.number().int().refine((n) => [6, 8, 10, 12].includes(n), "hit die must be d6/d8/d10/d12"),
  proficiencies: z.record(z.string(), z.string().nullable()),
  levelTable: z
    .array(z.object({ level: z.number().int().min(1).max(20), proficiencyBonus: z.string(), columns: z.string() }))
    .length(20),
  text: z.string().min(100),
});
