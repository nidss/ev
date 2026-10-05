import { notFound } from "next/navigation";
import { TicketingError } from "@ev/core";
import { dayLabel, timeRange, tr } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { app, getLocale } from "@/lib/server";
import { BuyWizard, type WizardProduct, type WizardRound, type WizardTicket } from "./buy-wizard";

export default async function BuyPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { slug } = await props.params;
  const { code } = await props.searchParams;
  const locale = await getLocale();
  const t = dict(locale);

  let view;
  try {
    view = app().ticketing.getEventView(slug, { unlockCode: code ?? null });
  } catch (err) {
    if (err instanceof TicketingError && err.code === "not_found") notFound();
    throw err;
  }
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
