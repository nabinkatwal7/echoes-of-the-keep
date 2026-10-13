/** Wiki sections shown in the sidebar and on the wiki landing page. `key` also selects the icon. */
export const wikiSections = [
  { key: "races", label: "Races", href: "/wiki/races", blurb: "Dwarves, elves, halflings and the folk who walk the realms." },
  { key: "classes", label: "Classes", href: "/wiki/classes", blurb: "Twelve paths to power, from rage to arcane mastery." },
  { key: "backgrounds", label: "Backgrounds", href: "/wiki/backgrounds", blurb: "Where your hero came from and what they carry." },
  { key: "feats", label: "Feats", href: "/wiki/feats", blurb: "Special talents that set a character apart." },
  { key: "equipment", label: "Equipment", href: "/wiki/equipment", blurb: "Armor, weapons, gear and the price of an adventure." },
  { key: "spells", label: "Spells", href: "/wiki/spells", blurb: "Every cantrip and incantation, filterable by class and school." },
  { key: "conditions", label: "Conditions", href: "/wiki/conditions", blurb: "What blinded, frightened and stunned really mean." },
  { key: "creatures", label: "Creatures", href: "/wiki/creatures", blurb: "Stat blocks for beasts, familiars and things that bite." },
  { key: "character", label: "Core Rules", href: "/wiki/character", blurb: "Abilities, skills, alignments and backgrounds at a glance." },
] as const;

export type WikiSectionKey = (typeof wikiSections)[number]["key"];
