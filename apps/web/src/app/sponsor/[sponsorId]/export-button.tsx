"use client";

import { useState } from "react";
import { api } from "@/lib/local-api";

export function ExportButton(props: { sponsorId: string; label: string; byLabel: string; disabled: boolean }) {
  const [by, setBy] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api(`/api/sponsors/${props.sponsorId}/export`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ by }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "leads.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={run} className="flex items-end gap-2">
      <div>
        <label className="label" htmlFor="by">
          {props.byLabel}
        </label>
        <input id="by" className="field" required value={by} onChange={(e) => setBy(e.target.value)} />
      </div>
      <button className="btn-primary px-4 py-2" disabled={props.disabled || busy}>
        ⬇ {props.label}
      </button>
    </form>
  );
}
