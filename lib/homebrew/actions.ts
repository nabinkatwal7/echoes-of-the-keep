"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const KINDS = ["race", "background", "feat", "item"] as const;
type Kind = (typeof KINDS)[number];

export type HomebrewResult = { ok: true } | { ok: false; error: string };

function kindOf(v: string): Kind | null {
  return (KINDS as readonly string[]).includes(v) ? (v as Kind) : null;
}

function homebrewData(kind: Kind, form: FormData): object | null {
  if (kind === "race") {
    const ability = String(form.get("ability") ?? "Strength");
    const amount = Number(form.get("amount") ?? 2);
    const speed = Number(form.get("speed") ?? 30);
    if (!Number.isInteger(amount) || amount < 0 || amount > 2) return null;
    if (!Number.isInteger(speed) || speed < 15 || speed > 60) return null;
    return {
      traits: [
        { name: "Ability Score Increase", description: `Your ${ability} score increases by ${amount}.` },
        { name: "Speed", description: `Your base walking speed is ${speed} feet.` },
      ],
    };
  }
  if (kind === "background") {
    const skills = String(form.get("skills") ?? "").trim();
    if (!skills) return null;
    return { skillProficiencies: skills };
  }
  if (kind === "feat") {
    const description = String(form.get("description") ?? "").trim();
    if (!description) return null;
    return { prerequisite: String(form.get("prerequisite") ?? "").trim() || null, description };
  }
  const cost = String(form.get("cost") ?? "0 gp").trim() || "0 gp";
  return { cost, category: String(form.get("category") ?? "Adventuring Gear") };
}

export async function addHomebrew(_prev: HomebrewResult | undefined, form: FormData): Promise<HomebrewResult> {
  const user = await requireUser();
  const kind = kindOf(String(form.get("kind") ?? ""));
  const name = String(form.get("name") ?? "").trim();
  if (!kind) return { ok: false, error: "Choose a kind" };
  if (name.length < 2 || name.length > 60) return { ok: false, error: "Name must be 2-60 characters" };
  const data = homebrewData(kind, form);
  if (!data) return { ok: false, error: "Check the numbers on that form" };
  await prisma.homebrewEntry.create({ data: { ownerId: user.id, kind, name, data } });
  revalidatePath("/homebrew");
  revalidatePath("/characters/new");
  return { ok: true };
}

export async function importHomebrew(_prev: HomebrewResult | undefined, form: FormData): Promise<HomebrewResult> {
  const user = await requireUser();
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(form.get("json") ?? ""));
  } catch {
    return { ok: false, error: "That is not JSON" };
  }
  if (!Array.isArray(parsed)) return { ok: false, error: "Expected a list of entries" };
  const rows = parsed.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const r = row as { kind?: string; name?: string; data?: object };
    const kind = kindOf(String(r.kind ?? ""));
    const name = String(r.name ?? "").trim();
    if (!kind || name.length < 2 || name.length > 60 || !r.data || typeof r.data !== "object") return [];
    return [{ ownerId: user.id, kind, name, data: r.data }];
  });
  if (!rows.length) return { ok: false, error: "No usable entries in that file" };
  await prisma.homebrewEntry.createMany({ data: rows.slice(0, 100) });
  revalidatePath("/homebrew");
  return { ok: true };
}

export async function deleteHomebrew(id: string) {
  const user = await requireUser();
  await prisma.homebrewEntry.deleteMany({ where: { id, ownerId: user.id } });
  revalidatePath("/homebrew");
}
