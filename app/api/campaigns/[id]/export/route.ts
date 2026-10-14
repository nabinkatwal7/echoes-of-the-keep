import { auth } from "@/auth";
import { getMembership } from "@/lib/campaigns/queries";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Campaign JSON, or the journal as Markdown when ?format=md. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const membership = await getMembership(id, session.user.id);
  if (!membership) return new NextResponse("Forbidden", { status: 403 });

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      notes: { orderBy: { createdAt: "asc" } },
      places: { select: { name: true, description: true, revealed: true } },
      quests: { select: { title: true, status: true, revealed: true } },
      npcs: { select: { name: true, revealed: true } },
    },
  });
  if (!campaign) return new NextResponse("Not found", { status: 404 });
  const dm = membership.role === "DM";
  const notes = campaign.notes.filter((n) => dm || n.visibility !== "PRIVATE" || n.authorId === session.user.id);
  const markdown = [`# ${campaign.name}`, "", campaign.description, "", "## Journal", "", ...notes.flatMap((n) => [`### ${n.title}`, "", n.body, ""])].join("\n");

  if (new URL(req.url).searchParams.get("format") === "md") {
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${campaign.name.replace(/[^\w]+/g, "-")}-journal.md"`,
      },
    });
  }

  const body = {
    format: "dnd-campaign-export",
    exportedAt: new Date().toISOString(),
    name: campaign.name,
    description: campaign.description,
    clockMinutes: campaign.clockMinutes,
    places: dm ? campaign.places : campaign.places.filter((p) => p.revealed),
    quests: dm ? campaign.quests : campaign.quests.filter((q) => q.revealed),
    npcs: dm ? campaign.npcs : campaign.npcs.filter((n) => n.revealed),
    journal: notes.map((n) => ({ kind: n.kind, title: n.title, body: n.body, visibility: n.visibility, createdAt: n.createdAt })),
    journalMarkdown: markdown,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${campaign.name.replace(/[^\w]+/g, "-")}.json"`,
    },
  });
}
