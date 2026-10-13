import type { ArmorInput, WeaponInput } from "@/engine/character";
import { weaponProficient } from "@/engine/classes/equipment";

export type ItemKind = "weapon" | "armor" | "shield" | "gear";

export type InventoryItem = {
  id: string;
  name: string;
  /** equipment catalog key, absent for custom items */
  catalogIndex?: string;
  kind: ItemKind;
  quantity: number;
  equipped: boolean;
  /** pounds each */
  weight?: number;
  notes?: string;
  // weapons
  damage?: string;
  melee?: boolean;
  finesse?: boolean;
  twoHanded?: boolean;
  /** catalog category, e.g. "Martial Melee Weapons" */
  category?: string;
  properties?: string;
  // armor and shields
  armorCategory?: "light" | "medium" | "heavy";
  baseAc?: number;
  strengthRequired?: number;
  /** magic bonus to attack and damage (weapons) or AC (armor and shields) */
  magicBonus?: number;
};

/** The catalog fields we read from an EquipmentItem row. */
export type CatalogRow = {
  index: string;
  name: string;
  category: string | null;
  cost: string;
  weight: string | null;
  damage: string | null;
  properties: string | null;
  armorClass: string | null;
  strengthRequired: string | null;
};

/** "1 1/2 lb." -> 1.5, "1/4 lb." -> 0.25, "5 lb." -> 5 */
export function parseWeight(text: string | null | undefined): number | undefined {
  if (!text) return undefined;
  const m = /^(?:(\d+)\s+)?(?:(\d+)\/(\d+)|(\d+(?:\.\d+)?))\s*lb\.?$/.exec(text.trim());
  if (!m) return undefined;
  if (m[2]) return Number(m[1] ?? 0) + Number(m[2]) / Number(m[3]);
  return Number(m[4]);
}

const newId = () => `i_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;

export function itemFromCatalog(row: CatalogRow, quantity = 1, equipped = false): InventoryItem {
  const category = row.category ?? "";
  const base = { id: newId(), name: row.name, catalogIndex: row.index, quantity, equipped, weight: parseWeight(row.weight), category: category || undefined };

  if (/Armor$/.test(category) && row.armorClass) {
    const ac = Number.parseInt(row.armorClass, 10);
    return {
      ...base,
      kind: "armor",
      armorCategory: category.startsWith("Light") ? "light" : category.startsWith("Medium") ? "medium" : "heavy",
      baseAc: ac,
      strengthRequired: row.strengthRequired ? Number(row.strengthRequired) : undefined,
    };
  }
  if (category === "Shield") return { ...base, kind: "shield", baseAc: 2 };
  if (row.damage) {
    const props = row.properties ?? "";
    return {
      ...base,
      kind: "weapon",
      damage: row.damage.split(" ")[0],
      melee: !/Ranged/.test(category),
      finesse: /finesse/i.test(props),
      twoHanded: /two-handed/i.test(props),
      properties: props || undefined,
    };
  }
  return { ...base, kind: "gear" };
}

export function customItem(name: string, quantity = 1, weight?: number, notes?: string): InventoryItem {
  return { id: newId(), name: name.trim(), kind: "gear", quantity, equipped: false, weight, notes };
}

/** Equip or unequip. Only one suit of armor and one shield can be worn; equipping replaces the previous one. */
export function setEquipped(items: InventoryItem[], id: string, equipped: boolean): InventoryItem[] {
  const target = items.find((i) => i.id === id);
  if (!target) throw new Error("Item not found");
  if (!["weapon", "armor", "shield"].includes(target.kind)) throw new Error("Only weapons, armor and shields can be equipped");
  return items.map((i) => {
    if (i.id === id) return { ...i, equipped };
    if (equipped && i.equipped && (target.kind === "armor" || target.kind === "shield") && i.kind === target.kind) return { ...i, equipped: false };
    return i;
  });
}

export const totalWeight = (items: InventoryItem[]) => items.reduce((s, i) => s + (i.weight ?? 0) * i.quantity, 0);

/** Equipped gear in the shape the derivation engine expects. */
export function equipmentForEngine(items: InventoryItem[], classIndexes: string[]) {
  const worn = items.find((i) => i.kind === "armor" && i.equipped);
  const shield = items.find((i) => i.kind === "shield" && i.equipped);
  const armor: ArmorInput | undefined =
    worn && worn.baseAc !== undefined && worn.armorCategory
      ? { name: worn.name, category: worn.armorCategory, baseAc: worn.baseAc, strengthRequired: worn.strengthRequired }
      : undefined;
  const weapons: WeaponInput[] = items
    .filter((i) => i.kind === "weapon" && i.equipped && i.damage)
    .map((i) => ({
      name: i.name,
      damage: i.damage!,
      melee: i.melee ?? true,
      finesse: i.finesse,
      proficient: weaponProficient(classIndexes, i.name, i.category ?? null),
      magicBonus: i.magicBonus,
    }));
  const acBonus = (worn?.magicBonus ?? 0) + (shield?.magicBonus ?? 0);
  return { armor, shield: !!shield, weapons, acBonus };
}
