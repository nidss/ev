"use client";

import { Loading } from "@/components/loading";
import { useBackend } from "@/lib/backend";
import { useLocale } from "@/lib/locale";
import { od } from "@/lib/onsite-i18n";
import { BoothStaff } from "./booth-staff";

export function StaffView({ boothId }: { boothId: string }) {
  const { locale } = useLocale();
  const b = useBackend();
  if (!b) return <Loading />;
  const { onsite } = b;
  const info = onsite.boothById(boothId);
  const leads = onsite.visibleLeads(info.sponsor.id, boothId).map((l) => ({
    id: l.lead.id,
    name: `${l.firstName} ${l.lastName}`,
    company: l.company,
    jobTitle: l.jobTitle,
    interest: l.lead.interestLevel,
    rating: l.lead.rating,
    notes: l.lead.notes,
    lastScannedAt: l.lead.lastScannedAt,
  }));
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">{od(locale).prototypeBanner}</p>
      <BoothStaff
        locale={locale}
        boothId={boothId}
        boothCode={info.booth.code}
        sponsorName={info.sponsor.name}
        leads={leads}
      />
    </main>
  );
}
