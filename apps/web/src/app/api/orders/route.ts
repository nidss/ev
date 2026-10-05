import { NextResponse } from "next/server";
import { errorResponse, readJson } from "@/lib/api";
import { app } from "@/lib/server";

// สร้าง order + จองที่นั่ง — body: { slug, lines, unlockCode? }
export async function POST(req: Request) {
  try {
    const body = (await readJson(req)) as { slug?: unknown } | null;
    const slug = typeof body?.slug === "string" ? body.slug : "";
    const { order, accessToken } = app().ticketing.createOrder(slug, body);
    return NextResponse.json({ orderId: order.id, token: accessToken, expiresAt: order.expiresAt }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
