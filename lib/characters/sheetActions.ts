"use server";

import { revalidatePath } from "next/cache";
import { deriveCharacter } from "@/engine/character";
import { applyDamage, deathSave, heal, type Vitals } from "@/engine/damage";
import { fromCopper, parseCostCp, pay, purseValueCp, type Purse } from "@/engine/economy";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toEngineInput } from "./derive";
import { customItem, itemFromCatalog, setEquipped, type InventoryItem } from "./inventory";

export type Result = { ok: true } | { ok: false; errors: string[] };
const fail = (m: string): Result => ({ ok: false, errors: [m] });

/** A character may be edited by its owner, or by the DM of any campaign it belongs to. */
async function editable(characterId: string, userId: string) {
  return prisma.character.findFirst({
    where: {
      id: characterId,
      OR: [{ ownerId: userId }, { campaigns: { some: { campaign: { dmId: userId } } } }],
    },
  });
}

/** Record a sheet change in every campaign the character is part of, so the table sees it and the DM can audit it. */
async function audit(characterId: string, characterName: string, actorId: string, actorName: string, text: string) {
  const links = await prisma.campaignCharacter.findMany({ where: { characterId }, select: { campaignId: true } });
  if (!links.length) return;
  await prisma.campaignEvent.createMany({
    data: links.map((l) => ({
      campaignId: l.campaignId,
      actorId,
      type: "sheet",
      payload: { actorName, characterId, characterName, text },
      audience: "ALL",
    })),
  });
}

const touch = (id: string) => {
  revalidatePath(`/characters/${id}`);
};

// ------------------------------------------------------------------ hit points

type HpChange = { kind: "damage"; amount: number; critical?: boolean } | { kind: "heal"; amount: number } | { kind: "temp"; amount: number } | { kind: "death-save"; natural: number };

/** Apply damage, healing, temp HP or a death save using the engine's rules, then log it. */
export async function changeHitPoints(characterId: string, change: HpChange): Promise<Result> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return fail("Character not found");
  const maxHp = deriveCharacter(toEngineInput(c)).maxHp;
  const saves = c.deathSaves as { successes: number; failures: number };

  let v: Vitals = {
    hp: c.currentHp, maxHp, tempHp: c.tempHp,
    dying: c.currentHp === 0 && saves.failures < 3 && !(c.conditions as string[]).includes("stable"),
    stable: (c.conditions as string[]).includes("stable"),
    dead: (c.conditions as string[]).includes("dead"),
    deathSaves: saves,
  };
  const before = v;
  let text = "";
  switch (change.kind) {
    case "damage":
      if (!(change.amount > 0)) return fail("Enter damage above zero");
      v = applyDamage(v, Math.floor(change.amount), { critical: change.critical });
      text = `takes ${Math.floor(change.amount)} damage`;
      break;
    case "heal":
      if (!(change.amount > 0)) return fail("Enter healing above zero");
      v = heal(v, Math.floor(change.amount));
      text = `heals ${Math.floor(change.amount)}`;
      break;
    case "temp":
      v = { ...v, tempHp: Math.max(v.tempHp, Math.max(0, Math.floor(change.amount))) };
      text = `gains ${Math.floor(change.amount)} temporary HP`;
      break;
    case "death-save":
      v = deathSave(v, change.natural);
      text = `rolls a ${change.natural} on a death save`;
      break;
  }

  const conditions = (c.conditions as string[]).filter((x) => x !== "stable" && x !== "dead");
  if (v.stable) conditions.push("stable");
  if (v.dead) conditions.push("dead");
  if (v.hp > 0) v = { ...v, deathSaves: { successes: 0, failures: 0 } };

  await prisma.character.update({
    where: { id: characterId },
    data: { currentHp: v.hp, tempHp: v.tempHp, deathSaves: v.deathSaves, conditions },
  });
  const note = v.dead ? " and dies" : v.dying && !before.dying ? " and falls unconscious" : "";
  await audit(characterId, c.name, user.id, user.name ?? "Someone", `${c.name} ${text} (${before.hp} → ${v.hp} HP${note})`);
  touch(characterId);
  return { ok: true };
}

// ------------------------------------------------------------------ inventory

async function saveItems(characterId: string, items: InventoryItem[]) {
  await prisma.character.update({ where: { id: characterId }, data: { equipment: items as unknown as object } });
  touch(characterId);
}

const itemsOf = (c: { equipment: unknown }) => (c.equipment as InventoryItem[]) ?? [];

/** Add a catalog item. With mode "buy" the price is paid from the purse (with change). */
export async function addCatalogItem(characterId: string, catalogIndex: string, quantity: number, mode: "free" | "buy"): Promise<Result> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return fail("Character not found");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return fail("Quantity must be 1-999");
  const row = await prisma.equipmentItem.findUnique({ where: { index: catalogIndex } });
  if (!row) return fail("Unknown item");

  let purse = c.currency as Purse;
  if (mode === "buy") {
    try {
      purse = pay(purse, parseCostCp(row.cost) * quantity);
    } catch {
      return fail(`Not enough money for ${quantity} × ${row.name} (${row.cost} each)`);
    }
  }
  const items = itemsOf(c);
  const existing = items.find((i) => i.catalogIndex === catalogIndex && !i.equipped);
  const next = existing ? items.map((i) => (i === existing ? { ...i, quantity: i.quantity + quantity } : i)) : [...items, itemFromCatalog(row, quantity)];
  await prisma.character.update({ where: { id: characterId }, data: { equipment: next as unknown as object, currency: purse } });
  await audit(characterId, c.name, user.id, user.name ?? "Someone", `${c.name} ${mode === "buy" ? "buys" : "gains"} ${quantity} × ${row.name}`);
  touch(characterId);
  return { ok: true };
}

export async function addCustomItem(characterId: string, name: string, quantity: number, weight?: number, notes?: string): Promise<Result> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return fail("Character not found");
  if (name.trim().length < 1 || name.length > 80) return fail("Give the item a name (up to 80 characters)");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return fail("Quantity must be 1-999");
  await saveItems(characterId, [...itemsOf(c), customItem(name, quantity, weight, notes?.slice(0, 200))]);
  await audit(characterId, c.name, user.id, user.name ?? "Someone", `${c.name} gains ${quantity} × ${name.trim()}`);
  return { ok: true };
}

export async function setItemEquipped(characterId: string, itemId: string, equipped: boolean): Promise<Result> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return fail("Character not found");
  try {
    await saveItems(characterId, setEquipped(itemsOf(c), itemId, equipped));
  } catch (e) {
    return fail((e as Error).message);
  }
  return { ok: true };
}

export async function setItemQuantity(characterId: string, itemId: string, quantity: number): Promise<Result> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return fail("Character not found");
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 999) return fail("Quantity must be 0-999");
  const items = itemsOf(c);
  await saveItems(characterId, quantity === 0 ? items.filter((i) => i.id !== itemId) : items.map((i) => (i.id === itemId ? { ...i, quantity } : i)));
  return { ok: true };
}

/** Sell an item for half its listed price (gear and weapons); custom items sell for nothing. */
export async function sellItem(characterId: string, itemId: string): Promise<Result> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return fail("Character not found");
  const items = itemsOf(c);
  const item = items.find((i) => i.id === itemId);
  if (!item) return fail("Item not found");
  let purse = c.currency as Purse;
  if (item.catalogIndex) {
    const row = await prisma.equipmentItem.findUnique({ where: { index: item.catalogIndex } });
    if (row) purse = fromCopper(purseValueCp(purse) + Math.floor(parseCostCp(row.cost) / 2), purse.ep > 0);
  }
  const rest = item.quantity > 1 ? items.map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i)) : items.filter((i) => i.id !== itemId);
  await prisma.character.update({ where: { id: characterId }, data: { equipment: rest as unknown as object, currency: purse } });
  await audit(characterId, c.name, user.id, user.name ?? "Someone", `${c.name} sells ${item.name}`);
  touch(characterId);
  return { ok: true };
}

export async function setCurrency(characterId: string, purse: Purse): Promise<Result> {
  const user = await requireUser();
  const c = await editable(characterId, user.id);
  if (!c) return fail("Character not found");
  for (const coin of ["cp", "sp", "ep", "gp", "pp"] as const) {
    if (!Number.isInteger(purse[coin]) || purse[coin] < 0 || purse[coin] > 10_000_000) return fail("Coins must be whole numbers, 0 or more");
  }
  await prisma.character.update({ where: { id: characterId }, data: { currency: purse } });
  await audit(characterId, c.name, user.id, user.name ?? "Someone", `${c.name}'s purse is now ${purse.pp}pp ${purse.gp}gp ${purse.ep}ep ${purse.sp}sp ${purse.cp}cp`);
  touch(characterId);
  return { ok: true };
}

export async function saveNotes(characterId: string, notes: string): Promise<Result> {
  const user = await requireUser();
  const c = await prisma.character.findFirst({ where: { id: characterId, ownerId: user.id } });
  if (!c) return fail("Character not found");
  await prisma.character.update({ where: { id: characterId }, data: { notes: notes.slice(0, 5000) } });
  touch(characterId);
  return { ok: true };
}

/** Roll a death saving throw on the server so the result cannot be chosen. */
export async function rollDeathSave(characterId: string): Promise<Result> {
  const natural = Math.floor(Math.random() * 20) + 1;
  return changeHitPoints(characterId, { kind: "death-save", natural });
}
