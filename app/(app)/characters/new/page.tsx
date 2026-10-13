import { parseSkillList } from "@/engine/classes/rules";
import { requireUser } from "@/lib/auth";
import { BASE_RACES, SUBRACES } from "@/lib/rules/race";
import { prisma } from "@/lib/prisma";
import { CreatorWizard, type WizardData } from "./CreatorWizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "New character" };

type Traits = { name: string; description: string }[];

/** Only the traits the builder reads, so the client bundle stays small. */
const slim = (traits: Traits) => traits.filter((t) => t.name === "Ability Score Increase" || t.name === "Speed");

export default async function NewCharacterPage() {
  await requireUser();
  const [races, backgrounds, alignments, feats] = await Promise.all([

    prisma.race.findMany(),
    prisma.background.findMany({ orderBy: { name: "asc" } }),
    prisma.alignment.findMany({ orderBy: { name: "asc" } }),
    prisma.feat.findMany({ orderBy: { name: "asc" }, select: { index: true, name: true, prerequisite: true } }),
  ]);
  const byIndex = new Map(races.map((r) => [r.index, r]));

  const data: WizardData = {
    races: BASE_RACES.map((index) => {
      const r = byIndex.get(index)!;
      return {
        index,
        name: r.name,
        traits: slim(r.traits as Traits),
        subraces: (SUBRACES[index] ?? []).map((s) => ({
          index: s,
          name: byIndex.get(s)!.name,
          traits: slim(byIndex.get(s)!.traits as Traits),
        })),
      };
    }),
    backgrounds: backgrounds.map((b) => ({
      index: b.index,
      name: b.name,
      skillProficiencies: b.skillProficiencies,
      skills: parseSkillList(b.skillProficiencies ?? ""),
    })),
    alignments: alignments.map((a) => ({ index: a.index, name: a.name })),
    feats,
  };

  return <CreatorWizard data={data} />;
}
