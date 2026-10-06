"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TicketingError, type PaymentMethod } from "@ev/core";
import { Loading } from "@/components/loading";
import { NotFoundBox } from "@/components/not-found-box";
import { NameBadge } from "@/components/name-badge";
import { QrSvg } from "@/components/qr-svg";
import { useBackend } from "@/lib/backend";
import { baht, tr } from "@/lib/format";
import { dict, isFreeEvent } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";

export function TicketsView() {
  const { locale } = useLocale();
  const params = useSearchParams();
  const orderId = params.get("order") ?? "";
  const token = params.get("token") ?? "";
  const b = useBackend();
  if (!b) return <Loading />;

  let view;
  try {
    view = b.ticketing.getOrder(orderId, token);
  } catch (err) {
    if (err instanceof TicketingError) return <NotFoundBox />;
    throw err;
  }
  const { order, catalog, attendees } = view;
  const { event } = catalog;
  const free = isFreeEvent(catalog);
  const t = dict(locale, free);
  const last = view.payments.at(-1);
  const checkoutUrl = `/e/${event.slug}/checkout?order=${order.id}&token=${encodeURIComponent(token)}`;

  if (order.status === "pending_payment") {
    const failed = last?.status === "failed";
    return (
      <Shell>
        <div className="card p-8 text-center">
          <div className="text-4xl">{failed ? "⚠️" : "⏳"}</div>
          <h1 className="mt-3 text-xl font-bold">{failed ? t.failedTitle : t.checking}</h1>
          <p className="mt-2 text-sm text-muted">{failed ? t.paymentFailed : t.checkingBody}</p>
          {failed && (
            <Link href={checkoutUrl} className="btn-primary mt-6">
              {t.retryPayment}
            </Link>
          )}
        </div>
      </Shell>
    );
  }

  if (order.status !== "confirmed") {
    const title = order.status === "refunded" ? t.refundedTitle : order.status === "expired" ? t.expiredTitle : t.cancelledTitle;
    const body = order.status === "refunded" ? t.refundedBody : order.status === "expired" ? t.expiredBody : "";
    return (
      <Shell>
        <div className="card p-8 text-center">
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted">{body}</p>
          <Link href={`/e/${event.slug}`} className="btn-primary mt-6">
            {t.backToEvent}
          </Link>
        </div>
      </Shell>
    );
  }

  const tickets = attendees.map((a) => {
      const tt = catalog.ticketTypes.find((x) => x.id === a.ticketTypeId)!;
      const slot = a.slotId ? catalog.slots.find((s) => s.id === a.slotId) : null;
      return {
        a,
        name: tr(tt.name, locale),
        validFor: slot ? tr(slot.label, locale) : t.wholeEvent,
      };
    });
  const addons = order.items.filter((i) => i.kind === "addon");
  const methodLabel: Record<PaymentMethod, string> = {
    card: t.pmCard,
    promptpay: t.pmPromptpay,
    mobile_banking: t.pmMobileBanking,
  };

  return (
    <Shell wide>
      <div className="card p-6 text-center print:hidden">
        <div className="text-4xl">🎉</div>
        <h1 className="mt-2 text-2xl font-bold">{t.successTitle}</h1>
        <p className="mt-1 text-sm text-muted">{t.successBody}</p>
        <p className="mt-3 text-sm">
          {tr(event.name, locale)} · {t.orderCode} <span className="font-mono font-semibold">{order.orderCode}</span>
        </p>
      </div>

      {free ? (
        // งานลงทะเบียนฟรี: ได้ป้ายชื่อ (หน้า = ชื่อ + QR, หลัง = ผังงาน) แทน e-ticket
        <div className="mt-6 space-y-10 print:mt-0 print:space-y-0">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div>
              <h2 className="text-lg font-bold">{t.badgeTitle}</h2>
              <p className="text-xs text-muted">{t.badgePrintNote}</p>
            </div>
            <button type="button" className="btn-primary" onClick={() => window.print()}>
              🖨 {t.badgePrint}
            </button>
          </div>
          {tickets.map(({ a }) => (
            <section key={a.id} aria-label={`${a.firstName} ${a.lastName}`}>
              <NameBadge person={a} catalog={catalog} locale={locale} />
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {tickets.map(({ a, name, validFor }) => (
            <article key={a.id} className="card overflow-hidden">
              <div className="bg-brand px-4 py-2 text-sm font-semibold text-brand-ink">{name}</div>
              <div className="flex gap-4 p-4">
                <QrSvg value={a.qrToken} className="h-32 w-32 shrink-0 rounded-lg p-1" />
                <div className="min-w-0 text-sm">
                  <div className="font-semibold">
                    {a.firstName} {a.lastName}
                  </div>
                  {a.company && <div className="text-muted">{a.company}</div>}
                  <div className="mt-2 text-xs text-muted">{t.validFor}</div>
                  <div>{validFor}</div>
                  <div className="mt-2 text-xs text-muted">{t.ticketCode}</div>
                  <div className="font-mono font-semibold">{a.ticketCode}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {addons.length > 0 && (
        <section className="card mt-4 p-5 text-sm print:hidden">
          <ul className="space-y-1">
            {addons.map((i) => (
              <li key={i.id}>
                {i.quantity} × {tr(i.nameSnapshot, locale)}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">{t.addonPickup}</p>
        </section>
      )}

      {!free && (
        <section className="card mt-4 p-5 text-sm print:hidden">
          <h2 className="font-semibold">{t.receipt}</h2>
          <dl className="mt-2 space-y-1">
            {order.items.map((i) => (
              <div key={i.id} className="flex justify-between gap-3 text-muted">
                <dt>
                  {i.quantity} × {tr(i.nameSnapshot, locale)}
                </dt>
                <dd>{i.unitPriceSatang === 0 ? t.free : baht(i.unitPriceSatang * i.quantity, locale)}</dd>
              </div>
            ))}
            {order.discountSatang > 0 && (
              <div className="flex justify-between text-muted">
                <dt>{t.discount}</dt>
                <dd>−{baht(order.discountSatang, locale)}</dd>
              </div>
            )}
            <div className="flex justify-between pt-1 font-bold">
              <dt>{t.total}</dt>
              <dd>{baht(order.totalSatang, locale)}</dd>
            </div>
            {order.vatSatang > 0 && <p className="text-xs text-muted">{t.vatIncluded(baht(order.vatSatang, locale))}</p>}
            {order.paymentMethod && (
              <p className="text-xs text-muted">
                {t.paidWith} {methodLabel[order.paymentMethod]} (mock)
              </p>
            )}
          </dl>
        </section>
      )}
    </Shell>
  );
}

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <main className={`mx-auto px-4 py-10 print:p-0 ${wide ? "max-w-3xl" : "max-w-md"}`}>{children}</main>;
}
