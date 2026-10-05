import { NextResponse } from "next/server";
import { errorResponse, readJson } from "@/lib/api";
import { app } from "@/lib/server";

// ปุ่มในหน้า mock gateway: จำลองผลการจ่าย แล้วส่ง webhook ที่เซ็นแล้วเข้า handler ตัวเดียวกับ gateway จริง
export async function POST(req: Request, ctx: { params: Promise<{ chargeId: string }> }) {
  const { chargeId } = await ctx.params;
  const body = (await readJson(req)) as { outcome?: string } | null;
  const outcome = body?.outcome === "failed" ? "failed" : "succeeded";
  const { mockPayments, ticketing } = app();
  const charge = mockPayments.getCharge(chargeId);
  if (!charge) return NextResponse.json({ error: { code: "not_found" } }, { status: 404 });
  if (charge.status !== "pending") {
    return NextResponse.json({ error: { code: "invalid_state" }, returnUrl: charge.returnUrl }, { status: 409 });
  }
  try {
    const hook = mockPayments.simulate(chargeId, outcome);
    const result = await ticketing.handleWebhook(hook.headers, hook.body);
    return NextResponse.json({ ...result, returnUrl: charge.returnUrl });
  } catch (err) {
    return errorResponse(err);
  }
}
