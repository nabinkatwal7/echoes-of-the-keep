"use server";

import type { Prisma } from "@prisma/client";
import { parseEntries, rollTable, STARTER_TABLES, type TableEntry } from "@/engine/world/tables";
import { prisma } from "@/lib/prisma";
import { dm, fail, member, say, touchWorld, type Result } from "./guard";

const entriesOf = (v: unknown): TableEntry[] => (Array.isArray(v) ? (v as TableEntry[]).filter((e) => e && typeof e.text === "string") : []);

export async function saveTable(campaignId: string, input: { id?: string; name: string; entriesText: string; shared: boolean }): Promise<Result<{ id: string }>> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  const name = input.name.trim();
  if (name.length < 1 || name.length > 80) return fail("Give the table a name");
  const entries = parseEntries(input.entriesText);
  if (entries.length < 2) return fail("A table needs at least two entries, one per line");
  if (entries.length > 100) return fail("Keep a table to 100 entries or fewer");
  const data = { name, entries: entries as unknown as Prisma.InputJsonValue, shared: input.shared };
  if (input.id) {
    const n = await prisma.randomTable.updateMany({ where: { id: input.id, campaignId }, data });
    if (!n.count) return fail("Table not found");
    touchWorld(campaignId);
    return { ok: true, id: input.id };
  }
  const t = await prisma.randomTable.create({ data: { ...data, campaignId } });
  touchWorld(campaignId);
  return { ok: true, id: t.id };
}

export async function deleteTable(campaignId: string, id: string): Promise<Result> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  await prisma.randomTable.deleteMany({ where: { id, campaignId } });
  touchWorld(campaignId);
  return { ok: true };
}

/** Add the four built-in tables, skipping any the campaign already has. */
export async function addStarterTables(campaignId: string): Promise<Result<{ added: number }>> {
  const d = await dm(campaignId);
  if (d.error) return d.error;
  const have = new Set((await prisma.randomTable.findMany({ where: { campaignId }, select: { name: true } })).map((t) => t.name));
  const fresh = STARTER_TABLES.filter((t) => !have.has(t.name));
  if (!fresh.length) return fail("You already have the starter tables");
  await prisma.randomTable.createMany({ data: fresh.map((t) => ({ campaignId, name: t.name, entries: t.entries as unknown as Prisma.InputJsonValue })) });
  touchWorld(campaignId);
  return { ok: true, added: fresh.length };
}

/**
 * Roll on a table. The DM can roll any table and chooses whether the table sees the result; players can roll shared tables,
 * and their rolls always go to the whole table.
 */
export async function rollOnTable(campaignId: string, id: string, secret = false): Promise<Result<{ text: string; index: number }>> {
  const m = await member(campaignId);
  if (m.error) return m.error;
  const table = await prisma.randomTable.findFirst({ where: { id, campaignId } });
  if (!table) return fail("Table not found");
  if (!m.isDm && !table.shared) return fail("Only the DM can roll on that table");
  const entries = entriesOf(table.entries);
  if (entries.length === 0) return fail("The table is empty");
  const { entry, index } = rollTable(entries);
  const dmOnly = m.isDm && secret;
  await say(campaignId, m.user.id, `${table.name} (${index}/${entries.length}): ${entry.text}`, dmOnly);
  touchWorld(campaignId);
  return { ok: true, text: entry.text, index };
}
