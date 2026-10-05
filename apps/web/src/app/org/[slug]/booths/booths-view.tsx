"use client";

import Link from "next/link";
import { Loading } from "@/components/loading";
import { QrSvg } from "@/components/qr-svg";
import { useBackend } from "@/lib/backend";
import { useLocale } from "@/lib/locale";
import { od } from "@/lib/onsite-i18n";
import { absoluteUrl } from "@/lib/paths";

// รายการบูธ + QR ประจำบูธ (พิมพ์ไปติดที่บูธ) + ลิงก์หน้า staff / sponsor
export function BoothsView({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const backend = useBackend();
  if (!backend) return <Loading />;
  const t = od(locale);
  const { booths, sponsors } = backend.ticketing.catalog;
  const items = booths.map((b) => ({
    booth: b,
    sponsor: sponsors.find((s) => s.id === b.sponsorId)!,
    // QR เป็น URL เต็ม เพื่อให้กล้องมือถือทุกเครื่องเปิดเว็บได้ทันที
    qr: absoluteUrl(`/b/${b.qrSlug}/`),
  }));
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
              <QrSvg value={qr} className="h-24 w-24 shrink-0 rounded p-1" />
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
