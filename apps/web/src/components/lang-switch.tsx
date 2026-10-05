"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@ev/core";
import { dict } from "@/lib/i18n";

export function LangSwitch({ locale }: { locale: Locale }) {
  const router = useRouter();
  const next: Locale = locale === "th" ? "en" : "th";
  return (
    <button
      type="button"
      className="rounded-full border border-line px-3 py-1 text-xs font-medium hover:border-brand"
      onClick={() => {
        document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
    >
      {dict(locale).otherLang}
    </button>
  );
}
