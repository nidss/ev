import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, readJson } from "@/lib/api";
import { ready } from "@/lib/server";

export async function POST(req: Request) {
  try {
    const parsed = z.object({ attendeeId: z.string().min(1), uid: z.string().min(1).max(40) }).safeParse(await readJson(req));
    if (!parsed.success) return NextResponse.json({ error: { code: "invalid_input" } }, { status: 422 });
    const { onsite } = await ready();
    return NextResponse.json({ attendee: onsite.pairWristband(parsed.data.attendeeId, parsed.data.uid) });
  } catch (err) {
    return errorResponse(err);
  }
}
