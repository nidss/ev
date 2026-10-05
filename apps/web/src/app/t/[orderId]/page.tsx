import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { TicketingError, type PaymentMethod } from "@ev/core";
import { AutoRefresh } from "@/components/auto-refresh";
import { baht, tr } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { app, getLocale } from "@/lib/server";

export default async function TicketsPage(props: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { orderId } = await props.params;
  const { token = "" } = await props.searchParams;
  const locale = await getLocale();
  const t = dict(locale);

  let view;
  try {
    view = app().ticketing.getOrder(orderId, token);
  } catch (err) {
    if (err instanceof TicketingError) notFound();
    throw err;
  }
  const { order, catalog, attendees } = view;
  const { event } = catalog;
  const last = view.payments.at(-1);
  const checkoutUrl = `/e/${event.slug}/checkout/${order.id}?token=${encodeURIComponent(token)}`;

  if (order.status === "pending_payment") {
    const failed = last?.status === "failed";
    return (
      <Shell>
        {!failed && <AutoRefresh />}
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

  const tickets = await Promise.all(
    attendees.map(async (a) => {
      const tt = catalog.ticketTypes.find((x) => x.id === a.ticketTypeId)!;
      const slot = a.slotId ? catalog.slots.find((s) => s.id === a.slotId) : null;
      return {
        a,
        name: tr(tt.name, locale),
        validFor: slot ? tr(slot.label, locale) : t.wholeEvent,
        qrSvg: await QRCode.toString(a.qrToken, { type: "svg", margin: 1, errorCorrectionLevel: "M" }),
      };
    }),
  );
  const addons = order.items.filter((i) => i.kind === "addon");
  const methodLabel: Record<PaymentMethod, string> = {
    card: t.pmCard,
    promptpay: t.pmPromptpay,
    mobile_banking: t.pmMobileBanking,
  };

  return (
    <Shell wide>
      <div className="card p-6 text-center">
        <div className="text-4xl">🎉</div>
        <h1 className="mt-2 text-2xl font-bold">{t.successTitle}</h1>
        <p className="mt-1 text-sm text-muted">{t.successBody}</p>
        <p className="mt-3 text-sm">
          {tr(event.name, locale)} · {t.orderCode} <span className="font-mono font-semibold">{order.orderCode}</span>
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {tickets.map(({ a, name, validFor, qrSvg }) => (
          <article key={a.id} className="card overflow-hidden">
            <div className="bg-brand px-4 py-2 text-sm font-semibold text-brand-ink">{name}</div>
            <div className="flex gap-4 p-4">
              <div
                className="h-32 w-32 shrink-0 rounded-lg bg-white p-1"
                // QR เป็น SVG ที่ server สร้างจาก token ที่เซ็นแล้ว (ไม่มี input จากผู้ใช้)
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
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

      {addons.length > 0 && (
        <section className="card mt-4 p-5 text-sm">
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

      <section className="card mt-4 p-5 text-sm">
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
    </Shell>
  );
}

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <main className={`mx-auto px-4 py-10 ${wide ? "max-w-3xl" : "max-w-md"}`}>{children}</main>;
}
