"use client";

import { useSearchParams } from "next/navigation";
import { Loading } from "@/components/loading";
import { NotFoundBox } from "@/components/not-found-box";
import { QrSvg } from "@/components/qr-svg";
import { useBackend } from "@/lib/backend";
import { useLocale } from "@/lib/locale";
import { PrintButton } from "./print-button";

// badge สำหรับพิมพ์ (ขนาดประมาณ A6) — QR เดียวกับ e-ticket
export function BadgeView() {
  const { locale } = useLocale();
  const attendeeId = useSearchParams().get("id") ?? "";
  const b = useBackend();
  if (!b) return <Loading />;
  const { ticketing } = b;
  const a = ticketing.store.attendees.get(attendeeId);
  if (!a) return <NotFoundBox />;
  const tt = ticketing.catalog.ticketTypes.find((x) => x.id === a.ticketTypeId)!;
  return (
    <main className="mx-auto max-w-sm px-4 py-8">
      <div className="card overflow-hidden text-center print:border-black">
        <div className="bg-brand px-4 py-3 text-sm font-bold text-brand-ink">{ticketing.catalog.event.name[locale]}</div>
        <div className="p-6">
          <div className="text-3xl font-bold leading-tight">{a.firstName}</div>
          <div className="text-xl">{a.lastName}</div>
          {a.company && <div className="mt-2 text-muted">{a.company}</div>}
          <QrSvg value={a.qrToken} className="mx-auto mt-4 h-40 w-40 p-1" />
          <div className="mt-2 font-mono text-sm">{a.ticketCode}</div>
          <div className="mt-3 inline-block rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">{tt.name[locale]}</div>
        </div>
      </div>
      <PrintButton />
    </main>
  );
}
