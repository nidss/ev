import { notFound } from "next/navigation";
import { TicketingError } from "@ev/core";
import { dateRange, tr } from "@/lib/format";
import { dict } from "@/lib/i18n";
import { app, getLocale } from "@/lib/server";
import { TicketPicker, type PickerProduct, type PickerTicket } from "./ticket-picker";

export default async function EventPage(props: {
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
  const { event } = view.catalog;

  const tickets: PickerTicket[] = view.tickets.map(({ ticketType: tt, saleState, remaining, slots }) => ({
    id: tt.id,
    kind: tt.kind,
    name: tr(tt.name, locale),
    description: tr(tt.description, locale),
    perks: tt.perks.map((p) => tr(p, locale)),
    priceSatang: tt.priceSatang,
    compareAtSatang: tt.compareAtSatang,
    saleState,
    remaining,
    maxPerOrder: tt.maxPerOrder,
    requiresAdmission: tt.requiresTicketTypeIds !== null,
    hidden: !tt.isPublic,
    slots: slots.map((s) => ({ id: s.slot.id, label: tr(s.slot.label, locale), remaining: s.remaining })),
  }));
  const products: PickerProduct[] = view.products.map(({ product: p, remaining }) => ({
    id: p.id,
    name: tr(p.name, locale),
    description: tr(p.description, locale),
    priceSatang: p.priceSatang,
    remaining,
    maxPerOrder: p.maxPerOrder,
    requiresAdmission: p.requiresTicketTypeIds !== null,
  }));

  return (
    <main>
      <section
        className="text-white"
        style={{ background: `linear-gradient(135deg, ${event.coverGradient[0]}, ${event.coverGradient[1]})` }}
      >
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <p className="text-sm font-medium opacity-80">{dateRange(event.startsAt, event.endsAt, locale)}</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">{tr(event.name, locale)}</h1>
          <p className="mt-3 max-w-2xl text-base opacity-90">{tr(event.tagline, locale)}</p>
          <p className="mt-4 text-sm opacity-80">📍 {tr(event.venueName, locale)}</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <TicketPicker
          locale={locale}
          slug={event.slug}
          holdMinutes={event.holdMinutes}
          tickets={tickets}
          products={products}
          unlock={view.unlock}
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
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
          <aside className="space-y-6">
            <section className="card p-6">
              <h2 className="text-sm font-semibold">{t.venue}</h2>
              <p className="mt-2 text-sm">{tr(event.venueName, locale)}</p>
              <p className="mt-1 text-sm text-muted">{tr(event.venueAddress, locale)}</p>
            </section>
            <section className="card p-6">
              <h2 className="text-sm font-semibold">{t.organizer}</h2>
              <p className="mt-2 text-sm">{event.organizerName}</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
