import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getLocale, ready, requireEventSlug } from "@/lib/server";
import { PrintButton } from "./print-button";

// badge สำหรับพิมพ์ (ขนาดประมาณ A6) — QR เดียวกับ e-ticket
export default async function BadgePage(props: { params: Promise<{ slug: string; attendeeId: string }> }) {
  const { slug, attendeeId } = await props.params;
  if (!requireEventSlug(slug)) notFound();
  const locale = await getLocale();
  const { ticketing } = await ready();
  const a = ticketing.store.attendees.get(attendeeId);
  if (!a) notFound();
  const tt = ticketing.catalog.ticketTypes.find((x) => x.id === a.ticketTypeId)!;
  const qrSvg = await QRCode.toString(a.qrToken, { type: "svg", margin: 1 });
  return (
    <main className="mx-auto max-w-sm px-4 py-8">
      <div className="card overflow-hidden text-center print:border-black">
        <div className="bg-brand px-4 py-3 text-sm font-bold text-brand-ink">{ticketing.catalog.event.name[locale]}</div>
        <div className="p-6">
          <div className="text-3xl font-bold leading-tight">{a.firstName}</div>
          <div className="text-xl">{a.lastName}</div>
          {a.company && <div className="mt-2 text-muted">{a.company}</div>}
          <div className="mx-auto mt-4 h-40 w-40 bg-white p-1" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <div className="mt-2 font-mono text-sm">{a.ticketCode}</div>
          <div className="mt-3 inline-block rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">{tt.name[locale]}</div>
        </div>
      </div>
      <PrintButton />
    </main>
  );
}
