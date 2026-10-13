import ReusableTitle, { ReusableDescription, ReusableSubtitle } from "@/app/components/ReusableTitle";
import { ABILITIES, SKILLS, type Ability as AbilityKey } from "@/engine/abilities";

const ABILITY_INFO: Record<AbilityKey, { name: string; summary: string }> = {
  str: { name: "Strength", summary: "Physical power. Used for lifting, climbing, jumping and melee attacks." },
  dex: { name: "Dexterity", summary: "Agility, reflexes and balance. Used for stealth, ranged attacks and dodging." },
  con: { name: "Constitution", summary: "Health and stamina. Determines hit points and resistance to harm." },
  int: { name: "Intelligence", summary: "Reasoning and memory. Used for knowledge, investigation and wizard spellcasting." },
  wis: { name: "Wisdom", summary: "Awareness and insight. Used for perception, survival and divine or nature magic." },
  cha: { name: "Charisma", summary: "Force of personality. Used for persuasion, performance and some spellcasting." },
};

const titleCase = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const Ability = () => {
  return (
    <div className="flex flex-col gap-6">
      <ReusableTitle title="Player Abilities" />
      {ABILITIES.map((key) => (
        <div key={key} className="flex flex-col gap-3">
          <ReusableSubtitle title={ABILITY_INFO[key].name} subtitle={key.toUpperCase()} />
          <ReusableDescription description={ABILITY_INFO[key].summary} />
          <div className="flex flex-wrap gap-2">
            {Object.entries(SKILLS)
              .filter(([, ability]) => ability === key)
              .map(([skill]) => (
                <span key={skill} className="rounded-full border border-border bg-surface px-3 py-1 text-sm">
                  {titleCase(skill)}
                </span>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Ability;
