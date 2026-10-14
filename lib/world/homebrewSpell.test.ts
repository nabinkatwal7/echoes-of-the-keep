import { describe, expect, it } from "vitest";
import { parseSpellEffect } from "@/engine/spells/effects";
import { homebrewSpellFields } from "./homebrewSpell";

describe("homebrew spell text", () => {
  it("reads back as a save, an attack and a heal", () => {
    const save = homebrewSpellFields({ name: "Ash Bolt", level: 1, className: "Wizard", kind: "save", dice: "2d6", damageType: "fire", save: "Dexterity", range: 60, upcastDice: "1d6" });
    if (!save.ok) throw new Error(save.error);
    const saved = parseSpellEffect(save.fields);
    expect(saved.delivery).toBe("save");
    expect(saved.damage).toMatchObject({ dice: "2d6", type: "fire" });
    expect(saved.halfOnSave).toBe(true);
    expect(saved.save).toBe("dex");
    expect(saved.upcastDice).toBe("1d6");

    const attack = homebrewSpellFields({ name: "Needle", level: 0, className: "Warlock", kind: "attack", dice: "1d10", damageType: "force", range: 120 });
    if (!attack.ok) throw new Error(attack.error);
    expect(parseSpellEffect(attack.fields).delivery).toBe("attack");

    const heal = homebrewSpellFields({ name: "Mend Flesh", level: 1, className: "Cleric", kind: "heal", dice: "1d8", range: 30 });
    if (!heal.ok) throw new Error(heal.error);
    const healed = parseSpellEffect(heal.fields);
    expect(healed.delivery).toBe("heal");
    expect(healed.healing).toMatchObject({ dice: "1d8", addModifier: true });
  });

  it("rejects a bad dice expression", () => {
    expect(homebrewSpellFields({ name: "Oops", level: 1, className: "Wizard", kind: "attack", dice: "lots", damageType: "fire", range: 30 }).ok).toBe(false);
  });
});
