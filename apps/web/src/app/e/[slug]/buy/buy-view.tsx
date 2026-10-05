"use client";

import { useSearchParams } from "next/navigation";
import { Loading } from "@/components/loading";
import { useBackend } from "@/lib/backend";
import { dayLabel, timeRange, tr } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import { BuyWizard, type WizardProduct, type WizardRound, type WizardTicket } from "./buy-wizard";

export function BuyView({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const code = useSearchParams().get("code");
  const b = useBackend();
  if (!b) return <Loading />;
  const t = dict(locale);
  const view = b.ticketing.getEventView(slug, { unlockCode: code ?? null });
  const { event, slots } = view.catalog;

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

  const terms = [
    ...event.terms.map((x) => tr(x, locale)),
    t.limitTerm,
    t.holdTerm(event.holdMinutes),
    `${t.refundPolicy}: ${tr(event.refundPolicy, locale)}`,
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <p className="text-sm text-muted">{tr(event.name, locale)}</p>
      <BuyWizard
        locale={locale}
        slug={slug}
        holdMinutes={event.holdMinutes}
        terms={terms}
        rounds={rounds}
        tickets={tickets}
        products={products}
        unlock={view.unlock}
      />
    </main>
  );
}
