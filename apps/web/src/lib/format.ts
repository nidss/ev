import type { Booth, Catalog, I18n, Locale } from "@ev/core";

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

export function dayLabel(dateOrIso: string, locale: Locale): string {
  // รับทั้ง YYYY-MM-DD และ ISO เต็ม — YYYY-MM-DD ตีความเป็นเที่ยงวันเวลาไทย กันวันเลื่อน
  const d = new Date(dateOrIso.length === 10 ? `${dateOrIso}T12:00:00+07:00` : dateOrIso);
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(d);
}

export function timeRange(startIso: string, endIso: string, locale: Locale): string {
  const t = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
  return `${t.format(new Date(startIso))}–${t.format(new Date(endIso))}`;
}

// "โซน A · อาหารและเครื่องดื่ม" — บูธที่ไม่มีหมวดใช้ชื่อโซนเดิม
export function zoneLabel(catalog: Catalog, booth: Booth, locale: Locale): string {
  const cat = catalog.categories.find((c) => c.id === booth.categoryId);
  const zone = locale === "th" ? "โซน" : "Zone";
  return cat ? `${zone} ${cat.code} · ${tr(cat.name, locale)}` : `${zone} ${booth.zone}`;
}
