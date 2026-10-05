import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { signAttendeeCookie } from "@ev/core";
import { errorResponse, readJson } from "@/lib/api";
import { ATTENDEE_COOKIE, cookieSecret, ready } from "@/lib/server";

// ผู้เข้างานยืนยันตัวด้วยรหัสบัตร + อีเมล → cookie จำไว้ใช้กับทุกบูธ
export async function POST(req: Request, ctx: { params: Promise<{ qrSlug: string }> }) {
  try {
    const { qrSlug } = await ctx.params;
    const parsed = z.object({ ticketCode: z.string().min(1).max(20), email: z.string().min(3).max(200) }).safeParse(await readJson(req));
    if (!parsed.success) return NextResponse.json({ error: { code: "invalid_input" } }, { status: 422 });
    const { onsite } = await ready();
    onsite.boothBySlug(qrSlug);
    const a = onsite.identifyAttendee(parsed.data.ticketCode, parsed.data.email);
    (await cookies()).set(ATTENDEE_COOKIE, signAttendeeCookie(cookieSecret(), a.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE() {
  (await cookies()).delete(ATTENDEE_COOKIE);
  return NextResponse.json({ ok: true });
}
