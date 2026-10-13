import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Liveness and database check for uptime monitors and load balancers. Reveals nothing about users or data. */
export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", database: "up", ms: Date.now() - started });
  } catch {
    return Response.json({ status: "degraded", database: "down", ms: Date.now() - started }, { status: 503 });
  }
}
