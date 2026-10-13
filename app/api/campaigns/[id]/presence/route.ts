import { auth } from "@/auth";
import { getMembership } from "@/lib/campaigns/queries";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ONLINE_MS = 45_000;

/** Who is at the table right now. POST marks the caller as present; GET lists the members and who is online. */
async function who(params: Promise<{ id: string }>) {
  const session = await auth();
  const { id } = await params;
  if (!session?.user) return { error: new Response("Unauthorized", { status: 401 }) } as const;
  const membership = await getMembership(id, session.user.id);
  if (!membership) return { error: new Response("Forbidden", { status: 403 }) } as const;
  return { id, userId: session.user.id } as const;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const w = await who(params);
  if ("error" in w) return w.error;
  await prisma.campaignMember.updateMany({ where: { campaignId: w.id, userId: w.userId }, data: { lastSeenAt: new Date() } });
  return new Response(null, { status: 204 });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const w = await who(params);
  if ("error" in w) return w.error;
  const members = await prisma.campaignMember.findMany({ where: { campaignId: w.id }, include: { user: { select: { displayName: true } } }, orderBy: { joinedAt: "asc" } });
  const now = Date.now();
  return Response.json({
    members: members.map((m) => ({ id: m.userId, name: m.user.displayName, role: m.role, online: !!m.lastSeenAt && now - m.lastSeenAt.getTime() < ONLINE_MS })),
  });
}
