import { z } from "zod";

export const ruleSectionSchema = z.object({
  id: z.string().min(1),
  chapter: z.string().min(1),
  chapterTitle: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  body: z.string().min(1),
  position: z.number().int().nonnegative(),
  source: z.string().default("PHB"),
  pdfPage: z.number().int().nullable().default(null),
});

export const subclassSchema = z.object({
  index: z.string().regex(/^[a-z0-9-]+$/),
  classIndex: z.string().min(1),
  name: z.string().min(1),
  text: z.string().min(100),
  source: z.string().default("PHB"),
  pdfPage: z.number().int().nullable().default(null),
});
