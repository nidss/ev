"use client";

import { useSearchParams } from "next/navigation";
import { Loading } from "@/components/loading";
import { NameBadge } from "@/components/name-badge";
import { NotFoundBox } from "@/components/not-found-box";
import { useBackend } from "@/lib/backend";
import { useLocale } from "@/lib/locale";
import { PrintButton } from "./print-button";

// ป้ายชื่อสำหรับพิมพ์ที่หน้างาน (10 × 14 ซม. 2 หน้า) — QR เดียวกับที่ผู้เข้างานได้ตอนลงทะเบียน
export function BadgeView() {
  const { locale } = useLocale();
  const attendeeId = useSearchParams().get("id") ?? "";
  const b = useBackend();
  if (!b) return <Loading />;
  const { ticketing } = b;
  const a = ticketing.store.attendees.get(attendeeId);
  if (!a) return <NotFoundBox />;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 print:p-0">
      <NameBadge person={a} catalog={ticketing.catalog} locale={locale} />
      <div className="mx-auto max-w-sm">
        <PrintButton />
      </div>
    </main>
  );
}
