import { NextResponse } from "next/server";
import { errorResponse, readJson } from "@/lib/api";
import { ready } from "@/lib/server";
import { checkinBody } from "../schema";

// สแกน 1 ครั้งจากเครื่องที่ออนไลน์
export async function POST(req: Request) {
  try {
    const parsed = checkinBody.safeParse(await readJson(req));
    if (!parsed.success) return NextResponse.json({ error: { code: "invalid_input" } }, { status: 422 });
    const { onsite } = await ready();
    return NextResponse.json(onsite.checkIn(parsed.data));
  } catch (err) {
    return errorResponse(err);
  }
}
