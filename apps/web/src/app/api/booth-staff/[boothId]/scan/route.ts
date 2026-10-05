import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, readJson } from "@/lib/api";
import { ready } from "@/lib/server";

export async function POST(req: Request, ctx: { params: Promise<{ boothId: string }> }) {
  try {
    const { boothId } = await ctx.params;
    const parsed = z
      .object({ id: z.uuid(), code: z.string().min(1).max(500), deviceName: z.string().max(60).default("") })
      .safeParse(await readJson(req));
    if (!parsed.success) return NextResponse.json({ error: { code: "invalid_input" } }, { status: 422 });
    const { onsite } = await ready();
    return NextResponse.json(onsite.staffScan({ ...parsed.data, boothId }));
  } catch (err) {
    return errorResponse(err);
  }
}
