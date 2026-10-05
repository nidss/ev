import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, readJson } from "@/lib/api";
import { ready } from "@/lib/server";
import { checkinBody } from "../schema";

// รับคิวการสแกนจากเครื่องที่เคยออฟไลน์ (ส่งซ้ำได้ — id ที่เครื่องสร้างกันข้อมูลซ้ำ)
export async function POST(req: Request) {
  try {
    const parsed = z.object({ scans: z.array(checkinBody).max(500) }).safeParse(await readJson(req));
    if (!parsed.success) return NextResponse.json({ error: { code: "invalid_input" } }, { status: 422 });
    const { onsite } = await ready();
    const results = onsite.syncCheckins(parsed.data.scans);
    return NextResponse.json({
      results: results.map((r) => ({ id: r.checkin?.id ?? null, result: r.result, duplicate: r.duplicate })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
