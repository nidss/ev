import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { app } from "@/lib/server";

// รับผลการชำระเงินจาก gateway (ตรวจลายเซ็นใน provider.verifyWebhook) — ตอนนี้มีแค่ mock
export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (provider !== "mock") return NextResponse.json({ error: { code: "not_found" } }, { status: 404 });
  try {
    const result = await app().ticketing.handleWebhook(Object.fromEntries(req.headers), await req.text());
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
