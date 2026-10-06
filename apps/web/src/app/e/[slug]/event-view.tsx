"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { FloorPlan, FloorPlanLegend } from "@/components/floor-plan";
import { Loading } from "@/components/loading";
import { TermsModal } from "@/components/terms-modal";
import { useBackend } from "@/lib/backend";
import { baht, dateRange, dayLabel, timeRange, tr } from "@/lib/format";
import { dict, isFreeEvent } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import { BASE_PATH } from "@/lib/paths";
import { TicketSelector, type WizardProduct, type WizardRound, type WizardTicket } from "./ticket-selector";

// หน้างาน: ข้อมูลงาน + เลือกบัตรได้ทันทีในหน้าเดียว (แนว Zipevent) + รายละเอียด / เงื่อนไข / ราคาบัตร
export function EventView({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const code = useSearchParams().get("code");
  const [termsOpen, setTermsOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const b = useBackend();
  if (!b) return <Loading />;
  const view = b.ticketing.getEventView(slug, { unlockCode: code });
  const { event, slots } = view.catalog;
  const free = isFreeEvent(view.catalog);
  const t = dict(locale, free);

  const prices = [...new Set(view.tickets.filter((x) => x.ticketType.isPublic).map((x) => x.ticketType.priceSatang))].sort(
    (a, b) => a - b,
  );
  const priceText = prices
    .map((p) => (p === 0 ? t.free : (p / 100).toLocaleString(locale === "th" ? "th-TH" : "en-US")))
    .join(" / ");
  const anyOnSale = view.rounds.some((r) => r.status === "on_sale");

  const tickets: Record<string, WizardTicket> = Object.fromEntries(
    view.tickets.map(({ ticketType: tt }) => [
      tt.id,
      {
        id: tt.id,
        kind: tt.kind,
        name: tr(tt.name, locale),
        description: tr(tt.description, locale),
        perks: tt.perks.map((p) => tr(p, locale)),
        priceSatang: tt.priceSatang,
        compareAtSatang: tt.compareAtSatang,
        maxPerOrder: tt.maxPerOrder,
        requiresAdmission: tt.requiresTicketTypeIds !== null,
        hidden: !tt.isPublic,
        wholeEvent: tt.slotIds === null,
      },
    ]),
  );

  const rounds: WizardRound[] = view.rounds.map((r) => ({
    date: r.date,
    label: dayLabel(r.date, locale),
    time: timeRange(r.startsAt, r.endsAt, locale),
    status: r.status,
    offers: r.offers.map((o) => {
      const slot = o.slotId ? slots.find((s) => s.id === o.slotId) : null;
      return { ...o, slotLabel: slot ? tr(slot.label, locale) : null };
    }),
  }));

  const products: WizardProduct[] = view.products.map(({ product: p, remaining }) => ({
    id: p.id,
    name: tr(p.name, locale),
    description: tr(p.description, locale),
    priceSatang: p.priceSatang,
    remaining,
    maxPerOrder: p.maxPerOrder,
    requiresAdmission: p.requiresTicketTypeIds !== null,
  }));

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <section className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
        <div
          className="relative flex aspect-[16/9] flex-col justify-end overflow-hidden rounded-2xl p-6 text-white shadow-sm md:aspect-[3/4]"
          style={{ background: `linear-gradient(160deg, ${event.coverGradient[0]}, ${event.coverGradient[1]})` }}
        >
          {event.coverImageUrl && (
            <>
              {/* static export ไม่มี image optimizer — ใช้ img ธรรมดาและใส่ basePath เอง */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${BASE_PATH}${event.coverImageUrl}`}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-[60%_center]"
              />
              {/* ไล่สีเข้มด้านล่างให้อ่านตัวอักษรบนรูปได้ */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.3) 55%, rgba(0,0,0,0) 85%)" }}
              />
            </>
          )}
          <div className="relative">
            <p className="text-xs font-semibold tracking-widest opacity-80">{event.shortCode}</p>
            <p className="mt-2 text-2xl font-bold leading-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">{tr(event.name, locale)}</p>
            <p className="mt-2 text-sm opacity-90">{dateRange(event.startsAt, event.endsAt, locale)}</p>
          </div>
        </div>

        <div className="card p-6">
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{tr(event.name, locale)}</h1>
          <p className="mt-2 text-muted">{tr(event.tagline, locale)}</p>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-[120px_1fr]">
            <dt className="text-muted">{t.date}</dt>
            <dd>{dateRange(event.startsAt, event.endsAt, locale)}</dd>
            <dt className="text-muted">{t.venue}</dt>
            <dd>
              {tr(event.venueName, locale)}
              <span className="block text-muted">{tr(event.venueAddress, locale)}</span>
            </dd>
            <dt className="text-muted">{t.priceList}</dt>
            <dd className="font-semibold">{free ? t.freeEntry : `${priceText} ${t.baht}`}</dd>
            <dt className="text-muted">{t.organizer}</dt>
            <dd>{event.organizerName}</dd>
          </dl>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {anyOnSale ? (
              <a href="#tickets" className="btn-primary px-10">
                {t.buyNow} ↓
              </a>
            ) : (
              <span className="btn-primary pointer-events-none px-10 opacity-40">{t.roundStatus.closed}</span>
            )}
            {view.catalog.floorPlan && (
              <a href="#floor-plan" className="text-sm font-medium text-brand underline">
                {t.floorPlanTitle}
              </a>
            )}
          </div>
        </div>
      </section>

      <TicketSelector
        locale={locale}
        slug={slug}
        free={free}
        holdMinutes={event.holdMinutes}
        rounds={rounds}
        tickets={tickets}
        products={products}
        unlock={view.unlock}
        agreed={agreed}
        onAgreedChange={setAgreed}
        onOpenTerms={() => setTermsOpen(true)}
      />

      <TermsModal
        locale={locale}
        doc={event.termsDocument}
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        onAccept={() => setAgreed(true)}
      />

      <div className={`grid gap-6 ${free ? "" : "lg:grid-cols-[1fr_380px]"}`}>
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-lg font-semibold">{t.about}</h2>
            <p className="mt-3 leading-relaxed text-muted">{tr(event.description, locale)}</p>
          </section>
          {view.catalog.floorPlan && (
            <section id="floor-plan" className="card scroll-mt-4 p-6">
              <h2 className="text-lg font-semibold">{t.floorPlanTitle}</h2>
              <p className="mt-1 text-sm text-muted">{t.floorPlanNote}</p>
              <FloorPlan catalog={view.catalog} locale={locale} className="mt-4 max-w-3xl" />
              <div className="mt-5">
                <FloorPlanLegend catalog={view.catalog} locale={locale} showExhibitors />
              </div>
            </section>
          )}
          <section id="terms" className="card scroll-mt-4 p-6">
            <h2 className="text-lg font-semibold">{t.termsTitle}</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
              {event.terms.map((term, i) => (
                <li key={i}>{tr(term, locale)}</li>
              ))}
              <li>{t.limitTerm}</li>
              {!free && <li>{t.holdTerm(event.holdMinutes)}</li>}
            </ol>
            {!free && (
              <>
                <h3 className="mt-5 text-sm font-semibold">{t.refundPolicy}</h3>
                <p className="mt-1 text-sm text-muted">{tr(event.refundPolicy, locale)}</p>
              </>
            )}
            <button
              type="button"
              className="mt-4 rounded-xl border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand-softer"
              onClick={() => setTermsOpen(true)}
            >
              {t.readFullTerms}
            </button>
          </section>
        </div>
        {!free && (
        <section className="card h-fit p-6">
          <h2 className="font-semibold">{t.priceList}</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {view.tickets
              .filter(({ ticketType: tt }) => tt.isPublic)
              .map(({ ticketType: tt }) => (
                <li key={tt.id} className="flex justify-between gap-3 py-2">
                  <span className="min-w-0">{tr(tt.name, locale)}</span>
                  <span className="whitespace-nowrap font-medium">
                    {tt.priceSatang === 0 ? t.free : baht(tt.priceSatang, locale)}
                  </span>
                </li>
              ))}
          </ul>
        </section>
        )}
      </div>
    </main>
  );
}
