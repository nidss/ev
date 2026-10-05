"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loading } from "@/components/loading";
import { useBackend } from "@/lib/backend";
import { baht, dayLabel } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import { od } from "@/lib/onsite-i18n";

// Dashboard ผู้จัด — อัปเดตทันทีเมื่อข้อมูลเปลี่ยน รวมถึงจากแท็บอื่น (ระบบจริง: Redis counter + SSE)
export function DashboardView({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const q = useSearchParams().get("date");
  const b = useBackend();
  if (!b) return <Loading />;
  const t = od(locale);
  const { onsite, ticketing } = b;
  const dates = onsite.eventDates();
  const date = q && dates.includes(q) ? q : dates[0]!;
  const d = onsite.dashboard(date);
  const nf = (n: number) => n.toLocaleString(locale === "th" ? "th-TH" : "en-US");
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">{t.prototypeBanner}</p>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.dashboard}</h1>
          <p className="text-sm text-muted">
            {ticketing.catalog.event.name[locale]} · {t.liveNote}
          </p>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link href={`/org/${slug}/checkin`} className="btn-primary px-4 py-2">
            {t.checkinTitle}
          </Link>
          <Link href={`/org/${slug}/attendees`} className="rounded-xl border border-line px-4 py-2 hover:border-brand">
            {t.attendees}
          </Link>
          <Link href={`/org/${slug}/booths`} className="rounded-xl border border-line px-4 py-2 hover:border-brand">
            {t.boothsAndQr}
          </Link>
        </nav>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t.day}:</span>
        {dates.map((x) => (
          <Link
            key={x}
            href={`?date=${x}`}
            className={`rounded-full px-3 py-1 ${x === date ? "bg-brand text-brand-ink" : "border border-line hover:border-brand"}`}
          >
            {dayLabel(x, locale)}
          </Link>
        ))}
      </div>

      {/* KPI row */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label={t.checkedInToday} value={nf(d.totals.checkedInToday)} hero>
          <Meter value={d.totals.checkedInToday} max={d.totals.expectedToday} />
          <p className="mt-1 text-xs text-muted">{t.ofExpected(d.totals.expectedToday)}</p>
        </Tile>
        <Tile label={t.registered} value={nf(d.totals.registered)}>
          <p className="text-xs text-muted">{t.rejected(d.totals.rejectedToday, d.totals.offlineSynced)}</p>
        </Tile>
        <Tile label={t.revenue} value={baht(d.totals.revenueSatang, locale)}>
          <p className="text-xs text-muted">{t.orders(d.totals.ordersConfirmed, d.totals.ordersPending)}</p>
        </Tile>
        <Tile label={t.consentRate} value={pct(d.totals.consentRate)}>
          <Meter value={d.totals.consentRate} max={1} />
        </Tile>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold">{t.checkinsOverTime}</h2>
        <ColumnChart buckets={d.checkinsByHalfHour} unit={t.people} />
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted">{t.showTable}</summary>
          <table className="mt-2 w-full max-w-sm text-left">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 font-medium">{t.time}</th>
                <th className="py-1 text-right font-medium">{t.people}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {d.checkinsByHalfHour.map((b) => (
                <tr key={b.label} className="border-t border-line">
                  <td className="py-1">{b.label}</td>
                  <td className="py-1 text-right">{b.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold">{t.ticketTypes}</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 font-medium" />
                <th className="py-1 text-right font-medium">{t.sold}</th>
                <th className="py-1 text-right font-medium">{t.inToday}</th>
                <th className="py-1 text-right font-medium">{t.revenue}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {d.byTicketType.map((r) => (
                <tr key={r.ticketType.id} className="border-t border-line align-top">
                  <td className="py-2 pr-2">
                    {r.ticketType.name[locale]}
                    {r.quota !== null && (
                      <div className="mt-1 max-w-48">
                        <Meter value={r.sold} max={r.quota} />
                      </div>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {nf(r.sold)}
                    <span className="block text-xs text-muted">/ {r.quota === null ? t.unlimited : nf(r.quota)}</span>
                  </td>
                  <td className="py-2 text-right">{r.ticketType.kind === "workshop" ? "—" : nf(r.checkedInToday)}</td>
                  <td className="py-2 text-right">{r.revenueSatang ? baht(r.revenueSatang, locale) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="font-semibold">{t.workshops}</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {d.workshops.map((w) => (
                <li key={w.ticketType.id}>
                  <div className="flex justify-between gap-3">
                    <span className="min-w-0">
                      {w.ticketType.name[locale].replace(/^Workshop: /, "")}
                      <span className="block text-xs text-muted">{w.slot.label[locale]}</span>
                    </span>
                    <span className="whitespace-nowrap text-right tabular-nums">
                      {w.sold} / {w.capacity ?? "∞"} {t.seats}
                      {w.date === date && (
                        <span className="block text-xs text-muted">
                          {t.attended} {w.attended}
                        </span>
                      )}
                    </span>
                  </div>
                  {w.capacity !== null && <Meter value={w.sold} max={w.capacity} />}
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold">{t.checkpoints}</h2>
            <table className="mt-2 w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-1 font-medium" />
                  <th className="py-1 text-right font-medium">{t.accepted}</th>
                  <th className="py-1 text-right font-medium">{t.rejectedShort}</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {d.byCheckpoint.map((c) => (
                  <tr key={c.checkpoint.id} className="border-t border-line">
                    <td className="py-1.5">{c.checkpoint.name[locale]}</td>
                    <td className="py-1.5 text-right">{nf(c.accepted)}</td>
                    <td className="py-1.5 text-right">{c.rejected ? nf(c.rejected) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold">{t.boothTraffic}</h2>
        <BarList
          rows={d.booths.map((b) => ({
            key: b.booth.id,
            label: `${b.booth.code} · ${b.sponsor.name}`,
            value: b.uniqueVisitors,
            note: t.leadsConsented(b.consentedLeads),
            href: `/sponsor/${b.sponsor.id}`,
          }))}
        />
      </section>
    </main>
  );
}

function Tile(props: { label: string; value: string; hero?: boolean; children?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-muted">{props.label}</div>
      <div className={`mt-1 font-semibold ${props.hero ? "text-5xl" : "text-3xl"}`}>{props.value}</div>
      <div className="mt-2">{props.children}</div>
    </div>
  );
}

// meter: แถบเติม (สีหลัก) บนราง (สีเดียวกันแต่อ่อน)
function Meter({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-brand/15"
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className="h-full rounded-full bg-brand" style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

// กราฟแท่งแนวตั้ง สีเดียว — hover ที่คอลัมน์ไหนก็ได้เพื่อดูค่า
function ColumnChart({ buckets, unit }: { buckets: { label: string; count: number }[]; unit: string }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const top = Math.ceil(max / 10) * 10;
  return (
    <div className="mt-4">
      <div className="relative flex h-48 items-end gap-[2px] border-b border-line">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line" />
        <span className="pointer-events-none absolute -top-2 right-0 bg-surface pl-1 text-xs text-muted">{top}</span>
        {buckets.map((b) => (
          <div key={b.label} className="group relative flex h-full flex-1 items-end" tabIndex={0} aria-label={`${b.label} ${b.count} ${unit}`}>
            <div
              className="w-full rounded-t-[4px] bg-brand transition-opacity group-hover:opacity-80"
              style={{ height: `${(b.count / top) * 100}%`, minHeight: b.count ? 2 : 0 }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-xs text-bg group-hover:block group-focus:block">
              {b.label} · {b.count} {unit}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px] text-[10px] text-muted">
        {buckets.map((b, i) => (
          <span key={b.label} className="flex-1 text-center">
            {i % 2 === 0 ? b.label.slice(0, 2) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function BarList(props: { rows: { key: string; label: string; value: number; note: string; href: string }[] }) {
  const max = Math.max(1, ...props.rows.map((r) => r.value));
  return (
    <ul className="mt-3 space-y-2 text-sm">
      {props.rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,200px)_1fr_auto] items-center gap-3">
          <Link href={r.href} className="truncate hover:text-brand hover:underline">
            {r.label}
          </Link>
          <div className="h-4 rounded-r-[4px] bg-brand" style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value ? 4 : 0 }} title={`${r.value}`} />
          <span className="whitespace-nowrap text-right tabular-nums">
            {r.value} <span className="text-xs text-muted">· {r.note}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
