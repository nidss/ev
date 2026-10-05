// สร้าง service ครั้งเดียวต่อ process (เก็บใน globalThis เพื่อให้ route handler กับหน้า page ใช้ข้อมูลชุดเดียวกัน
// และไม่หายตอน hot reload) — ข้อมูลทั้งหมดอยู่ใน memory จะหายเมื่อ restart server
import "server-only";
import { cookies } from "next/headers";
import { createMockCatalog, MockPaymentProvider, TicketingService, type Locale } from "@ev/core";

interface AppState {
  ticketing: TicketingService;
  mockPayments: MockPaymentProvider;
}

const g = globalThis as typeof globalThis & { __evApp?: AppState };

export function app(): AppState {
  if (!g.__evApp) {
    const mockPayments = new MockPaymentProvider({
      secret: process.env.MOCK_PAYMENT_SECRET ?? "dev-mock-secret",
      payPageBaseUrl: "/mock-pay",
    });
    const ticketing = new TicketingService({
      catalog: createMockCatalog(),
      payments: mockPayments,
      // ว่าง = ใช้ลิงก์แบบ relative (พอสำหรับ mock) — gateway จริงต้องตั้ง APP_BASE_URL
      baseUrl: process.env.APP_BASE_URL ?? "",
    });
    g.__evApp = { ticketing, mockPayments };
  }
  return g.__evApp;
}

export const DEFAULT_EVENT_SLUG = "bangkok-event-tech-2026";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get("lang")?.value;
  return v === "en" ? "en" : "th";
}
