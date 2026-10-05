// สร้าง service ครั้งเดียวต่อ process (เก็บใน globalThis เพื่อให้ route handler กับหน้า page ใช้ข้อมูลชุดเดียวกัน
// และไม่หายตอน hot reload) — ข้อมูลทั้งหมดอยู่ใน memory จะหายเมื่อ restart server
import "server-only";
import { cookies } from "next/headers";
import {
  createMockCatalog,
  MockPaymentProvider,
  OnsiteService,
  seedDemo,
  TicketingService,
  verifyAttendeeCookie,
  type Locale,
} from "@ev/core";

interface AppState {
  ticketing: TicketingService;
  onsite: OnsiteService;
  mockPayments: MockPaymentProvider;
  seeded: Promise<unknown>;
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
    const onsite = new OnsiteService(ticketing);
    // ข้อมูลตัวอย่าง (ชื่อสมมติ) ให้หน้า dashboard / sponsor มีข้อมูล — ปิดได้ด้วย SEED_DEMO=0
    const seeded = process.env.SEED_DEMO === "0" ? Promise.resolve(0) : seedDemo(ticketing, onsite, mockPayments);
    g.__evApp = { ticketing, onsite, mockPayments, seeded };
  }
  return g.__evApp;
}

// ใช้ในหน้าที่แสดงข้อมูลหน้างาน: รอให้ข้อมูลตัวอย่างสร้างเสร็จก่อน
export async function ready(): Promise<AppState> {
  const state = app();
  await state.seeded;
  return state;
}

export const DEFAULT_EVENT_SLUG = "bangkok-event-tech-2026";
export const ATTENDEE_COOKIE = "ev_att";

export function cookieSecret(): string {
  return process.env.ATTENDEE_COOKIE_SECRET ?? "dev-attendee-cookie-secret";
}

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get("lang")?.value;
  return v === "en" ? "en" : "th";
}

// attendee ที่ยืนยันตัวที่บูธแล้ว (cookie เซ็น HMAC)
export async function currentAttendeeId(): Promise<string | null> {
  return verifyAttendeeCookie(cookieSecret(), (await cookies()).get(ATTENDEE_COOKIE)?.value);
}

export function requireEventSlug(slug: string): boolean {
  return slug === app().ticketing.catalog.event.slug;
}
