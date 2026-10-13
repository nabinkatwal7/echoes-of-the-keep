import { z } from "zod";

export const alignmentSchema = z.object({
  index: z.string().regex(/^[a-z-]+$/),
  name: z.string().min(1),
  abbreviation: z.string().min(1).max(2),
  description: z.string().min(1),
  source: z.string().default("PHB"),
  page: z.number().int().optional(),
});

export type AlignmentInput = z.infer<typeof alignmentSchema>;
