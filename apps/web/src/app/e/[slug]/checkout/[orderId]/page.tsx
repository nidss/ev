import { notFound, redirect } from "next/navigation";
import { TicketingError } from "@ev/core";
import { tr } from "@/lib/format";
import { app, getLocale } from "@/lib/server";
import { CheckoutForm, type CheckoutItem } from "./checkout-form";

export default async function CheckoutPage(props: {
  params: Promise<{ slug: string; orderId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug, orderId } = await props.params;
  const { token = "" } = await props.searchParams;
  const locale = await getLocale();

  let view;
  try {
    view = app().ticketing.getOrder(orderId, token);
  } catch (err) {
    if (err instanceof TicketingError) notFound();
    throw err;
  }
  const { order, catalog } = view;
  // ยืนยันแล้ว / หมดเวลา / คืนเงิน → ไปหน้าบัตร ซึ่งแสดงสถานะนั้นๆ
  if (order.status !== "pending_payment") redirect(`/t/${order.id}?token=${encodeURIComponent(token)}`);

  const items: CheckoutItem[] = order.items.map((item) => {
    const tt = item.ticketTypeId ? catalog.ticketTypes.find((x) => x.id === item.ticketTypeId)! : null;
    const slot = item.slotId ? catalog.slots.find((s) => s.id === item.slotId) : null;
    return {
      id: item.id,
      kind: item.kind,
      name: tr(item.nameSnapshot, locale),
      slotLabel: slot ? tr(slot.label, locale) : null,
      quantity: item.quantity,
      unitPriceSatang: item.unitPriceSatang,
      holderInfo: tt?.holderInfo ?? "buyer_only",
    };
  });
  const last = view.payments.at(-1);
  const promo = order.promoCodeId ? catalog.promoCodes.find((p) => p.id === order.promoCodeId) : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm text-muted">{tr(catalog.event.name, locale)}</p>
      <CheckoutForm
        locale={locale}
        slug={slug}
        orderId={order.id}
        orderCode={order.orderCode}
        token={token}
        items={items}
        totals={{
          subtotalSatang: order.subtotalSatang,
          discountSatang: order.discountSatang,
          feeSatang: order.feeSatang,
          totalSatang: order.totalSatang,
          vatSatang: order.vatSatang,
        }}
        unlockCode={order.unlockCode}
        holdSecondsLeft={view.holdSecondsLeft}
        lastPaymentFailed={last?.status === "failed"}
        initialBuyer={order.buyer}
        initialHolders={order.holders}
        initialPromo={promo ? { code: promo.code, label: tr(promo.label, locale) } : null}
      />
    </main>
  );
}
