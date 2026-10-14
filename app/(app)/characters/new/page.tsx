import { parseSkillList } from "@/engine/classes/rules";
import { requireUser } from "@/lib/auth";
import { BASE_RACES, SUBRACES } from "@/lib/rules/race";
import { prisma } from "@/lib/prisma";
import { SRD_SUBCLASSES, srdOnly, srdWhere } from "@/lib/srd";
import { CreatorWizard, type WizardData } from "./CreatorWizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "New character" };

type Traits = { name: string; description: string }[];

/** Only the traits the builder reads, so the client bundle stays small. */
const slim = (traits: Traits) => traits.filter((t) => t.name === "Ability Score Increase" || t.name === "Speed");

export default async function NewCharacterPage() {
  const user = await requireUser();
  const [races, backgrounds, alignments, feats, mine] = await Promise.all([
    prisma.race.findMany({ where: srdWhere("race") }),
    prisma.background.findMany({ where: srdWhere("background"), orderBy: { name: "asc" } }),
    prisma.alignment.findMany({ orderBy: { name: "asc" } }),
    prisma.feat.findMany({ where: srdWhere("feat"), orderBy: { name: "asc" }, select: { index: true, name: true, prerequisite: true } }),
    prisma.homebrewEntry.findMany({ where: { ownerId: user.id } }),
  ]);
  const byIndex = new Map(races.map((r) => [r.index, r]));

  const data: WizardData = {
    races: [...BASE_RACES.flatMap((index) => {
      const r = byIndex.get(index);
      if (!r) return [];
      return [{
        index,
        name: r.name,
        traits: slim(r.traits as Traits),
        subraces: (SUBRACES[index] ?? []).flatMap((s) => {
          const sub = byIndex.get(s);
          return sub ? [{ index: s, name: sub.name, traits: slim(sub.traits as Traits) }] : [];
        }),
      }];
    }),
      ...mine.filter((h) => h.kind === "race").map((h) => ({
        index: `homebrew-${h.id}`,
        name: h.name,
        traits: slim((h.data as { traits?: Traits }).traits ?? []),
        subraces: [] as { index: string; name: string; traits: Traits }[],
      })),
    ],
    backgrounds: backgrounds.map((b) => ({
      index: b.index,
      name: b.name,
      skillProficiencies: b.skillProficiencies,
      skills: parseSkillList(b.skillProficiencies ?? ""),
    })).concat(mine.filter((h) => h.kind === "background").map((h) => {
      const skillProficiencies = String((h.data as { skillProficiencies?: string }).skillProficiencies ?? "");
      return { index: `homebrew-${h.id}`, name: h.name, skillProficiencies, skills: parseSkillList(skillProficiencies) };
    })),
    alignments: alignments.map((a) => ({ index: a.index, name: a.name })),
    feats: [
      ...feats,
      ...mine.filter((h) => h.kind === "feat").map((h) => ({
        index: `homebrew-${h.id}`,
        name: h.name,
        prerequisite: (h.data as { prerequisite?: string | null }).prerequisite ?? null,
      })),
    ],
  };

  return <CreatorWizard data={data} subclassAllow={srdOnly() ? SRD_SUBCLASSES : undefined} />;
}
