"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { EventRound, Locale, OrderLineInput, SaleState, TicketKind } from "@ev/core";
import { Steps } from "@/components/steps";
import { baht } from "@/lib/format";
import { dict, errorText } from "@/lib/i18n";
import { api } from "@/lib/local-api";

export interface WizardTicket {
  id: string;
  kind: TicketKind;
  name: string;
  description: string;
  perks: string[];
  priceSatang: number;
  compareAtSatang: number | null;
  maxPerOrder: number;
  requiresAdmission: boolean;
  hidden: boolean;
  wholeEvent: boolean;
}

export interface WizardRound {
  date: string;
  label: string;
  time: string;
  status: EventRound["status"];
  offers: {
    ticketTypeId: string;
    slotId: string | null;
    slotLabel: string | null;
    remaining: number | null;
    saleState: SaleState;
  }[];
}

export interface WizardProduct {
  id: string;
  name: string;
  description: string;
  priceSatang: number;
  remaining: number | null;
  maxPerOrder: number;
  requiresAdmission: boolean;
}

const ALMOST_FULL = 10;
const offerKey = (o: { ticketTypeId: string; slotId: string | null }) => `${o.ticketTypeId}|${o.slotId ?? ""}`;

// เลือกบัตรบนหน้างาน (แบบ Zipevent): เลือกวัน → เลือกจำนวนบัตร / workshop / add-on → ยอมรับเงื่อนไข → ยืนยันบัตร
// วันที่เลือกเก็บใน URL (?round=YYYY-MM-DD) ให้ reload แล้วยังอยู่วันเดิม
export function TicketSelector(props: {
  locale: Locale;
  slug: string;
  holdMinutes: number;
  rounds: WizardRound[];
  tickets: Record<string, WizardTicket>;
  products: WizardProduct[];
  unlock: { code: string; valid: boolean } | null;
}) {
  const { locale, rounds, tickets, products } = props;
  const t = dict(locale);
  const router = useRouter();
  const params = useSearchParams();

  const round =
    rounds.find((r) => r.date === params.get("round") && r.status === "on_sale") ??
    rounds.find((r) => r.status === "on_sale") ??
    null;

  const [agree, setAgree] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [codeInput, setCodeInput] = useState(props.unlock?.code ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function go(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) sp.delete(k);
      else sp.set(k, v);
    }
    window.history.replaceState(null, "", `?${sp.toString()}`);
  }

  // ---------- ขั้น 3: คำนวณรายการที่เลือก ----------
  const offers = round?.offers ?? [];
  const typeTotal = (id: string) =>
    offers.filter((o) => o.ticketTypeId === id).reduce((a, o) => a + (qty[offerKey(o)] ?? 0), 0);

  const lines = useMemo(() => {
    const out: { key: string; label: string; quantity: number; unit: number; input: OrderLineInput }[] = [];
    for (const o of offers) {
      const n = qty[offerKey(o)] ?? 0;
      if (n <= 0) continue;
      const tk = tickets[o.ticketTypeId]!;
      out.push({
        key: offerKey(o),
        label: tk.name,
        quantity: n,
        unit: tk.priceSatang,
        input: { kind: "ticket", ticketTypeId: o.ticketTypeId, slotId: o.slotId, quantity: n },
      });
    }
    for (const p of products) {
      const n = qty[`addon|${p.id}`] ?? 0;
      if (n > 0) {
        out.push({
          key: `addon|${p.id}`,
          label: p.name,
          quantity: n,
          unit: p.priceSatang,
          input: { kind: "addon", productId: p.id, quantity: n },
        });
      }
    }
    return out;
  }, [qty, offers, tickets, products]);

  const total = lines.reduce((a, l) => a + l.unit * l.quantity, 0);
  const hasAdmission = lines.some((l) => l.input.kind === "ticket" && !tickets[l.input.ticketTypeId]!.requiresAdmission);
  const needsAdmission = lines.some((l) =>
    l.input.kind === "ticket"
      ? tickets[l.input.ticketTypeId]!.requiresAdmission
      : products.find((p) => p.id === (l.input as { productId: string }).productId)!.requiresAdmission,
  );
  const blocked = needsAdmission && !hasAdmission;
  const hasTicket = lines.some((l) => l.input.kind === "ticket");

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await api("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: props.slug,
          acceptTerms: true,
          lines: lines.map((l) => l.input),
          unlockCode: props.unlock?.valid ? props.unlock.code : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.code);
      router.push(`/e/${props.slug}/checkout?order=${data.orderId}&token=${encodeURIComponent(data.token)}`);
    } catch (e) {
      setError(errorText(locale, (e as Error).message));
      setBusy(false);
    }
  }

  function applyCode(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams(params.toString());
    if (codeInput.trim()) sp.set("code", codeInput.trim());
    else sp.delete("code");
    router.replace(`?${sp.toString()}`, { scroll: false }); // หน้าอ่าน code จาก URL แล้วแสดงบัตรที่ปลดล็อก
  }

  const availability = (remaining: number | null, state: SaleState) => {
    if (state === "not_started") return <span>{t.notStarted}</span>;
    if (state === "ended") return <span>{t.ended}</span>;
    if (state === "sold_out" || remaining === 0) return <span className="font-medium text-red-600">{t.soldOut}</span>;
    if (remaining === null) return null;
    if (remaining <= ALMOST_FULL) return <span className="font-medium text-amber-600">{t.almostFull(remaining)}</span>;
    return <span>{t.remaining(remaining)}</span>;
  };

  function renderOffer(o: WizardRound["offers"][number]) {
    const tk = tickets[o.ticketTypeId]!;
    const key = offerKey(o);
    const n = qty[key] ?? 0;
    const onSale = o.saleState === "on_sale";
    const cap = Math.min(tk.maxPerOrder - (typeTotal(tk.id) - n), o.remaining ?? Infinity);
    return (
      <div key={key} className={`card p-5 ${onSale ? "" : "opacity-60"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">
              {tk.name}
              {tk.hidden && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">🔓</span>}
            </h3>
            {o.slotLabel && tk.kind === "workshop" && <p className="mt-0.5 text-sm font-medium text-brand">{o.slotLabel}</p>}
            <p className="mt-1 text-sm text-muted">{tk.description}</p>
            {tk.perks.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {tk.perks.map((p) => (
                  <li key={p} className="rounded-full bg-bg px-2 py-0.5 text-xs text-muted">
                    ✓ {p}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{tk.priceSatang === 0 ? t.free : baht(tk.priceSatang, locale)}</div>
            {tk.compareAtSatang && <div className="text-xs text-muted line-through">{baht(tk.compareAtSatang, locale)}</div>}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
          <div className="text-xs text-muted">
            {tk.wholeEvent && <span className="mr-2 font-medium text-ink">{t.wholeEvent}</span>}
            {availability(o.remaining, o.saleState)}
            {onSale && <span className="ml-2">· {t.perOrderMax(tk.maxPerOrder)}</span>}
            {tk.requiresAdmission && <span className="mt-1 block">ⓘ {t.needsAdmission}</span>}
          </div>
          <Stepper value={n} max={onSale ? cap : 0} onChange={(v) => setQty((q) => ({ ...q, [key]: Math.max(0, v) }))} />
        </div>
      </div>
    );
  }

  const canConfirm = hasTicket && !blocked && agree && !busy;

  return (
    <section id="tickets" className="scroll-mt-4 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-bold">{t.tickets}</h2>
        <Steps locale={locale} current={1} />
      </div>

      {/* เลือกวัน (รอบ) */}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t.chooseRound}>
        {rounds.map((r) => {
          const open = r.status === "on_sale";
          const selected = round?.date === r.date;
          return (
            <button
              key={r.date}
              role="radio"
              aria-checked={selected}
              disabled={!open}
              onClick={() => {
                if (selected) return;
                setQty({});
                go({ round: r.date });
              }}
              className={`rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                selected ? "border-brand bg-brand/10" : "border-line bg-surface hover:border-brand"
              }`}
            >
              <span className="block text-sm font-semibold">{r.label}</span>
              <span className="text-xs text-muted">
                {r.time} · {t.roundStatus[r.status]}
              </span>
            </button>
          );
        })}
      </div>

      {!round ? (
        <p className="card p-6 text-sm text-muted">{t.roundStatus.closed}</p>
      ) : (
        <div className="grid gap-6 pb-40 lg:grid-cols-[1fr_360px] lg:pb-0">
          <div className="space-y-8">
            <div>
              <h3 className="mb-3 text-lg font-bold">{t.admission}</h3>
              <div className="space-y-3">
                {offers.filter((o) => tickets[o.ticketTypeId]!.kind !== "workshop").map(renderOffer)}
              </div>
              <form onSubmit={applyCode} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <label htmlFor="code" className="text-muted">
                  {t.haveCode}
                </label>
                <input id="code" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} className="field max-w-40 py-1.5" />
                <button className="rounded-lg border border-line px-3 py-1.5 hover:border-brand">{t.applyCode}</button>
                {props.unlock &&
                  (props.unlock.valid ? (
                    <span className="text-brand">{t.codeUnlocked(props.unlock.code)}</span>
                  ) : (
                    <span className="text-red-600">{t.codeInvalid}</span>
                  ))}
              </form>
            </div>

            {offers.some((o) => tickets[o.ticketTypeId]!.kind === "workshop") && (
              <div>
                <h3 className="mb-3 text-lg font-bold">{t.dayWorkshops}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {offers.filter((o) => tickets[o.ticketTypeId]!.kind === "workshop").map(renderOffer)}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-3 text-lg font-bold">{t.addons}</h3>
              <div className="card divide-y divide-line">
                {products.map((p) => {
                  const key = `addon|${p.id}`;
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted">
                          {p.description} · {availability(p.remaining, "on_sale")}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{baht(p.priceSatang, locale)}</span>
                        <Stepper
                          value={qty[key] ?? 0}
                          max={Math.min(p.maxPerOrder, p.remaining ?? Infinity)}
                          onChange={(v) => setQty((q) => ({ ...q, [key]: Math.max(0, v) }))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted">ⓘ {t.noSeatMap}</p>
            </div>
          </div>

          {/* สรุป: sticky ด้านขวาบนจอใหญ่ / แถบล่างบนมือถือ */}
          <aside className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface p-4 shadow-lg lg:sticky lg:top-4 lg:self-start lg:rounded-2xl lg:border lg:shadow-none">
            <h3 className="hidden font-semibold lg:block">{t.summary}</h3>
            <p className="hidden text-xs text-muted lg:block">
              {round.label} · {round.time}
            </p>
            <ul className="hidden space-y-2 py-3 text-sm lg:block">
              {lines.length === 0 && <li className="text-muted">{t.noneSelected}</li>}
              {lines.map((l) => (
                <li key={l.key} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    {l.quantity} × {l.label}
                  </span>
                  <span className="whitespace-nowrap">{l.unit === 0 ? t.free : baht(l.unit * l.quantity, locale)}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-4 lg:border-t lg:border-line lg:pt-3">
              <div>
                <div className="text-xs text-muted">{t.total}</div>
                <div className="text-xl font-bold">{baht(total, locale)}</div>
              </div>
              <button className="btn-primary lg:hidden" disabled={!canConfirm} onClick={confirm}>
                {busy ? t.processing : t.confirmTickets}
              </button>
            </div>
            <label className="mt-2 flex items-start gap-2 text-xs lg:mt-3 lg:text-sm">
              <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>
                {t.acceptTermsShort}{" "}
                <a href="#terms" className="text-brand underline">
                  {t.readTerms}
                </a>
              </span>
            </label>
            {blocked && <p className="mt-2 text-xs text-amber-600">{t.workshopNeedsAdmission}</p>}
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <button className="btn-primary mt-3 hidden w-full lg:flex" disabled={!canConfirm} onClick={confirm}>
              {busy ? t.processing : t.confirmTickets}
            </button>
            <p className="mt-2 hidden text-xs text-muted lg:block">{t.holdNote(props.holdMinutes)}</p>
          </aside>
        </div>
      )}
    </section>
  );
}

function Stepper({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        aria-label="-"
        className="h-8 w-8 rounded-full border border-line text-lg leading-none disabled:opacity-30"
        disabled={value <= 0}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="+"
        className="h-8 w-8 rounded-full border border-brand text-lg leading-none text-brand disabled:border-line disabled:text-muted disabled:opacity-30"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}
