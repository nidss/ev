import Link from "next/link";
import { notFound } from "next/navigation";
import { od } from "@/lib/onsite-i18n";
import { getLocale, ready, requireEventSlug } from "@/lib/server";

export default async function AttendeesPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await props.params;
  const { q = "" } = await props.searchParams;
  if (!requireEventSlug(slug)) notFound();
  const locale = await getLocale();
  const t = od(locale);
  const { onsite } = await ready();
  const rows = onsite.attendeeList(q, 200);
  const fmt = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.attendees}</h1>
        <Link href={`/org/${slug}`} className="text-sm text-brand underline">
          ← {t.dashboard}
        </Link>
      </div>
      <form className="mt-4">
        <input name="q" defaultValue={q} placeholder={t.search} aria-label={t.search} className="field max-w-md" />
      </form>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">{t.name}</th>
              <th className="px-4 py-2 font-medium">{t.company}</th>
              <th className="px-4 py-2 font-medium">{t.ticketTypes}</th>
              <th className="px-4 py-2 font-medium">{t.ticketCode}</th>
              <th className="px-4 py-2 font-medium">{t.status}</th>
              <th className="px-4 py-2 font-medium">Sponsor</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-2">
                  {a.firstName} {a.lastName}
                  <span className="block text-xs text-muted">{a.email}</span>
                </td>
                <td className="px-4 py-2 text-muted">{a.company}</td>
                <td className="px-4 py-2">
                  {a.ticketTypeName[locale]}
                  {a.slotLabel && <span className="block text-xs text-muted">{a.slotLabel[locale]}</span>}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{a.ticketCode}</td>
                <td className="px-4 py-2 text-xs">
                  {a.firstCheckedInAt ? (
                    <span className="text-emerald-700">✓ {fmt.format(new Date(a.firstCheckedInAt))}</span>
                  ) : (
                    <span className="text-muted">{t.notYet}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs">{a.shareWithSponsors ? "✓" : "—"}</td>
                <td className="px-4 py-2 text-right">
                  <a href={`/org/${slug}/badge/${a.id}`} target="_blank" rel="noreferrer" className="text-xs text-brand underline">
                    {t.printBadge}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
