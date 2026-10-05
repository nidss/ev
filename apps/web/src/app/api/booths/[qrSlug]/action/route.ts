import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, readJson } from "@/lib/api";
import { currentAttendeeId, ready } from "@/lib/server";

export async function POST(req: Request, ctx: { params: Promise<{ qrSlug: string }> }) {
  try {
    const { qrSlug } = await ctx.params;
    const parsed = z.object({ action: z.enum(["visit", "interested", "request_info"]) }).safeParse(await readJson(req));
    if (!parsed.success) return NextResponse.json({ error: { code: "invalid_input" } }, { status: 422 });
    const attendeeId = await currentAttendeeId();
    if (!attendeeId) return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });
    const { onsite } = await ready();
    const lead = onsite.attendeeBoothAction(qrSlug, attendeeId, parsed.data.action);
    return NextResponse.json({ interestLevel: lead.interestLevel });
  } catch (err) {
    return errorResponse(err);
  }
}
