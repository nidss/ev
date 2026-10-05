import { notFound } from "next/navigation";
import { dayLabel } from "@/lib/format";
import { od } from "@/lib/onsite-i18n";
import { getLocale, ready, requireEventSlug } from "@/lib/server";
import { CheckinApp } from "./checkin-app";

export default async function CheckinPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  if (!requireEventSlug(slug)) notFound();
  const locale = await getLocale();
  const { onsite } = await ready();
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
