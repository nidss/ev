"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import type { Buyer, Holder, HolderInfo, Locale, PaymentMethod } from "@ev/core";
import { Steps } from "@/components/steps";
import { baht } from "@/lib/format";
import { dict, errorText } from "@/lib/i18n";
import { api } from "@/lib/local-api";

export interface CheckoutItem {
  id: string;
  kind: "ticket" | "addon";
  name: string;
  slotLabel: string | null;
  quantity: number;
  unitPriceSatang: number;
  holderInfo: HolderInfo;
}

interface Totals {
  subtotalSatang: number;
  discountSatang: number;
  feeSatang: number;
  totalSatang: number;
  vatSatang: number;
}

interface HolderForm {
  sameAsBuyer: boolean;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
}

const COUNTRIES = ["TH", "CN", "JP", "KR", "SG", "MY", "ID", "VN", "PH", "LA", "KH", "MM", "IN", "AU", "US", "GB", "DE", "FR"];

export function CheckoutForm(props: {
  locale: Locale;
  slug: string;
  orderId: string;
  orderCode: string;
  token: string;
  items: CheckoutItem[];
  totals: Totals;
  unlockCode: string | null;
  holdSecondsLeft: number;
  lastPaymentFailed: boolean;
  initialBuyer: Buyer | null;
  initialHolders: Holder[];
  initialPromo: { code: string; label: string } | null;
}) {
  const { locale, items } = props;
  const t = dict(locale);
  const router = useRouter();

  const [secondsLeft, setSecondsLeft] = useState(props.holdSecondsLeft);
  useEffect(() => {
    const deadline = Date.now() + props.holdSecondsLeft * 1000;
    const id = setInterval(() => setSecondsLeft(Math.max(0, Math.round((deadline - Date.now()) / 1000))), 1000);
    return () => clearInterval(id);
  }, [props.holdSecondsLeft]);

  const [buyer, setBuyer] = useState({
    firstName: props.initialBuyer?.firstName ?? "",
    lastName: props.initialBuyer?.lastName ?? "",
    email: props.initialBuyer?.email ?? "",
    phone: props.initialBuyer?.phone ?? "",
    nationality: props.initialBuyer?.nationality ?? "TH",
  });

  // บัตรที่ต้องกรอกผู้ถือรายใบ
  const slots = useMemo(
    () =>
      items
        .filter((i) => i.kind === "ticket" && i.holderInfo !== "buyer_only")
        .flatMap((i) => Array.from({ length: i.quantity }, (_, index) => ({ item: i, index, key: `${i.id}#${index}` }))),
    [items],
  );
  const [holders, setHolders] = useState<Record<string, HolderForm>>(() =>
    Object.fromEntries(
      slots.map((s, n) => {
        const prev = props.initialHolders.find((h) => h.orderItemId === s.item.id && h.index === s.index);
        return [
          s.key,
          {
            sameAsBuyer: prev ? false : n === 0,
            firstName: prev?.firstName ?? "",
            lastName: prev?.lastName ?? "",
            email: prev?.email ?? "",
            company: prev?.company ?? "",
            jobTitle: prev?.jobTitle ?? "",
          },
        ];
      }),
    ),
  );
  const setHolder = (key: string, patch: Partial<HolderForm>) =>
    setHolders((h) => ({ ...h, [key]: { ...h[key]!, ...patch } }));

  const [totals, setTotals] = useState<Totals>(props.totals);
  const [promoInput, setPromoInput] = useState(props.initialPromo?.code ?? "");
  const [promo, setPromo] = useState(props.initialPromo);
  const [promoError, setPromoError] = useState<string | null>(null);

  const [wantTax, setWantTax] = useState(false);
  const [tax, setTax] = useState({ name: "", taxId: "", branch: "", address: "" });
  const [consents, setConsents] = useState({ shareWithSponsors: false, organizerMarketing: false });
  // ขั้น 4 กรอกข้อมูล → ขั้น 5 ตรวจสอบและชำระเงิน (อยู่หน้าเดียวกัน ข้อมูลไม่หายเมื่อย้อนกลับ)
  const [phase, setPhase] = useState<"info" | "review">("info");
  const [method, setMethod] = useState<PaymentMethod>("promptpay");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regionName = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);
  const headers = { "content-type": "application/json", "x-order-token": props.token };

  async function applyPromo(code: string | null) {
    setPromoError(null);
    const res = await api(`/api/orders/${props.orderId}/quote`, {
      method: "POST",
      headers,
      body: JSON.stringify({ promoCode: code }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPromoError(errorText(locale, data?.error?.code));
      return;
    }
    setTotals(data);
    setPromo(data.promo ? { code: data.promo.code, label: data.promo.label[locale] } : null);
    if (!code) setPromoInput("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      buyer: { ...buyer, phone: buyer.phone || null },
      holders: slots.map(({ item, index, key }) => {
        const h = holders[key]!;
        const src = h.sameAsBuyer ? { ...h, firstName: buyer.firstName, lastName: buyer.lastName, email: buyer.email } : h;
        return {
          orderItemId: item.id,
          index,
          firstName: src.firstName,
          lastName: src.lastName,
          email: src.email || null,
          company: src.company || null,
          jobTitle: src.jobTitle || null,
        };
      }),
      promoCode: promo?.code ?? null,
      consents,
      taxInvoice: wantTax ? tax : null,
      paymentMethod: totals.totalSatang > 0 ? method : null,
    };
    try {
      const res = await api(`/api/orders/${props.orderId}/checkout`, { method: "POST", headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.code);
      // redirectUrl เป็น path ภายในแอป (mock gateway) — router.push ใส่ basePath ให้เอง
      if (data.status === "redirect") router.push(data.redirectUrl);
      else router.push(`/t?order=${props.orderId}&token=${encodeURIComponent(props.token)}`);
    } catch (err) {
      setError(errorText(locale, (err as Error).message));
      setBusy(false);
    }
  }

  if (secondsLeft <= 0) {
    return (
      <div className="card mx-auto mt-10 max-w-md p-8 text-center">
        <h1 className="text-xl font-bold">{t.expiredTitle}</h1>
        <p className="mt-2 text-sm text-muted">{t.expiredBody}</p>
        <Link href={`/e/${props.slug}`} className="btn-primary mt-6">
          {t.backToEvent}
        </Link>
      </div>
    );
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const free = totals.totalSatang === 0;
  const holderName = (key: string) => {
    const h = holders[key]!;
    return h.sameAsBuyer ? `${buyer.firstName} ${buyer.lastName}` : `${h.firstName} ${h.lastName}`;
  };

  function onSubmit(e: React.FormEvent) {
    if (phase === "info") {
      e.preventDefault();
      setPhase("review");
      window.scrollTo({ top: 0 });
      return;
    }
    void submit(e);
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 space-y-6">
      <Steps locale={locale} current={phase === "info" ? 4 : 5} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">{phase === "info" ? t.checkout : t.reviewTitle}</h1>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${secondsLeft < 120 ? "bg-red-100 text-red-700" : "bg-brand/10 text-brand"}`}
            >
              ⏱ {t.timeLeft} {mm}:{ss}
            </span>
          </div>
          {props.lastPaymentFailed && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{t.paymentFailed}</p>
          )}

          {phase === "info" ? (
            <>
              <section className="card p-5">
                <h2 className="font-semibold">{t.buyer}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field label={t.firstName} value={buyer.firstName} onChange={(v) => setBuyer({ ...buyer, firstName: v })} required />
                  <Field label={t.lastName} value={buyer.lastName} onChange={(v) => setBuyer({ ...buyer, lastName: v })} required />
                  <Field label={t.email} type="email" value={buyer.email} onChange={(v) => setBuyer({ ...buyer, email: v })} required />
                  <Field label={t.phone} type="tel" value={buyer.phone} onChange={(v) => setBuyer({ ...buyer, phone: v })} />
                  <div>
                    <label className="label" htmlFor="nationality">
                      {t.nationality}
                    </label>
                    <select
                      id="nationality"
                      className="field"
                      value={buyer.nationality}
                      onChange={(e) => setBuyer({ ...buyer, nationality: e.target.value })}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {regionName.of(c)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {slots.length > 0 && (
                <section className="card p-5">
                  <h2 className="font-semibold">{t.holders}</h2>
                  <p className="mt-1 text-xs text-muted">{t.holdersNote}</p>
                  <div className="mt-4 space-y-4">
                    {slots.map(({ item, index, key }) => {
                      const h = holders[key]!;
                      const full = item.holderInfo === "full";
                      return (
                        <div key={key} className="rounded-xl border border-line p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-medium">
                              {item.name}
                              {item.slotLabel && <span className="text-muted"> · {item.slotLabel}</span>}
                              <span className="text-muted"> · {t.ticketN(index + 1)}</span>
                            </div>
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={h.sameAsBuyer}
                                onChange={(e) => setHolder(key, { sameAsBuyer: e.target.checked })}
                              />
                              {t.sameAsBuyer}
                            </label>
                          </div>
                          {!h.sameAsBuyer && (
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <Field label={t.firstName} value={h.firstName} onChange={(v) => setHolder(key, { firstName: v })} required />
                              <Field label={t.lastName} value={h.lastName} onChange={(v) => setHolder(key, { lastName: v })} required />
                              {full && (
                                <Field label={t.email} type="email" value={h.email} onChange={(v) => setHolder(key, { email: v })} required />
                              )}
                            </div>
                          )}
                          {full && (
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <Field label={t.company} value={h.company} onChange={(v) => setHolder(key, { company: v })} />
                              <Field label={t.jobTitle} value={h.jobTitle} onChange={(v) => setHolder(key, { jobTitle: v })} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section className="card p-5">
                <h2 className="font-semibold">{t.consents}</h2>
                <div className="mt-3 space-y-3 text-sm">
                  <label className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={consents.shareWithSponsors}
                      onChange={(e) => setConsents({ ...consents, shareWithSponsors: e.target.checked })}
                    />
                    <span>{t.consentSponsors}</span>
                  </label>
                  <label className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={consents.organizerMarketing}
                      onChange={(e) => setConsents({ ...consents, organizerMarketing: e.target.checked })}
                    />
                    <span>{t.consentMarketing}</span>
                  </label>
                </div>
              </section>

              {!free && (
                <section className="card p-5">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={wantTax} onChange={(e) => setWantTax(e.target.checked)} />
                    {t.taxInvoice}
                  </label>
                  {wantTax && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Field label={t.taxName} value={tax.name} onChange={(v) => setTax({ ...tax, name: v })} required />
                      <Field
                        label={t.taxId}
                        value={tax.taxId}
                        onChange={(v) => setTax({ ...tax, taxId: v.replace(/\D/g, "").slice(0, 13) })}
                        required
                        pattern="\d{13}"
                      />
                      <Field label={t.taxBranch} value={tax.branch} onChange={(v) => setTax({ ...tax, branch: v })} required />
                      <Field label={t.taxAddress} value={tax.address} onChange={(v) => setTax({ ...tax, address: v })} required />
                    </div>
                  )}
                </section>
              )}
            </>
          ) : (
            <>
              <section className="card p-5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">{t.buyer}</h2>
                  <button type="button" className="text-brand underline" onClick={() => setPhase("info")}>
                    {t.editInfo}
                  </button>
                </div>
                <p className="mt-2">
                  {buyer.firstName} {buyer.lastName} · {buyer.email}
                  {buyer.phone && ` · ${buyer.phone}`} · {regionName.of(buyer.nationality)}
                </p>
                {slots.length > 0 && (
                  <>
                    <h3 className="mt-4 font-semibold">{t.holders}</h3>
                    <ul className="mt-1 space-y-1 text-muted">
                      {slots.map(({ item, index, key }) => (
                        <li key={key}>
                          {item.name} · {t.ticketN(index + 1)} — <span className="text-ink">{holderName(key)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {wantTax && (
                  <p className="mt-4 text-muted">
                    {t.taxInvoice}: {tax.name} ({tax.taxId})
                  </p>
                )}
              </section>

              {!free && (
                <section className="card p-5">
                  <h2 className="font-semibold">{t.paymentMethod}</h2>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {(
                      [
                        ["promptpay", t.pmPromptpay, "▦"],
                        ["card", t.pmCard, "💳"],
                        ["mobile_banking", t.pmMobileBanking, "📱"],
                      ] as const
                    ).map(([value, label, icon]) => (
                      <label
                        key={value}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${method === value ? "border-brand bg-brand/5" : "border-line"}`}
                      >
                        <input type="radio" name="method" checked={method === value} onChange={() => setMethod(value)} />
                        <span aria-hidden>{icon}</span>
                        {label}
                      </label>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <aside className="card h-fit p-5 lg:sticky lg:top-4">
          <h2 className="font-semibold">{t.summary}</h2>
          <p className="text-xs text-muted">
            {t.orderCode} {props.orderCode}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="min-w-0">
                  {i.quantity} × {i.name}
                  {i.slotLabel && <span className="block text-xs text-muted">{i.slotLabel}</span>}
                </span>
                <span className="whitespace-nowrap">
                  {i.unitPriceSatang === 0 ? t.free : baht(i.unitPriceSatang * i.quantity, locale)}
                </span>
              </li>
            ))}
          </ul>

          {phase === "review" && (
            <div className="mt-4 border-t border-line pt-4">
              <label className="label" htmlFor="promo">
                {t.promo}
              </label>
              {promo ? (
                <div className="flex items-center justify-between rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">
                  <span>{t.promoApplied(`${promo.code} · ${promo.label}`)}</span>
                  <button type="button" className="text-xs underline" onClick={() => applyPromo(null)}>
                    {t.remove}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    id="promo"
                    className="field"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    onKeyDown={(e) => {
                      // Enter ในช่องโค้ดต้องใช้โค้ด ไม่ใช่ submit ฟอร์ม (ซึ่งจะพาไปจ่ายเงิน)
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (promoInput.trim()) void applyPromo(promoInput.trim());
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="rounded-lg border border-line px-3 text-sm hover:border-brand disabled:opacity-40"
                    disabled={!promoInput.trim()}
                    onClick={() => applyPromo(promoInput.trim())}
                  >
                    {t.applyCode}
                  </button>
                </div>
              )}
              {promoError && <p className="mt-1 text-xs text-red-600">{promoError}</p>}
              {props.unlockCode && <p className="mt-2 text-xs text-muted">🔓 {t.codeUnlocked(props.unlockCode)}</p>}
            </div>
          )}

          <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
            <Row label={t.subtotal} value={baht(totals.subtotalSatang, locale)} />
            {totals.discountSatang > 0 && <Row label={t.discount} value={`−${baht(totals.discountSatang, locale)}`} />}
            {totals.feeSatang > 0 && <Row label={t.fee} value={baht(totals.feeSatang, locale)} />}
            <div className="flex justify-between pt-2 text-lg font-bold">
              <dt>{t.total}</dt>
              <dd>{baht(totals.totalSatang, locale)}</dd>
            </div>
            {totals.vatSatang > 0 && <p className="text-xs text-muted">{t.vatIncluded(baht(totals.vatSatang, locale))}</p>}
          </dl>

          {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          <button className="btn-primary mt-4 w-full" disabled={busy}>
            {phase === "info"
              ? t.toPayment
              : busy
                ? t.processing
                : free
                  ? t.confirmFree
                  : t.payNow(baht(totals.totalSatang, locale))}
          </button>
          {phase === "review" && (
            <button type="button" className="mt-2 w-full py-2 text-sm text-muted underline" onClick={() => setPhase("info")}>
              {t.back}
            </button>
          )}
        </aside>
      </div>
    </form>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  pattern?: string;
}) {
  const id = useId();
  return (
    <div>
      <label className="label" htmlFor={id}>
        {props.label}
      </label>
      <input
        id={id}
        className="field"
        type={props.type ?? "text"}
        value={props.value}
        required={props.required}
        pattern={props.pattern}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
