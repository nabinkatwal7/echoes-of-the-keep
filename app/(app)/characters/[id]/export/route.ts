import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { exportCharacter } from "@/lib/characters/portable";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Download a character as JSON. Owner only. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const c = await prisma.character.findFirst({ where: { id: (await params).id, ownerId: session.user.id } });
  if (!c) return new NextResponse("Not found", { status: 404 });
  const safeName = c.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "character";
  return new NextResponse(JSON.stringify(exportCharacter(c as unknown as Record<string, unknown>), null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${safeName}.dnd.json"` },
  });
}
