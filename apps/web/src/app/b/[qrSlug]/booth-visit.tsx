"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@ev/core";
import { api } from "@/lib/local-api";
import { od } from "@/lib/onsite-i18n";

export function BoothVisit(props: { locale: Locale; qrSlug: string; attendeeName: string | null; consented: boolean }) {
  const t = od(props.locale);
  const [ticketCode, setTicketCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  // เปิดหน้านี้หลังสแกน QR บูธ = นับเป็น "แวะบูธ" 1 ครั้งต่อ session
  useEffect(() => {
    if (!props.attendeeName) return;
    const key = `ev-visit-${props.qrSlug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // ignore
    }
    void act("visit", false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.attendeeName, props.qrSlug]);

  async function act(action: "visit" | "interested" | "request_info", show = true) {
    setBusy(true);
    const res = await api(`/api/booths/${props.qrSlug}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (res.ok && show) setSent(true);
  }

  async function identify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await api(`/api/booths/${props.qrSlug}/identify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticketCode, email }),
    });
    setBusy(false);
    if (!res.ok) return setError(t.results.unknown!);
  }

  async function logout() {
    await api(`/api/booths/${props.qrSlug}/identify`, { method: "DELETE" });
    try {
      sessionStorage.removeItem(`ev-visit-${props.qrSlug}`);
    } catch {
      // ignore
    }
  }

  if (!props.attendeeName) {
    return (
      <form onSubmit={identify} className="space-y-3">
        <h2 className="font-semibold">{t.identifyTitle}</h2>
        <p className="text-sm text-muted">{t.identifyBody}</p>
        <div>
          <label className="label" htmlFor="tc">
            {t.ticketCode}
          </label>
          <input id="tc" className="field font-mono uppercase" required value={ticketCode} onChange={(e) => setTicketCode(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="em">
            {t.email}
          </label>
          <input id="em" type="email" className="field" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {t.confirm}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{t.hello(props.attendeeName)}</p>
        <button className="text-xs text-muted underline" onClick={logout}>
          {t.notMe}
        </button>
      </div>
      {sent ? (
        <p className="rounded-xl bg-emerald-50 p-4 text-center font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" role="status">
          ✓ {t.thanks}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-primary" disabled={busy} onClick={() => act("interested")}>
            👍 {t.interested}
          </button>
          <button className="btn-primary" disabled={busy} onClick={() => act("request_info")}>
            ✉ {t.requestInfo}
          </button>
        </div>
      )}
      {!props.consented && <p className="text-xs text-muted">ⓘ {t.noConsentNote}</p>}
    </div>
  );
}
