import type { PrismaClient } from "@prisma/client";
import { creatureInSrd, gearInSrd, SRD_BACKGROUNDS, SRD_FEATS, SRD_RACES, SRD_SUBCLASSES, spellInSrd } from "../../lib/srd";

type Row = Record<string, unknown> & { index?: string; name?: string };

/**
 * Free-rules (SRD-only) seeding. Only rows whose names appear in the SRD 5.1 are written; everything else from the
 * handbook is dropped, so the database does not hold handbook wording the SRD does not cover. Class and subclass
 * prose is emptied (the mechanics come from the rules engine, not from the text).
 */
export function srdRows(importer: string, rows: Row[]): Row[] {
  const name = (r: Row) => String(r.name ?? "");
  switch (importer) {
    case "spells":
      return rows.filter((r) => spellInSrd(name(r)));
    case "equipment":
      return rows.filter((r) => gearInSrd(name(r)));
    case "creatures":
      return rows.filter((r) => creatureInSrd(name(r)));
    case "races":
      return rows.filter((r) => SRD_RACES.includes(String(r.index)));
    case "backgrounds":
      return rows.filter((r) => SRD_BACKGROUNDS.includes(String(r.index)));
    case "feats":
      return rows.filter((r) => SRD_FEATS.includes(String(r.index)));
    case "subclasses":
      return rows.filter((r) => SRD_SUBCLASSES.includes(String(r.index))).map((r) => ({ ...r, text: "" }));
    case "classes":
      return rows.map((r) => ({ ...r, text: "" }));
    case "rule-sections":
      return []; // handbook chapters are not part of the SRD text we can verify
    default:
      return rows; // conditions, alignments and languages are short reference lists
  }
}

/** Remove rows left over from an earlier full import so switching to SRD-only really removes handbook content. */
export async function purgeNonSrd(prisma: PrismaClient, importer: string, kept: Row[]) {
  const keep = kept.map((r) => String(r.index));
  switch (importer) {
    case "spells":
      await prisma.spell.deleteMany({ where: { index: { notIn: keep } } });
      break;
    case "equipment":
      await prisma.equipmentItem.deleteMany({ where: { index: { notIn: keep } } });
      break;
    case "creatures":
      await prisma.creature.deleteMany({ where: { campaignId: null, index: { notIn: keep } } });
      break;
    case "races":
      await prisma.race.deleteMany({ where: { index: { notIn: keep } } });
      break;
    case "backgrounds":
      await prisma.background.deleteMany({ where: { index: { notIn: keep } } });
      break;
    case "feats":
      await prisma.feat.deleteMany({ where: { index: { notIn: keep } } });
      break;
    case "subclasses":
      await prisma.subclass.deleteMany({ where: { index: { notIn: keep } } });
      break;
    case "rule-sections":
      await prisma.ruleSection.deleteMany({});
      break;
  }
}
