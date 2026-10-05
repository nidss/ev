import { NextResponse } from "next/server";
import { errorResponse, readJson } from "@/lib/api";
import { app } from "@/lib/server";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const token = req.headers.get("x-order-token") ?? "";
    const result = await app().ticketing.submitCheckout(id, token, await readJson(req));
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
