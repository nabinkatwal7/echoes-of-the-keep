import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { exportAccount } from "@/lib/account/service";

export const dynamic = "force-dynamic";

/** Download everything this account owns as JSON. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const data = await exportAccount(session.user.id);
  if (!data) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="dnd-account-export.json"', "Cache-Control": "no-store" },
  });
}
