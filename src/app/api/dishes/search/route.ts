import { NextResponse } from "next/server";
import { z } from "zod";
import { dishMemories } from "@/server/repos/dishes";
import { getSession } from "@/server/session";

const query = z.string().trim().min(2).max(80);

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non connectée" }, { status: 401 });
  const parsed = query.safeParse(new URL(request.url).searchParams.get("q"));
  if (!parsed.success) return NextResponse.json({ results: [] });
  const results = await dishMemories(session.user.id, parsed.data);
  return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
}
