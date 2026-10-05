"use client";

import Link from "next/link";
import { errorText } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";

// แสดงเมื่อ id ใน URL ไม่มีในข้อมูลของเบราว์เซอร์นี้ (เช่น เปิดลิงก์จากเครื่องอื่น)
export function NotFoundBox() {
  const { locale } = useLocale();
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-lg font-semibold">{errorText(locale, "not_found")}</p>
      <p className="mt-2 text-sm text-muted">
        {locale === "th"
          ? "ข้อมูลของ prototype นี้เก็บในเบราว์เซอร์ที่ใช้สร้างเท่านั้น ลิงก์จากเครื่องอื่นจะเปิดไม่เจอ"
          : "This prototype keeps data in the browser that created it, so links from another device won't open here."}
      </p>
      <Link href="/" className="btn-primary mt-6">
        ←
      </Link>
    </main>
  );
}
