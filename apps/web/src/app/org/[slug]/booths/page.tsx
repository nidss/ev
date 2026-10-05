import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { od } from "@/lib/onsite-i18n";
import { getLocale, ready, requireEventSlug } from "@/lib/server";

// รายการบูธ + QR ประจำบูธ (พิมพ์ไปติดที่บูธ) + ลิงก์หน้า staff / sponsor
export default async function BoothsPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  if (!requireEventSlug(slug)) notFound();
  const locale = await getLocale();
  const t = od(locale);
  const { ticketing } = await ready();
  const { booths, sponsors } = ticketing.catalog;
  const base = process.env.APP_BASE_URL ?? "";
  const items = await Promise.all(
    booths.map(async (b) => ({
      booth: b,
      sponsor: sponsors.find((s) => s.id === b.sponsorId)!,
      // QR เป็น URL เพื่อให้กล้องมือถือทุกเครื่องเปิดเว็บได้ทันที
      qr: await QRCode.toString(`${base}/b/${b.qrSlug}`, { type: "svg", margin: 1 }),
    })),
  );
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.boothsAndQr}</h1>
        <Link href={`/org/${slug}`} className="text-sm text-brand underline">
          ← {t.dashboard}
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">{t.boothQrNote}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ booth, sponsor, qr }) => (
          <article key={booth.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-muted">
                  {booth.code} · Zone {booth.zone} · {sponsor.tier}
                </div>
                <h2 className="font-semibold">{sponsor.name}</h2>
              </div>
              <div className="h-24 w-24 shrink-0 rounded bg-white p-1" dangerouslySetInnerHTML={{ __html: qr }} />
            </div>
            <div className="mt-2 font-mono text-xs text-muted">/b/{booth.qrSlug}</div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <Link href={`/booth/${booth.id}`} className="rounded-lg border border-brand px-3 py-1.5 font-medium text-brand">
                {t.staffPage}
              </Link>
              <Link href={`/sponsor/${sponsor.id}`} className="rounded-lg border border-line px-3 py-1.5">
                {t.sponsorPage}
              </Link>
              <Link href={`/b/${booth.qrSlug}`} className="rounded-lg border border-line px-3 py-1.5">
                QR →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
