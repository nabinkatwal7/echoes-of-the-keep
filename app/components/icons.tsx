import type { IconType } from "react-icons";
import {
  GiAnvil,
  GiBarbarian,
  GiBowman,
  GiBrain,
  GiCrossedSwords,
  GiCursedStar,
  GiDragonHead,
  GiDwarfFace,
  GiElfEar,
  GiHoodedFigure,
  GiHolySymbol,
  GiLyre,
  GiMagicSwirl,
  GiMeditation,
  GiOakLeaf,
  GiQuillInk,
  GiRoundShield,
  GiScrollUnfurled,
  GiSkullCrossedBones,
  GiSpellBook,
  GiSwordsEmblem,
  GiWizardStaff,
  GiBackpack,
  GiDevilMask,
  GiElfHelmet,
  GiHelmet,
  GiHobbitDoor,
  GiOrcHead,
  GiPointyHat,
  GiCrown,
} from "react-icons/gi";

export const CLASS_ICONS: Record<string, IconType> = {
  barbarian: GiBarbarian,
  bard: GiLyre,
  cleric: GiHolySymbol,
  druid: GiOakLeaf,
  fighter: GiCrossedSwords,
  monk: GiMeditation,
  paladin: GiRoundShield,
  ranger: GiBowman,
  rogue: GiHoodedFigure,
  sorcerer: GiMagicSwirl,
  warlock: GiCursedStar,
  wizard: GiWizardStaff,
};

export const classIcon = (index: string): IconType => CLASS_ICONS[index] ?? GiSwordsEmblem;

export const SECTION_ICONS: Record<string, IconType> = {
  races: GiDwarfFace,
  classes: GiCrossedSwords,
  backgrounds: GiQuillInk,
  feats: GiAnvil,
  equipment: GiBackpack,
  spells: GiSpellBook,
  conditions: GiSkullCrossedBones,
  creatures: GiDragonHead,
  character: GiBrain,
};

export const sectionIcon = (key: string): IconType => SECTION_ICONS[key] ?? GiScrollUnfurled;

const RACE_ICONS: [string, IconType][] = [
  ["half-elf", GiElfEar],
  ["half-orc", GiOrcHead],
  ["dwarf", GiDwarfFace],
  ["elf", GiElfHelmet],
  ["drow", GiElfHelmet],
  ["halfling", GiHobbitDoor],
  ["lightfoot", GiHobbitDoor],
  ["stout", GiHobbitDoor],
  ["human", GiHelmet],
  ["dragonborn", GiDragonHead],
  ["gnome", GiPointyHat],
  ["tiefling", GiDevilMask],
];

/** Icon for a race or subrace index; subraces share their parent's icon. */
export const raceIcon = (index: string): IconType => RACE_ICONS.find(([k]) => index.includes(k))?.[1] ?? GiCrown;

/** Colour treatment per school of magic, used for spell cards and badges. */
export const SCHOOL_STYLE: Record<string, { text: string; border: string; glow: string; label: string }> = {
  abjuration: { text: "text-[#7fa8ee]", border: "border-[#7fa8ee]/50", glow: "shadow-[0_0_18px_rgba(127,168,238,0.15)]", label: "Abjuration" },
  conjuration: { text: "text-[#e2b04a]", border: "border-[#e2b04a]/50", glow: "shadow-[0_0_18px_rgba(226,176,74,0.15)]", label: "Conjuration" },
  divination: { text: "text-[#a9c1d6]", border: "border-[#a9c1d6]/50", glow: "shadow-[0_0_18px_rgba(169,193,214,0.15)]", label: "Divination" },
  enchantment: { text: "text-[#e07fb8]", border: "border-[#e07fb8]/50", glow: "shadow-[0_0_18px_rgba(224,127,184,0.15)]", label: "Enchantment" },
  evocation: { text: "text-[#ee7b38]", border: "border-[#ee7b38]/50", glow: "shadow-[0_0_18px_rgba(238,123,56,0.18)]", label: "Evocation" },
  illusion: { text: "text-[#a285ea]", border: "border-[#a285ea]/50", glow: "shadow-[0_0_18px_rgba(162,133,234,0.15)]", label: "Illusion" },
  necromancy: { text: "text-[#86bd6f]", border: "border-[#86bd6f]/50", glow: "shadow-[0_0_18px_rgba(134,189,111,0.15)]", label: "Necromancy" },
  transmutation: { text: "text-[#cf9460]", border: "border-[#cf9460]/50", glow: "shadow-[0_0_18px_rgba(207,148,96,0.15)]", label: "Transmutation" },
};

export const schoolStyle = (school: string) => SCHOOL_STYLE[school] ?? SCHOOL_STYLE.evocation;
