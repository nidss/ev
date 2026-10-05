import { NextResponse } from "next/server";
import { ready } from "@/lib/server";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const { onsite } = await ready();
  return NextResponse.json({ results: onsite.search(q.slice(0, 100)) });
}
