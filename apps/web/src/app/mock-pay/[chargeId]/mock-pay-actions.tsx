"use client";

import { useState } from "react";

export function MockPayActions(props: {
  chargeId: string;
  status: "pending" | "succeeded" | "failed";
  returnUrl: string;
  labels: { succeed: string; fail: string; done: string; processing: string };
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (props.status !== "pending") {
    return (
      <p className="mt-6 text-center text-sm text-muted">
        {props.labels.done} ·{" "}
        <a className="text-brand underline" href={props.returnUrl}>
          →
        </a>
      </p>
    );
  }

  async function simulate(outcome: "succeeded" | "failed") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/mock-pay/${props.chargeId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ outcome }),
    });
    const data = await res.json().catch(() => null);
    if (data?.returnUrl) {
      window.location.href = data.returnUrl;
      return;
    }
    setError(data?.error?.code ?? `HTTP ${res.status}`);
    setBusy(false);
  }

  return (
    <div className="mt-6 grid gap-2">
      <button className="btn-primary bg-emerald-600 text-white" disabled={busy} onClick={() => simulate("succeeded")}>
        {busy ? props.labels.processing : `✓ ${props.labels.succeed}`}
      </button>
      <button
        className="rounded-xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
        disabled={busy}
        onClick={() => simulate("failed")}
      >
        ✕ {props.labels.fail}
      </button>
      {error && <p className="text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}
