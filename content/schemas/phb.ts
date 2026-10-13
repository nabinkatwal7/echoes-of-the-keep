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
