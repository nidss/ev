"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { LeadRating, Locale } from "@ev/core";
import type { SnapshotAttendee } from "@ev/core/checkin-rules";
import { ScanInput } from "@/components/scan-input";
import { load, save } from "@/lib/offline-checkin";
import { od } from "@/lib/onsite-i18n";

export interface BoothLeadRow {
  id: string;
  name: string;
  company: string | null;
  jobTitle: string | null;
  interest: string;
  rating: LeadRating | null;
  notes: string;
  lastScannedAt: string;
}

type ScanResult =
  | { result: "recorded"; consented: true; attendee: SnapshotAttendee; lead: { id: string; rating: LeadRating | null; notes: string } }
  | { result: "recorded"; consented: false }
  | { result: "unknown" | "invalid_qr" | "cancelled" };

export function BoothStaff(props: {
  locale: Locale;
  boothId: string;
  boothCode: string;
  sponsorName: string;
  leads: BoothLeadRow[];
}) {
  const { locale } = props;
  const t = od(locale);
  const router = useRouter();
  const [device, setDevice] = useState(`${props.boothCode} staff`);
  const [last, setLast] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = load<string | null>(`ev-booth-device-${props.boothId}`, null);
    if (d) setDevice(d);
  }, [props.boothId]);
  useEffect(() => save(`ev-booth-device-${props.boothId}`, device), [device, props.boothId]);

  async function scan(code: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/booth-staff/${props.boothId}/scan`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: crypto.randomUUID(), code, deviceName: device }),
      });
      setLast(res.ok ? ((await res.json()) as ScanResult) : { result: "unknown" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {t.boothStaff} · {props.boothCode}
          </p>
          <h1 className="text-2xl font-bold">{props.sponsorName}</h1>
        </div>
        <div>
          <label className="label" htmlFor="device">
            {t.device}
          </label>
          <input id="device" className="field" value={device} onChange={(e) => setDevice(e.target.value)} />
        </div>
      </div>

      <div className="card p-4">
        <ScanInput
          placeholder={t.boothScanPlaceholder}
          submitLabel={t.scan}
          cameraLabel={t.camera}
          cameraOffLabel={t.cameraOff}
          cameraUnsupported={t.cameraUnsupported}
          disabled={busy}
          onScan={scan}
        />
      </div>

      {last && <LastScan key={JSON.stringify(last)} last={last} locale={locale} boothId={props.boothId} onSaved={() => router.refresh()} />}

      <section className="card p-4">
        <h2 className="font-semibold">{t.leadsOfBooth}</h2>
        {props.leads.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t.noLeads}</p>
        ) : (
          <ul className="mt-2 divide-y divide-line text-sm">
            {props.leads.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="font-medium">{l.name}</span>
                  <span className="block text-xs text-muted">
                    {[l.jobTitle, l.company].filter(Boolean).join(" · ")} · {t.interest[l.interest]}
                    {l.notes && ` · “${l.notes}”`}
                  </span>
                </span>
                {l.rating && <RatingBadge rating={l.rating} label={t.rating[l.rating]!} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RatingBadge({ rating, label }: { rating: LeadRating; label: string }) {
  const tone = rating === "hot" ? "bg-red-100 text-red-700" : rating === "warm" ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800";
  const icon = rating === "hot" ? "▲" : rating === "warm" ? "●" : "▼";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {icon} {label}
    </span>
  );
}

function LastScan(props: { last: ScanResult; locale: Locale; boothId: string; onSaved: () => void }) {
  const t = od(props.locale);
  const { last } = props;
  const [rating, setRating] = useState<LeadRating | null>(last.result === "recorded" && last.consented ? last.lead.rating : null);
  const [notes, setNotes] = useState(last.result === "recorded" && last.consented ? last.lead.notes : "");
  const [saved, setSaved] = useState(false);

  if (last.result !== "recorded") {
    return (
      <div className="rounded-2xl border-2 border-red-500 bg-red-50 p-4 font-semibold text-red-900 dark:bg-red-950 dark:text-red-100" role="status">
        ✕ {t.results[last.result]}
      </div>
    );
  }
  if (!last.consented) {
    return (
      <div className="rounded-2xl border-2 border-amber-500 bg-amber-50 p-4 text-amber-900 dark:bg-amber-950 dark:text-amber-100" role="status">
        ✓ {t.notConsented}
      </div>
    );
  }
  async function saveLead() {
    if (last.result !== "recorded" || !last.consented) return;
    const res = await fetch(`/api/booth-staff/${props.boothId}/leads/${last.lead.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rating, notes }),
    });
    if (res.ok) {
      setSaved(true);
      props.onSaved();
    }
  }
  const a = last.attendee;
  return (
    <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-4 dark:bg-emerald-950" role="status">
      <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">✓ {t.leadSaved}</div>
      <div className="mt-1 text-lg font-semibold">
        {a.firstName} {a.lastName}
      </div>
      <div className="text-sm text-muted">
        {a.company ?? ""} · {a.ticketTypeName[props.locale]}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(["hot", "warm", "cold"] as const).map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={rating === r}
            onClick={() => setRating(rating === r ? null : r)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${rating === r ? "border-ink bg-ink text-bg" : "border-line bg-surface"}`}
          >
            {t.rating[r]}
          </button>
        ))}
      </div>
      <label className="label mt-3" htmlFor="notes">
        {t.notes}
      </label>
      <div className="flex gap-2">
        <input id="notes" className="field" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className="btn-primary px-4 py-2" onClick={saveLead}>
          {saved ? t.saved : t.save}
        </button>
      </div>
    </div>
  );
}
