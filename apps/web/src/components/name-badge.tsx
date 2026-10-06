import type { Catalog, Locale, TicketKind } from "@ev/core";
import { FloorPlan, FloorPlanLegend } from "@/components/floor-plan";
import { QrSvg } from "@/components/qr-svg";
import { dateRange, tr } from "@/lib/format";
import { dict } from "@/lib/i18n";

export interface BadgePerson {
  firstName: string;
  lastName: string;
  company: string | null;
  jobTitle: string | null;
  qrToken: string;
  ticketCode: string;
  ticketTypeId: string;
}

// แถบล่างของด้านหน้าแยกสีตามประเภทผู้เข้างาน ให้เจ้าหน้าที่มองจากระยะไกลได้ (มีข้อความกำกับเสมอ)
const TYPE_BAND: Partial<Record<TicketKind, string>> = {
  general: "#0f766e",
  trade: "#1e3a8a",
  press: "#b91c1c",
};

// ป้ายชื่อ 10 × 14 ซม.: ด้านหน้า = ชื่อ บริษัท QR / ด้านหลัง = ผังงานแบ่งสีตามหมวดสินค้า
// ตอนพิมพ์ แต่ละด้านขึ้นหน้าใหม่ (พิมพ์ 2 หน้า กลับด้านตามขอบยาว)
export function NameBadge({ person, catalog, locale }: { person: BadgePerson; catalog: Catalog; locale: Locale }) {
  const t = dict(locale);
  const { event } = catalog;
  const tt = catalog.ticketTypes.find((x) => x.id === person.ticketTypeId);
  const band = (tt && TYPE_BAND[tt.kind]) ?? "#334155";

  return (
    <div className="flex flex-wrap justify-center gap-6 print:block">
      <figure className="w-full max-w-[360px] print:max-w-none">
        <figcaption className="mb-2 text-center text-xs font-medium text-muted print:hidden">{t.badgeFront}</figcaption>
        <article className="badge-face badge-light flex flex-col overflow-hidden rounded-2xl border border-line shadow-sm">
          <header className="px-5 py-3" style={{ background: "#0f766e", color: "#ffffff" }}>
            <div className="text-base font-bold leading-tight">{tr(event.name, locale)}</div>
            <div className="mt-0.5 text-[11px] leading-snug opacity-90">{dateRange(event.startsAt, event.endsAt, locale)}</div>
            <div className="text-[11px] leading-snug opacity-90">{tr(event.venueName, locale)}</div>
          </header>
          <div className="flex flex-1 flex-col items-center justify-center px-5 py-3 text-center">
            <div className="max-w-full break-words text-[28px] font-bold leading-tight">{person.firstName}</div>
            <div className="max-w-full break-words text-lg leading-tight">{person.lastName}</div>
            {person.company && <div className="mt-1.5 max-w-full break-words text-sm font-medium">{person.company}</div>}
            {person.jobTitle && <div className="max-w-full break-words text-xs text-muted">{person.jobTitle}</div>}
            <QrSvg value={person.qrToken} className="mt-3 h-36 w-36 p-1" />
            <div className="mt-1 font-mono text-xs font-semibold">{person.ticketCode}</div>
            <div className="text-[10px] text-muted">{t.badgeShowQr}</div>
          </div>
          <footer className="px-5 py-2.5 text-center" style={{ background: band, color: "#ffffff" }}>
            <div className="text-sm font-bold tracking-wider">{tt ? t.typeLabel[tt.kind] ?? tr(tt.name, locale) : ""}</div>
            {tt && <div className="text-[11px] opacity-90">{tr(tt.name, locale)}</div>}
          </footer>
        </article>
      </figure>

      <figure className="w-full max-w-[360px] print:max-w-none">
        <figcaption className="mb-2 text-center text-xs font-medium text-muted print:hidden">{t.badgeBack}</figcaption>
        <article className="badge-face badge-light flex flex-col overflow-hidden rounded-2xl border border-line px-4 py-3 shadow-sm">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold">{catalog.floorPlan ? tr(catalog.floorPlan.title, locale) : t.floorPlanTitle}</h3>
            <span className="truncate text-[10px] text-muted">{tr(event.name, locale)}</span>
          </div>
          <FloorPlan catalog={catalog} locale={locale} variant="print" className="mt-2" />
          <div className="mt-3">
            <FloorPlanLegend catalog={catalog} locale={locale} variant="print" compact />
          </div>
          <p className="mt-auto pt-2 text-[10px] leading-snug text-muted">
            {t.floorPlanNote} · {t.badgeBackHint}
          </p>
          <div className="mt-1 flex justify-between text-[10px] text-muted">
            <span>
              {person.firstName} {person.lastName}
            </span>
            <span className="font-mono">{person.ticketCode}</span>
          </div>
        </article>
      </figure>
    </div>
  );
}
