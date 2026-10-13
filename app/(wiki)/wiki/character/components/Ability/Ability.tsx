import { Badge } from "@/app/components/ui/Badge";
import { Card } from "@/app/components/ui/Card";
import { ABILITIES, SKILLS, type Ability as AbilityKey } from "@/engine/abilities";

const INFO: Record<AbilityKey, { name: string; summary: string }> = {
  str: { name: "Strength", summary: "Physical power. Lifting, climbing, jumping and melee attacks." },
  dex: { name: "Dexterity", summary: "Agility, reflexes and balance. Stealth, ranged attacks and dodging." },
  con: { name: "Constitution", summary: "Health and stamina. Sets your hit points and resilience." },
  int: { name: "Intelligence", summary: "Reasoning and memory. Knowledge, investigation and wizard magic." },
  wis: { name: "Wisdom", summary: "Awareness and insight. Perception, survival and divine or nature magic." },
  cha: { name: "Charisma", summary: "Force of personality. Persuasion, performance and some spellcasting." },
};

const titleCase = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function Ability() {
  return (
    <section id="abilities">
      <h2 className="eyebrow mb-4">The six abilities</h2>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {ABILITIES.map((key) => (
          <Card key={key} className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-lg uppercase tracking-[0.12em] text-goldBright">{INFO[key].name}</h3>
              <span className="font-display text-sm text-muted">{key.toUpperCase()}</span>
            </div>
            <p className="text-foreground/85">{INFO[key].summary}</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SKILLS)
                .filter(([, a]) => a === key)
                .map(([skill]) => (
                  <Badge key={skill}>{titleCase(skill)}</Badge>
                ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
