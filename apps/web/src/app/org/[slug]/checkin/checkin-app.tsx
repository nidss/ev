"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@ev/core";
import {
  acceptedKey,
  evaluateCheckin,
  findAttendee,
  parseScan,
  type SnapshotAttendee,
  type SnapshotCheckpoint,
} from "@ev/core/checkin-rules";
import { ScanInput } from "@/components/scan-input";
import {
  load,
  loadQueue,
  loadSnapshot,
  save,
  saveQueue,
  saveSnapshot,
  verifyQrOffline,
  type QueuedScan,
  type Snapshot,
} from "@/lib/offline-checkin";
import { api } from "@/lib/local-api";
import { od } from "@/lib/onsite-i18n";

interface ResultView {
  result: string;
  attendee: SnapshotAttendee | null;
  note: string | null;
}

interface RecentRow {
  id: string;
  time: string;
  name: string;
  result: string;
  checkpointId: string;
  pending: boolean;
}

const TONE: Record<string, string> = {
  accepted: "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  already_in: "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  needs_entry_check: "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
};
const ICON: Record<string, string> = { accepted: "✓", already_in: "!", needs_entry_check: "?" };

export function CheckinApp(props: {
  locale: Locale;
  slug: string;
  checkpoints: SnapshotCheckpoint[];
  dates: { value: string; label: string }[];
}) {
  const { locale } = props;
  const t = od(locale);
  const [checkpointId, setCheckpointId] = useState(props.checkpoints[0]!.id);
  const [date, setDate] = useState(props.dates[0]!.value);
  const [device, setDevice] = useState("Gate A - iPad 1");
  const [offline, setOffline] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [queue, setQueue] = useState<QueuedScan[]>([]);
  const [view, setView] = useState<ResultView | null>(null);
  const [pendingCheck, setPendingCheck] = useState<{ id: string; code: string } | null>(null);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<SnapshotAttendee[]>([]);
  const [busy, setBusy] = useState(false);

  // ค่าที่จำไว้ในเครื่อง
  useEffect(() => {
    const prefs = load<{ checkpointId?: string; date?: string; device?: string; offline?: boolean }>("ev-checkin-prefs", {});
    if (prefs.checkpointId && props.checkpoints.some((c) => c.id === prefs.checkpointId)) setCheckpointId(prefs.checkpointId);
    if (prefs.date && props.dates.some((d) => d.value === prefs.date)) setDate(prefs.date);
    if (prefs.device) setDevice(prefs.device);
    if (prefs.offline) setOffline(true);
    setQueue(loadQueue());
    setSnapshot(loadSnapshot());
  }, [props.checkpoints, props.dates]);
  useEffect(() => save("ev-checkin-prefs", { checkpointId, date, device, offline }), [checkpointId, date, device, offline]);

  const cpName = (id: string) => props.checkpoints.find((c) => c.id === id)?.name[locale] ?? id;
  const fullName = (a: SnapshotAttendee | null) => (a ? `${a.firstName} ${a.lastName}` : "—");

  const refreshSnapshot = useCallback(async () => {
    const res = await api("/api/onsite/snapshot", { cache: "no-store" });
    if (res.ok) {
      const s = (await res.json()) as Snapshot;
      setSnapshot(s);
      saveSnapshot(s);
    }
  }, []);

  const refreshRecent = useCallback(async () => {
    const res = await api(`/api/onsite/recent?date=${date}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      recent: { checkin: { id: string; scannedAt: string; result: string; checkpointId: string; rawCode: string | null }; attendee: SnapshotAttendee | null }[];
    };
    setRecent(
      data.recent.map((r) => ({
        id: r.checkin.id,
        time: r.checkin.scannedAt,
        name: r.attendee ? fullName(r.attendee) : (r.checkin.rawCode ?? "—"),
        result: r.checkin.result,
        checkpointId: r.checkin.checkpointId,
        pending: false,
      })),
    );
  }, [date]);

  // ตอนออนไลน์: โหลดรายชื่อเก็บไว้ล่วงหน้า และดึงรายการสแกนล่าสุดเป็นระยะ
  useEffect(() => {
    if (offline) return;
    void refreshSnapshot();
    void refreshRecent();
    const id = setInterval(refreshRecent, 5000);
    return () => clearInterval(id);
  }, [offline, refreshSnapshot, refreshRecent]);

  async function sync(q: QueuedScan[]) {
    if (q.length === 0) return;
    const res = await api("/api/onsite/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scans: q.map(({ localResult: _r, attendeeName: _n, ...scan }) => scan),
      }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { results: { duplicate: boolean }[] };
    setSyncMsg(t.synced(data.results.length, data.results.filter((r) => r.duplicate).length));
    setQueue([]);
    saveQueue([]);
    void refreshSnapshot();
    void refreshRecent();
  }

  function toggleOffline(next: boolean) {
    setOffline(next);
    setSyncMsg(null);
    if (!next) void sync(loadQueue()); // กลับมาออนไลน์ → ส่งคิวทันที
  }

  async function handleScan(code: string, confirmed: boolean | null = null, scanId?: string) {
    const id = scanId ?? crypto.randomUUID();
    setBusy(true);
    setPendingCheck(null);
    try {
      if (offline) {
        if (!snapshot) return;
        const parsed = parseScan(code);
        const attendee = findAttendee(parsed, snapshot.attendees);
        const keys = new Set([
          ...snapshot.acceptedKeys,
          ...queue.filter((x) => x.localResult === "accepted").map((x) => acceptedKey(findAttendee(parseScan(x.code), snapshot.attendees)?.id ?? "", x.checkpointId, x.operatingDate)),
        ]);
        const result = evaluateCheckin({
          parsed,
          attendee,
          checkpoint: props.checkpoints.find((c) => c.id === checkpointId)!,
          admissionTicketTypeIds: snapshot.admissionTicketTypeIds,
          operatingDate: date,
          qrSignatureValid:
            parsed.kind === "qr" ? parsed.eventShort === snapshot.eventShort && verifyQrOffline(snapshot.qrPublicKey, parsed.token) : null,
          acceptedBefore: attendee ? keys.has(acceptedKey(attendee.id, checkpointId, date)) : false,
          entryCheckConfirmed: confirmed,
        });
        setView({ result, attendee, note: result === "needs_entry_check" ? null : t.savedOffline });
        if (result === "needs_entry_check") {
          setPendingCheck({ id, code });
          return;
        }
        const item: QueuedScan = {
          id,
          code,
          checkpointId,
          operatingDate: date,
          entryCheckConfirmed: confirmed,
          deviceName: device,
          scannedAt: new Date().toISOString(),
          localResult: result,
          attendeeName: attendee ? fullName(attendee) : null,
        };
        const next = [...queue, item];
        setQueue(next);
        saveQueue(next);
        return;
      }
      const res = await api("/api/onsite/checkins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, code, checkpointId, operatingDate: date, entryCheckConfirmed: confirmed, deviceName: device }),
      });
      const data = await res.json();
      if (!res.ok) {
        setView({ result: "unknown", attendee: null, note: data?.error?.code ?? null });
        return;
      }
      setView({ result: data.result, attendee: data.attendee, note: null });
      if (data.result === "needs_entry_check") setPendingCheck({ id, code });
      else void refreshRecent();
    } finally {
      setBusy(false);
    }
  }

  async function search(q: string) {
    setQuery(q);
    if (q.trim().length < 2) return setFound([]);
    if (offline && snapshot) {
      const s = q.toLowerCase();
      setFound(
        snapshot.attendees
          .filter((a) => [a.firstName, a.lastName, a.company ?? "", a.ticketCode].some((f) => f.toLowerCase().includes(s)))
          .slice(0, 10),
      );
      return;
    }
    const res = await api(`/api/onsite/search?q=${encodeURIComponent(q)}`);
    if (res.ok) setFound(((await res.json()) as { results: SnapshotAttendee[] }).results.slice(0, 10));
  }

  const rows: RecentRow[] = [
    ...queue
      .filter((q) => q.operatingDate === date)
      .map((q) => ({
        id: q.id,
        time: q.scannedAt,
        name: q.attendeeName ?? q.code,
        result: q.localResult,
        checkpointId: q.checkpointId,
        pending: true,
      }))
      .reverse(),
    ...recent,
  ].slice(0, 15);

  const timeFmt = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.checkinTitle}</h1>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={offline} onChange={(e) => toggleOffline(e.target.checked)} />
          {t.simulateOffline}
        </label>
      </div>

      <div className="card grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="cp">
            {t.checkpoint}
          </label>
          <select id="cp" className="field" value={checkpointId} onChange={(e) => setCheckpointId(e.target.value)}>
            {props.checkpoints.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name[locale]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="day">
            {t.day}
          </label>
          <select id="day" className="field" value={date} onChange={(e) => setDate(e.target.value)}>
            {props.dates.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="device">
            {t.device}
          </label>
          <input id="device" className="field" value={device} onChange={(e) => setDevice(e.target.value)} />
        </div>
      </div>

      {(offline || queue.length > 0 || syncMsg) && (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-2 text-sm ${offline ? "bg-slate-800 text-white" : "bg-brand-soft text-brand"}`}
        >
          <span>
            {offline ? t.offlineBar(queue.length) : syncMsg ?? t.pending(queue.length)}
            {offline && snapshot && <span className="ml-2 opacity-70">· {t.snapshotInfo(snapshot.attendees.length)}</span>}
          </span>
          {!offline && queue.length > 0 && (
            <button className="underline" onClick={() => sync(queue)}>
              {t.syncNow}
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="card p-4">
            <ScanInput
              placeholder={t.scanPlaceholder}
              submitLabel={t.scan}
              cameraLabel={t.camera}
              cameraOffLabel={t.cameraOff}
              cameraUnsupported={t.cameraUnsupported}
              disabled={busy || pendingCheck !== null}
              onScan={(c) => handleScan(c)}
            />
          </div>

          <ResultCard
            view={view}
            locale={locale}
            slug={props.slug}
            offline={offline}
            pendingCheck={pendingCheck}
            onConfirm={(ok) => pendingCheck && handleScan(pendingCheck.code, ok, pendingCheck.id)}
            onPaired={(a) => setView((v) => (v ? { ...v, attendee: a } : v))}
          />

          <div className="card p-4">
            <label className="label" htmlFor="search">
              {t.searchName}
            </label>
            <input id="search" className="field" value={query} onChange={(e) => search(e.target.value)} />
            {found.length > 0 && (
              <ul className="mt-2 divide-y divide-line text-sm">
                {found.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="font-medium">{fullName(a)}</span>
                      <span className="block text-xs text-muted">
                        {a.company ?? ""} · {a.ticketTypeName[locale]} · <span className="font-mono">{a.ticketCode}</span>
                      </span>
                    </span>
                    <button
                      className="rounded-lg border border-brand px-3 py-1 text-xs font-semibold text-brand"
                      onClick={() => {
                        setQuery("");
                        setFound([]);
                        void handleScan(a.ticketCode);
                      }}
                    >
                      {t.checkInThis}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="card h-fit p-4">
          <h2 className="font-semibold">{t.recent}</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="block truncate">{r.name}</span>
                  <span className="text-xs text-muted">
                    {timeFmt.format(new Date(r.time))} · {cpName(r.checkpointId)}
                    {r.pending && " · ⏳"}
                  </span>
                </span>
                <ResultBadge result={r.result} label={t.results[r.result] ?? r.result} />
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function ResultBadge({ result, label }: { result: string; label: string }) {
  const tone =
    result === "accepted"
      ? "bg-emerald-100 text-emerald-800"
      : result === "already_in"
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-700";
  const icon = result === "accepted" ? "✓" : result === "already_in" ? "!" : "✕";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {icon} {label}
    </span>
  );
}

function ResultCard(props: {
  view: ResultView | null;
  locale: Locale;
  slug: string;
  offline: boolean;
  pendingCheck: { id: string; code: string } | null;
  onConfirm: (ok: boolean) => void;
  onPaired: (a: SnapshotAttendee) => void;
}) {
  const t = od(props.locale);
  const { view } = props;
  if (!view) {
    return (
      <div className="card flex items-center gap-4 p-6 text-muted">
        <span className="text-3xl">·</span>
        {t.ready}
      </div>
    );
  }
  const a = view.attendee;
  const tone = TONE[view.result] ?? "border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100";
  return (
    <div className={`rounded-2xl border-2 p-5 ${tone}`} role="status" aria-live="polite">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/70 text-2xl font-bold">
          {ICON[view.result] ?? "✕"}
        </span>
        <div className="min-w-0">
          <div className="text-xl font-bold">{t.results[view.result] ?? view.result}</div>
          {a && (
            <div className="mt-1">
              <div className="text-lg font-semibold">
                {a.firstName} {a.lastName}
              </div>
              <div className="text-sm opacity-80">
                {a.company ? `${a.company} · ` : ""}
                {a.ticketTypeName[props.locale]}
                {a.slotLabel ? ` · ${a.slotLabel[props.locale]}` : ""}
              </div>
              <div className="font-mono text-xs opacity-70">{a.ticketCode}</div>
            </div>
          )}
          {view.note && <div className="mt-2 text-sm">{view.note}</div>}
        </div>
      </div>

      {props.pendingCheck && a?.entryCheck && (
        <div className="mt-4 rounded-xl bg-white/70 p-4 text-ink">
          <p className="font-semibold">⚠ {a.entryCheck[props.locale]}</p>
          <div className="mt-3 flex gap-2">
            <button className="btn-primary bg-emerald-600 text-white" onClick={() => props.onConfirm(true)}>
              {t.entryCheckPass}
            </button>
            <button className="rounded-xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-600" onClick={() => props.onConfirm(false)}>
              {t.entryCheckFail}
            </button>
          </div>
        </div>
      )}

      {a && (view.result === "accepted" || view.result === "already_in") && (
        <div className="mt-4 grid gap-3 rounded-xl bg-white/70 p-4 text-ink sm:grid-cols-[1fr_auto]">
          <WristbandForm attendee={a} locale={props.locale} disabled={props.offline} onPaired={props.onPaired} />
          <Link
            href={`/org/${props.slug}/badge?id=${a.id}`}
            target="_blank"
            rel="noreferrer"
            className="self-end rounded-xl border border-line bg-surface px-4 py-2 text-center text-sm font-medium"
          >
            🖨 {t.printBadge}
          </Link>
        </div>
      )}
    </div>
  );
}

function WristbandForm(props: {
  attendee: SnapshotAttendee;
  locale: Locale;
  disabled: boolean;
  onPaired: (a: SnapshotAttendee) => void;
}) {
  const t = od(props.locale);
  const [uid, setUid] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function pair(value: string) {
    setError(null);
    const res = await api("/api/onsite/wristband", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ attendeeId: props.attendee.id, uid: value }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data?.error?.code ?? "error");
    setUid("");
    props.onPaired(data.attendee);
  }

  const randomUid = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, "0").toUpperCase()).join(":");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (uid.trim()) void pair(uid.trim());
      }}
    >
      <label className="label" htmlFor="rfid">
        {t.rfid}
        {props.attendee.rfidUid && <span className="ml-2 font-mono text-emerald-700">{t.paired(props.attendee.rfidUid)}</span>}
      </label>
      <div className="flex gap-2">
        <input
          id="rfid"
          className="field font-mono"
          placeholder={t.rfidPlaceholder}
          value={uid}
          disabled={props.disabled}
          onChange={(e) => setUid(e.target.value)}
        />
        <button className="whitespace-nowrap rounded-lg border border-brand px-3 text-sm font-semibold text-brand disabled:opacity-40" disabled={props.disabled || !uid.trim()}>
          {t.pair}
        </button>
        <button
          type="button"
          className="whitespace-nowrap rounded-lg border border-line px-3 text-xs disabled:opacity-40"
          disabled={props.disabled}
          onClick={() => pair(randomUid())}
        >
          {t.simulateTap}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </form>
  );
}
