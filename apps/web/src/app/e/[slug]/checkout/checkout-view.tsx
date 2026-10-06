"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { TicketingError } from "@ev/core";
import { Loading } from "@/components/loading";
import { NotFoundBox } from "@/components/not-found-box";
import { useBackend } from "@/lib/backend";
import { tr } from "@/lib/format";
import { isFreeEvent } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import { CheckoutForm, type CheckoutItem } from "./checkout-form";

export function CheckoutView({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const params = useSearchParams();
  const orderId = params.get("order") ?? "";
  const token = params.get("token") ?? "";
  const router = useRouter();
  const b = useBackend();

  let view = null;
  if (b) {
    try {
      view = b.ticketing.getOrder(orderId, token);
    } catch (err) {
      if (!(err instanceof TicketingError)) throw err;
    }
  }
  const status = view?.order.status;
  // ยืนยันแล้ว / หมดเวลา / คืนเงิน → ไปหน้าบัตร ซึ่งแสดงสถานะนั้นๆ
  useEffect(() => {
    if (status && status !== "pending_payment") router.replace(`/t?order=${orderId}&token=${encodeURIComponent(token)}`);
  }, [status, orderId, token, router]);

  if (!b) return <Loading />;
  if (!view) return <NotFoundBox />;
  const { order, catalog } = view;

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
        eventFree={isFreeEvent(catalog)}
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
