import { describe, expect, it } from "vitest";
import { parseLegendary, parseRecharge, rechargeRoll, spendLegendary, spendRecharge } from "./special";

const dragon = `Breath Weapons (Recharge 5–6). The dragon uses one of the following breath weapons. Fire Breath. The dragon exhales fire in a 30-foot cone. Each creature in that area must make a DC 17 Dexterity saving throw, taking 56 (16d6) fire damage on a failed save, or half as much damage on a successful one.
Legendary Actions. The dragon can take 3 legendary actions, choosing from the options below. Only one legendary action option can be used at a time and only at the end of another creature's turn. The dragon regains spent legendary actions at the start of its turn. Detect. The dragon makes a Wisdom (Perception) check. Tail Attack. The dragon makes a tail attack. Wing Attack (Costs 2 Actions). The dragon beats its wings.`;

describe("recharge and legendary actions", () => {
  it("reads a breath weapon and rolls it back on a 5 or 6", () => {
    const abilities = parseRecharge(dragon);
    expect(abilities[0]).toMatchObject({ name: "Breath Weapons", min: 5, ready: true, dice: "16d6", damageType: "fire", saveDc: 17, saveAbility: "dex" });
    const spent = spendRecharge(abilities, "Breath Weapons");
    expect(spent?.[0].ready).toBe(false);
    expect(rechargeRoll(spent!, () => 4).abilities[0].ready).toBe(false);
    expect(rechargeRoll(spent!, () => 5).abilities[0].ready).toBe(true);
  });

  it("reads a legendary pool and spends one option per turn", () => {
    const pool = parseLegendary(dragon);
    expect(pool).toMatchObject({ max: 3, left: 3 });
    expect(pool?.options).toEqual(expect.arrayContaining([{ name: "Wing Attack", cost: 2 }, { name: "Detect", cost: 1 }]));
    const once = spendLegendary(pool!, 2);
    expect(once).toMatchObject({ left: 1, pending: true });
    expect(spendLegendary(once!, 1)).toBeNull();
  });
});
