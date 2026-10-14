import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const rows = await prisma.homebrewEntry.findMany({
    where: { ownerId: session.user.id },
    select: { kind: true, name: true, data: true },
    orderBy: { name: "asc" },
  });
  return new NextResponse(JSON.stringify(rows, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": "attachment; filename=homebrew.json" },
  });
}
