"use client";

import Link from "next/link";
import { Loading } from "@/components/loading";
import { useBackend } from "@/lib/backend";
import { baht, dateRange, dayLabel, timeRange, tr } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";

// หน้างาน: ข้อมูลงาน + ราคาบัตร + รายการรอบพร้อมปุ่มซื้อ (แนว ThaiTicketMajor / Zipevent)
export function EventView({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const b = useBackend();
  if (!b) return <Loading />;
  const t = dict(locale);
  const view = b.ticketing.getEventView(slug);
  const { event } = view.catalog;
  const prices = [...new Set(view.tickets.map((x) => x.ticketType.priceSatang))].sort((a, b) => a - b);
  const priceText = prices
    .map((p) => (p === 0 ? t.free : (p / 100).toLocaleString(locale === "th" ? "th-TH" : "en-US")))
    .join(" / ");
  const anyOnSale = view.rounds.some((r) => r.status === "on_sale");
  const buyHref = `/e/${slug}/buy`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-28 md:pb-8">
      <section className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
        <div
          className="flex aspect-[16/9] flex-col justify-end rounded-2xl p-6 text-white shadow-sm md:aspect-[3/4]"
          style={{ background: `linear-gradient(160deg, ${event.coverGradient[0]}, ${event.coverGradient[1]})` }}
        >
          <p className="text-xs font-semibold tracking-widest opacity-80">{event.shortCode}</p>
          <p className="mt-2 text-2xl font-bold leading-tight">{tr(event.name, locale)}</p>
          <p className="mt-2 text-sm opacity-80">{dateRange(event.startsAt, event.endsAt, locale)}</p>
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
            <dd className="font-semibold">
              {priceText} {t.baht}
            </dd>
            <dt className="text-muted">{t.organizer}</dt>
            <dd>{event.organizerName}</dd>
          </dl>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {anyOnSale ? (
              <Link href={buyHref} className="btn-primary px-10">
                {t.buyNow}
              </Link>
            ) : (
              <span className="btn-primary pointer-events-none px-10 opacity-40">{t.roundStatus.closed}</span>
            )}
            <span className="text-xs text-muted">{t.noSeatMap}</span>
          </div>
        </div>
      </section>

      <section className="card mt-6 overflow-hidden">
        <h2 className="border-b border-line px-6 py-4 font-semibold">{t.roundsTitle}</h2>
        <ul className="divide-y divide-line">
          {view.rounds.map((r) => (
            <li key={r.date} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div>
                <div className="font-medium">{dayLabel(r.date, locale)}</div>
                <div className="text-sm text-muted">{timeRange(r.startsAt, r.endsAt, locale)}</div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={r.status} label={t.roundStatus[r.status]!} />
                {r.status === "on_sale" && (
                  <Link
                    href={`${buyHref}?round=${r.date}`}
                    className="rounded-xl border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/5"
                  >
                    {t.buyNow}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-lg font-semibold">{t.about}</h2>
            <p className="mt-3 leading-relaxed text-muted">{tr(event.description, locale)}</p>
          </section>
          <section className="card p-6">
            <h2 className="text-lg font-semibold">{t.terms}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
              {event.terms.map((term, i) => (
                <li key={i}>{tr(term, locale)}</li>
              ))}
            </ul>
            <h3 className="mt-5 text-sm font-semibold">{t.refundPolicy}</h3>
            <p className="mt-1 text-sm text-muted">{tr(event.refundPolicy, locale)}</p>
          </section>
        </div>
        <section className="card h-fit p-6">
          <h2 className="font-semibold">{t.priceList}</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {view.tickets.map(({ ticketType: tt }) => (
              <li key={tt.id} className="flex justify-between gap-3 py-2">
                <span className="min-w-0">{tr(tt.name, locale)}</span>
                <span className="whitespace-nowrap font-medium">
                  {tt.priceSatang === 0 ? t.free : baht(tt.priceSatang, locale)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* มือถือ: ปุ่มซื้อบัตรติดล่างจอ */}
      {anyOnSale && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface p-4 md:hidden">
          <Link href={buyHref} className="btn-primary w-full">
            {t.buyNow}
          </Link>
        </div>
      )}
    </main>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const color =
    status === "on_sale"
      ? "bg-emerald-100 text-emerald-800"
      : status === "sold_out"
        ? "bg-red-100 text-red-700"
        : "bg-slate-100 text-slate-600";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{label}</span>;
}
