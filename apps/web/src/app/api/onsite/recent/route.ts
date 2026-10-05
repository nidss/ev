import { NextResponse } from "next/server";
import { ready } from "@/lib/server";

export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date") ?? "";
  const { onsite } = await ready();
  return NextResponse.json({ recent: onsite.recentCheckins(date) }, { headers: { "cache-control": "no-store" } });
}
