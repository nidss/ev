import { NextResponse } from "next/server";
import { ready } from "@/lib/server";

// รายชื่อ + public key สำหรับเครื่องสแกนโหมดออฟไลน์
export async function GET() {
  const { onsite } = await ready();
  return NextResponse.json(onsite.snapshot(), { headers: { "cache-control": "no-store" } });
}
