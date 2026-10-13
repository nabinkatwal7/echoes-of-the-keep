import { prisma } from "@/lib/prisma";

export const getRuleChapters = async () => {
  const rows = await prisma.ruleSection.groupBy({ by: ["chapter", "chapterTitle"], _count: { _all: true }, _min: { position: true } });
  return rows.map((r) => ({ chapter: r.chapter, title: r.chapterTitle, sections: r._count._all }));
};

export const getRuleSections = (chapter: string) =>
  prisma.ruleSection.findMany({ where: { chapter }, orderBy: { position: "asc" } });
