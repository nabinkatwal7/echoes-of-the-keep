import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Counts only. No names, no messages. */
export async function GET() {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [users, campaigns, eventsLastHour] = await Promise.all([
    prisma.user.count(),
    prisma.campaign.count(),
    prisma.campaignEvent.count({ where: { createdAt: { gte: since } } }),
  ]);
  return NextResponse.json({ users, campaigns, eventsLastHour });
}
