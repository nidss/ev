import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, readJson } from "@/lib/api";
import { ready } from "@/lib/server";

export async function PATCH(req: Request, ctx: { params: Promise<{ boothId: string; leadId: string }> }) {
  try {
    const { boothId, leadId } = await ctx.params;
    const parsed = z
      .object({ rating: z.enum(["hot", "warm", "cold"]).nullish(), notes: z.string().max(1000).optional() })
      .safeParse(await readJson(req));
    if (!parsed.success) return NextResponse.json({ error: { code: "invalid_input" } }, { status: 422 });
    const { onsite } = await ready();
    const patch = { ...(parsed.data.rating !== undefined ? { rating: parsed.data.rating } : {}), notes: parsed.data.notes };
    return NextResponse.json({ lead: onsite.updateLead(boothId, leadId, patch) });
  } catch (err) {
    return errorResponse(err);
  }
}
