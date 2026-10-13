import { NextResponse } from "next/server";
import { searchAll } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.length > 80) return NextResponse.json({ hits: [] });
  return NextResponse.json({ hits: await searchAll(q) });
}
