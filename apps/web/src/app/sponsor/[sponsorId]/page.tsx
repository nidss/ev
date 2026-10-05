import { notFound } from "next/navigation";
import { TicketingError } from "@ev/core";
import { od } from "@/lib/onsite-i18n";
import { getLocale, ready } from "@/lib/server";
import { ExportButton } from "./export-button";

// Sponsor portal: เห็นตัวบุคคลเฉพาะคนที่ยินยอม คนที่เหลือเป็นตัวเลขเท่านั้น
export default async function SponsorPortal(props: { params: Promise<{ sponsorId: string }> }) {
  const { sponsorId } = await props.params;
  const locale = await getLocale();
  const t = od(locale);
  const { onsite } = await ready();
  let v;
  try {
    v = onsite.sponsorView(sponsorId);
  } catch (err) {
    if (err instanceof TicketingError) notFound();
    throw err;
  }
  const fmt = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
  const tiles: [string, number, string?][] = [
    [t.uniqueVisitors, v.stats.uniqueVisitors, t.trafficOnly(v.stats.notConsented)],
    [t.consentedLeads, v.stats.consentedLeads],
    [t.interest.request_info!, v.stats.requestInfo],
    [t.scans, v.stats.scans],
  ];
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">{t.prototypeBanner}</p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {t.sponsorPortal} · {v.booths.map((b) => b.code).join(", ")} · {v.sponsor.tier}
          </p>
          <h1 className="text-2xl font-bold">{v.sponsor.name}</h1>
        </div>
        <ExportButton sponsorId={sponsorId} label={t.exportCsv} byLabel={t.exportedBy} disabled={v.leads.length === 0} />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([label, value, note]) => (
          <div key={label} className="card p-4">
            <div className="text-xs font-medium text-muted">{label}</div>
            <div className="mt-1 text-3xl font-semibold">{value}</div>
            {note && <div className="mt-1 text-xs text-muted">{note}</div>}
          </div>
        ))}
      </section>

      <section className="card overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
          <h2 className="font-semibold">{t.consentedLeads}</h2>
          <span className="text-xs text-muted">
            ▲ {t.rating.hot} {v.stats.hot} · ● {t.rating.warm} {v.stats.warm} · ▼ {t.rating.cold} {v.stats.cold}
          </span>
        </div>
        {v.leads.length === 0 ? (
          <p className="p-4 text-sm text-muted">{t.noLeads}</p>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">{t.name}</th>
                <th className="px-4 py-2 font-medium">{t.company}</th>
                <th className="px-4 py-2 font-medium">{t.email}</th>
                <th className="px-4 py-2 font-medium">Interest</th>
                <th className="px-4 py-2 font-medium">Rating</th>
                <th className="px-4 py-2 font-medium">{t.notes}</th>
                <th className="px-4 py-2 font-medium">{t.lastScan}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {v.leads.map((l) => (
                <tr key={l.lead.id}>
                  <td className="px-4 py-2">
                    {l.firstName} {l.lastName}
                  </td>
                  <td className="px-4 py-2 text-muted">
                    {l.company}
                    {l.jobTitle && <span className="block text-xs">{l.jobTitle}</span>}
                  </td>
                  <td className="px-4 py-2 text-xs">{l.email}</td>
                  <td className="px-4 py-2 text-xs">{t.interest[l.lead.interestLevel]}</td>
                  <td className="px-4 py-2 text-xs">{l.lead.rating ? t.rating[l.lead.rating] : "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted">{l.lead.notes}</td>
                  <td className="px-4 py-2 text-xs tabular-nums text-muted">{fmt.format(new Date(l.lead.lastScannedAt))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card p-4">
        <h2 className="font-semibold">{t.exportLog}</h2>
        {v.exports.length === 0 ? (
          <p className="mt-2 text-sm text-muted">—</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {v.exports.map((e) => (
              <li key={e.id} className="text-muted">
                {fmt.format(new Date(e.createdAt))} · {t.exportRow(e.attendeeIds.length, e.exportedBy)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
