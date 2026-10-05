"use client";

import { dict } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";

export function LangSwitch() {
  const { locale, setLocale } = useLocale();
  return (
    <button
      type="button"
      className="rounded-full border border-line px-3 py-1 text-xs font-medium hover:border-brand"
      onClick={() => setLocale(locale === "th" ? "en" : "th")}
    >
      {dict(locale).otherLang}
    </button>
  );
}
