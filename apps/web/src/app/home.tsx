"use client";

import Link from "next/link";
import { useState } from "react";
import { Loading } from "@/components/loading";
import { resetDemo, useBackend } from "@/lib/backend";
import { useLocale } from "@/lib/locale";
import { od } from "@/lib/onsite-i18n";
import { EVENT_SLUG } from "@/lib/paths";

// หน้ารวมลิงก์ตามบทบาท (prototype ยังไม่มี login)
export function Home() {
  const { locale } = useLocale();
  const b = useBackend();
  const [resetting, setResetting] = useState(false);
  if (!b) return <Loading />;
  const t = od(locale);
  const { catalog } = b.ticketing;
  const slug = EVENT_SLUG;
  const cards: { href: string; role: readonly string[]; icon: string }[] = [
    { href: `/e/${slug}`, role: t.roles.attendee, icon: "🎟️" },
    { href: `/org/${slug}/checkin`, role: t.roles.checkin, icon: "✅" },
    { href: `/org/${slug}/booths`, role: t.roles.booth, icon: "🏷️" },
    { href: `/org/${slug}`, role: t.roles.org, icon: "📊" },
  ];
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold">{catalog.event.name[locale]}</h1>
      <p className="mt-1 text-sm text-muted">{t.prototypeBanner}</p>
      <p className="mt-1 text-sm text-muted">{t.browserNote}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="card flex items-start gap-4 p-5 transition hover:border-brand">
            <span className="text-2xl" aria-hidden>
              {c.icon}
            </span>
            <span>
              <span className="block font-semibold">{c.role[0]}</span>
              <span className="text-sm text-muted">{c.role[1]}</span>
            </span>
          </Link>
        ))}
      </div>
      <h2 className="mt-8 font-semibold">{t.roles.sponsor[0]}</h2>
      <p className="text-sm text-muted">{t.roles.sponsor[1]}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {catalog.sponsors.map((s) => (
          <Link key={s.id} href={`/sponsor/${s.id}`} className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-brand">
            {s.name}
          </Link>
        ))}
      </div>
      <button
        className="mt-10 text-xs text-muted underline disabled:opacity-50"
        disabled={resetting}
        onClick={async () => {
          if (!window.confirm(t.resetConfirm)) return;
          setResetting(true);
          await resetDemo();
          setResetting(false);
        }}
      >
        {resetting ? "…" : t.resetDemo}
      </button>
    </main>
  );
}
