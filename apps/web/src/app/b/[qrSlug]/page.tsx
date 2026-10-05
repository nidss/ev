import { notFound } from "next/navigation";
import { TicketingError } from "@ev/core";
import { od } from "@/lib/onsite-i18n";
import { currentAttendeeId, getLocale, ready } from "@/lib/server";
import { BoothVisit } from "./booth-visit";

// หน้าที่ผู้เข้างานเห็นหลังสแกน QR บูธด้วยกล้องมือถือ
export default async function BoothVisitPage(props: { params: Promise<{ qrSlug: string }> }) {
  const { qrSlug } = await props.params;
  const locale = await getLocale();
  const t = od(locale);
  const { onsite, ticketing } = await ready();
  let info;
  try {
    info = onsite.boothBySlug(qrSlug);
  } catch (err) {
    if (err instanceof TicketingError) notFound();
    throw err;
  }
  const attendeeId = await currentAttendeeId();
  const attendee = attendeeId ? onsite.attendeeById(attendeeId) : null;
  const consented = attendeeId ? (ticketing.store.attendees.get(attendeeId)?.shareWithSponsors ?? false) : false;
  const { sponsor, booth } = info;
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <div className="card overflow-hidden">
        <div className="bg-brand px-5 py-4 text-brand-ink">
          <div className="text-xs font-semibold opacity-80">
            {t.welcomeBooth} · {booth.code} · Zone {booth.zone}
          </div>
          <h1 className="mt-1 text-2xl font-bold">{sponsor.name}</h1>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted">{sponsor.description[locale]}</p>
          <a href={sponsor.websiteUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-brand underline">
            {t.website} ↗
          </a>
          <div className="mt-5 border-t border-line pt-5">
            <BoothVisit
              locale={locale}
              qrSlug={qrSlug}
              attendeeName={attendee ? `${attendee.firstName} ${attendee.lastName}` : null}
              consented={consented}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
