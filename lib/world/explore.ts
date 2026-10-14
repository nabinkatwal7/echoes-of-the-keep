"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { dm, fail, member, type Result } from "./guard";
import { readExplore, type ExploreMap } from "./exploreMap";

export type { ExploreMap };

async function load(campaignId: string) {
  const row = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { world: true } });
  const world = row?.world && typeof row.world === "object" && !Array.isArray(row.world) ? { ...(row.world as Record<string, unknown>) } : {};
  return { world, map: readExplore(world.explore) };
}

async function save(campaignId: string, world: Record<string, unknown>, map: ExploreMap) {
  world.explore = map;
  await prisma.campaign.update({ where: { id: campaignId }, data: { world: world as object } });
  revalidatePath(`/campaigns/${campaignId}/table`);
}

export async function exploreOf(campaignId: string): Promise<ExploreMap | null> {
  const w = await member(campaignId);
  if (w.error) return null;
  return (await load(campaignId)).map;
}

export async function setExploreGrid(campaignId: string, width: number, height: number, scale: number): Promise<Result> {
  const w = await dm(campaignId);
  if (w.error) return w.error;
  const { world, map } = await load(campaignId);
  const next = readExplore({ ...map, width, height, scale });
  next.tokens = next.tokens.filter((t) => t.x < next.width && t.y < next.height);
  await save(campaignId, world, next);
  return { ok: true };
}

export async function addExploreToken(campaignId: string, name: string): Promise<Result> {
  const w = await dm(campaignId);
  if (w.error) return w.error;
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 40) return fail("Give the token a name");
  const { world, map } = await load(campaignId);
  if (map.tokens.length >= 40) return fail("The map is full");
  map.tokens.push({ id: crypto.randomUUID(), name: trimmed, x: 0, y: 0 });
  await save(campaignId, world, map);
  return { ok: true };
}

export async function moveExploreToken(campaignId: string, tokenId: string, x: number, y: number): Promise<Result> {
  const w = await dm(campaignId);
  if (w.error) return w.error;
  const { world, map } = await load(campaignId);
  const token = map.tokens.find((t) => t.id === tokenId);
  if (!token) return fail("That token is not on the map");
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= map.width || y >= map.height) return fail("That square is off the map");
  token.x = x;
  token.y = y;
  await save(campaignId, world, map);
  return { ok: true };
}

export async function removeExploreToken(campaignId: string, tokenId: string): Promise<Result> {
  const w = await dm(campaignId);
  if (w.error) return w.error;
  const { world, map } = await load(campaignId);
  map.tokens = map.tokens.filter((t) => t.id !== tokenId);
  await save(campaignId, world, map);
  return { ok: true };
}
