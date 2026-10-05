"use client";

import { Loading } from "@/components/loading";
import { useBackend } from "@/lib/backend";
import { dayLabel } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import { od } from "@/lib/onsite-i18n";
import { CheckinApp } from "./checkin-app";

export function CheckinView({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const b = useBackend();
  if (!b) return <Loading />;
  const { onsite } = b;
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">{od(locale).prototypeBanner}</p>
      <CheckinApp
        locale={locale}
        slug={slug}
        checkpoints={onsite.checkpoints()}
        dates={onsite.eventDates().map((d) => ({ value: d, label: dayLabel(d, locale) }))}
      />
    </main>
  );
}
