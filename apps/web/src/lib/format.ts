import type { I18n, Locale } from "@ev/core";

export function tr(text: I18n, locale: Locale): string {
  return text[locale] || text.th;
}

export function baht(satang: number, locale: Locale): string {
  const n = satang / 100;
  const s = n.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `฿${s}`;
}

const TZ = "Asia/Bangkok";

export function dateRange(startIso: string, endIso: string, locale: Locale): string {
  const loc = locale === "th" ? "th-TH" : "en-GB";
  const d = new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
  const t = new Intl.DateTimeFormat(loc, { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  const start = new Date(startIso);
  const end = new Date(endIso);
  return `${d.formatRange(start, end)} · ${t.format(start)}–${t.format(end)}`;
}
