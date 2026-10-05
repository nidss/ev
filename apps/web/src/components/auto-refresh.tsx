"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// ระหว่างรอผล webhook: โหลดข้อมูลหน้าใหม่ทุก 2 วินาที
export function AutoRefresh({ intervalMs = 2000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
