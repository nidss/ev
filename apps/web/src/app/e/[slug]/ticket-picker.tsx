"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Locale, OrderLineInput, SaleState, TicketKind } from "@ev/core";
import { baht } from "@/lib/format";
import { dict, errorText } from "@/lib/i18n";

export interface PickerTicket {
  id: string;
  kind: TicketKind;
  name: string;
  description: string;
  perks: string[];
  priceSatang: number;
  compareAtSatang: number | null;
  saleState: SaleState;
  remaining: number | null;
  maxPerOrder: number;
  requiresAdmission: boolean;
  hidden: boolean;
  slots: { id: string; label: string; remaining: number | null }[];
}

export interface PickerProduct {
  id: string;
  name: string;
  description: string;
  priceSatang: number;
  remaining: number | null;
  maxPerOrder: number;
  requiresAdmission: boolean;
}

const ALMOST_FULL = 10;

export function TicketPicker(props: {
  locale: Locale;
  slug: string;
  holdMinutes: number;
  tickets: PickerTicket[];
  products: PickerProduct[];
  unlock: { code: string; valid: boolean } | null;
}) {
  const { locale, tickets, products } = props;
  const t = dict(locale);
  const router = useRouter();
  // key: ticketTypeId|slotId หรือ addon|productId
  const [qty, setQty] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, n: number) => setQty((q) => ({ ...q, [key]: Math.max(0, n) }));
  const typeTotal = (ticketId: string) =>
    Object.entries(qty)
      .filter(([k]) => k.startsWith(`${ticketId}|`))
      .reduce((a, [, v]) => a + v, 0);

  const lines = useMemo(() => {
    const out: { key: string; label: string; quantity: number; unit: number; input: OrderLineInput }[] = [];
    for (const tk of tickets) {
      const keys = tk.slots.length > 0 ? tk.slots.map((s) => ({ key: `${tk.id}|${s.id}`, slot: s })) : [{ key: `${tk.id}|`, slot: null }];
      for (const { key, slot } of keys) {
        const n = qty[key] ?? 0;
        if (n <= 0) continue;
        out.push({
          key,
          label: slot && tk.slots.length > 1 ? `${tk.name} · ${slot.label}` : tk.name,
          quantity: n,
          unit: tk.priceSatang,
          input: { kind: "ticket", ticketTypeId: tk.id, slotId: slot?.id ?? null, quantity: n },
        });
      }
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
  }, [qty, tickets, products]);

  const total = lines.reduce((a, l) => a + l.unit * l.quantity, 0);
  const hasAdmission = tickets.some((tk) => !tk.requiresAdmission && typeTotal(tk.id) > 0);
  const needsAdmission =
    tickets.some((tk) => tk.requiresAdmission && typeTotal(tk.id) > 0) ||
    products.some((p) => p.requiresAdmission && (qty[`addon|${p.id}`] ?? 0) > 0);
  const blocked = needsAdmission && !hasAdmission;
  const hasTicket = lines.some((l) => l.input.kind === "ticket");

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: props.slug,
          lines: lines.map((l) => l.input),
          unlockCode: props.unlock?.valid ? props.unlock.code : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.code);
      router.push(`/e/${props.slug}/checkout/${data.orderId}?token=${encodeURIComponent(data.token)}`);
    } catch (e) {
      setError(errorText(locale, (e as Error).message));
      setBusy(false);
    }
  }

  const admission = tickets.filter((tk) => tk.kind !== "workshop");
  const workshops = tickets.filter((tk) => tk.kind === "workshop");

  const stateText = (s: SaleState) =>
    s === "sold_out" ? t.soldOut : s === "not_started" ? t.notStarted : s === "ended" ? t.ended : null;

  const availabilityText = (remaining: number | null) => {
    if (remaining === null) return null;
    if (remaining <= 0) return <span className="text-red-600">{t.soldOut}</span>;
    if (remaining <= ALMOST_FULL) return <span className="font-medium text-amber-600">{t.almostFull(remaining)}</span>;
    return <span>{t.remaining(remaining)}</span>;
  };

  // ฟังก์ชัน render ธรรมดา (ไม่ใช่ component ซ้อน) เพื่อไม่ให้ปุ่ม remount ทุกครั้งที่กด
  function renderTicket(tk: PickerTicket) {
    const onSale = tk.saleState === "on_sale";
    const used = typeTotal(tk.id);
    const rows = tk.slots.length > 0 ? tk.slots : [null];
    return (
      <div key={tk.id} className={`card p-5 ${onSale ? "" : "opacity-60"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">
              {tk.name}
              {tk.hidden && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">🔓</span>}
            </h3>
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
            {tk.compareAtSatang && (
              <div className="text-xs text-muted line-through">{baht(tk.compareAtSatang, locale)}</div>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2 border-t border-line pt-3">
          {tk.slots.length > 1 && <p className="text-xs font-medium text-muted">{t.chooseDay}</p>}
          {rows.map((slot) => {
            const key = `${tk.id}|${slot?.id ?? ""}`;
            const n = qty[key] ?? 0;
            const remaining = slot ? slot.remaining : tk.remaining;
            const cap = Math.min(tk.maxPerOrder - (used - n), remaining ?? Infinity);
            return (
              <div key={key} className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  <div>{slot ? slot.label : tk.kind === "workshop" ? "" : t.wholeEvent}</div>
                  <div className="text-xs text-muted">
                    {stateText(tk.saleState) ?? availabilityText(remaining)}
                    {onSale && <span className="ml-2">· {t.perOrderMax(tk.maxPerOrder)}</span>}
                  </div>
                </div>
                <Stepper value={n} max={onSale ? cap : 0} onChange={(v) => set(key, v)} />
              </div>
            );
          })}
          {tk.requiresAdmission && <p className="text-xs text-muted">ⓘ {t.needsAdmission}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 pb-28 lg:grid-cols-[1fr_360px] lg:pb-0">
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-xl font-bold">{t.admission}</h2>
          <div className="space-y-3">
            {admission.map(renderTicket)}
          </div>
          <form method="get" className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <label htmlFor="code" className="text-muted">
              {t.haveCode}
            </label>
            <input id="code" name="code" defaultValue={props.unlock?.code ?? ""} className="field max-w-40 py-1.5" />
            <button className="rounded-lg border border-line px-3 py-1.5 hover:border-brand">{t.applyCode}</button>
            {props.unlock &&
              (props.unlock.valid ? (
                <span className="text-brand">{t.codeUnlocked(props.unlock.code)}</span>
              ) : (
                <span className="text-red-600">{t.codeInvalid}</span>
              ))}
          </form>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold">{t.workshops}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {workshops.map(renderTicket)}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold">{t.addons}</h2>
          <div className="card divide-y divide-line">
            {products.map((p) => {
              const key = `addon|${p.id}`;
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted">
                      {p.description} · {availabilityText(p.remaining)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{baht(p.priceSatang, locale)}</span>
                    <Stepper
                      value={qty[key] ?? 0}
                      max={Math.min(p.maxPerOrder, p.remaining ?? Infinity)}
                      onChange={(v) => set(key, v)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">ⓘ {t.noSeatMap}</p>
        </section>
      </div>

      {/* สรุปคำสั่งซื้อ: sticky ด้านขวาบนจอใหญ่ / แถบล่างบนมือถือ */}
      <aside className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface p-4 shadow-lg lg:sticky lg:top-4 lg:self-start lg:rounded-2xl lg:border lg:shadow-none">
        <h2 className="hidden font-semibold lg:block">{t.summary}</h2>
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
          <button className="btn-primary lg:hidden" disabled={!hasTicket || blocked || busy} onClick={submit}>
            {busy ? t.processing : total === 0 ? t.register : t.buy}
          </button>
        </div>
        {blocked && <p className="mt-2 text-xs text-amber-600">{t.workshopNeedsAdmission}</p>}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <button className="btn-primary mt-3 hidden w-full lg:flex" disabled={!hasTicket || blocked || busy} onClick={submit}>
          {busy ? t.processing : total === 0 ? t.register : t.buy}
        </button>
        <p className="mt-2 hidden text-xs text-muted lg:block">{t.holdNote(props.holdMinutes)}</p>
      </aside>
    </div>
  );
}

function Stepper({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
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
