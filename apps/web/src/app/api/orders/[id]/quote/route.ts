import { NextResponse } from "next/server";
import { errorResponse, readJson } from "@/lib/api";
import { app } from "@/lib/server";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const token = req.headers.get("x-order-token") ?? "";
    const q = app().ticketing.quote(id, token, await readJson(req));
    return NextResponse.json({
      subtotalSatang: q.subtotalSatang,
      discountSatang: q.discountSatang,
      feeSatang: q.feeSatang,
      totalSatang: q.totalSatang,
      vatSatang: q.vatSatang,
      promo: q.promo ? { code: q.promo.code, label: q.promo.label } : null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
