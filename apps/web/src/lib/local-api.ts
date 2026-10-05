// API จำลองในเบราว์เซอร์: รับ path + method แบบเดียวกับ API route บน server แล้วคืน Response
// หน้าเว็บจึงเรียก api("/api/...") เหมือนเรียก server จริง — ตอนย้ายไปมี server ค่อยเปลี่ยนเป็น fetch() ตรงๆ
import { z } from "zod";
import { InvalidWebhookError, signAttendeeCookie, TicketingError, verifyAttendeeCookie } from "@ev/core";
import { ATTENDEE_SECRET, getBackend, persist, type Backend } from "./backend";

const ATTENDEE_KEY = "ev-attendee";

const STATUS: Record<string, number> = { not_found: 404, forbidden: 403, invalid_input: 422, order_expired: 410 };

const checkinBody = z.object({
  id: z.uuid(),
  code: z.string().min(1).max(500),
  checkpointId: z.string().min(1),
  operatingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entryCheckConfirmed: z.boolean().nullish(),
  deviceName: z.string().max(60).default(""),
  scannedAt: z.iso.datetime().optional(),
});

interface Ctx {
  b: Backend;
  params: string[];
  body: unknown;
  url: URL;
  headers: Headers;
}

type Handler = (ctx: Ctx) => unknown | Response | Promise<unknown | Response>;

const routes: [string, RegExp, Handler][] = [
  ["POST", /^\/api\/orders$/, ({ b, body }) => {
    const slug = (body as { slug?: unknown } | null)?.slug;
    const { order, accessToken } = b.ticketing.createOrder(typeof slug === "string" ? slug : "", body);
    return { orderId: order.id, token: accessToken, expiresAt: order.expiresAt };
  }],
  ["POST", /^\/api\/orders\/([^/]+)\/quote$/, ({ b, params, body, headers }) => {
    const q = b.ticketing.quote(params[0]!, headers.get("x-order-token") ?? "", body);
    return {
      subtotalSatang: q.subtotalSatang,
      discountSatang: q.discountSatang,
      feeSatang: q.feeSatang,
      totalSatang: q.totalSatang,
      vatSatang: q.vatSatang,
      promo: q.promo ? { code: q.promo.code, label: q.promo.label } : null,
    };
  }],
  ["POST", /^\/api\/orders\/([^/]+)\/checkout$/, ({ b, params, body, headers }) =>
    b.ticketing.submitCheckout(params[0]!, headers.get("x-order-token") ?? "", body)],
  // หน้า mock gateway: จำลองผลการจ่าย แล้วส่ง webhook ที่เซ็นแล้วเข้า handler ตัวเดียวกับ gateway จริง
  ["POST", /^\/api\/mock-pay\/([^/]+)$/, async ({ b, params, body }) => {
    const charge = b.payments.getCharge(params[0]!);
    if (!charge) throw new TicketingError("not_found", "charge not found");
    if (charge.status !== "pending") return json({ error: { code: "invalid_state" }, returnUrl: charge.returnUrl }, 409);
    const outcome = (body as { outcome?: string } | null)?.outcome === "failed" ? "failed" : "succeeded";
    const hook = b.payments.simulate(charge.id, outcome);
    const result = await b.ticketing.handleWebhook(hook.headers, hook.body);
    return { ...result, returnUrl: charge.returnUrl };
  }],
  ["POST", /^\/api\/onsite\/checkins$/, ({ b, body }) => b.onsite.checkIn(parse(checkinBody, body))],
  ["POST", /^\/api\/onsite\/sync$/, ({ b, body }) => {
    const { scans } = parse(z.object({ scans: z.array(checkinBody).max(500) }), body);
    return {
      results: b.onsite.syncCheckins(scans).map((r) => ({ id: r.checkin?.id ?? null, result: r.result, duplicate: r.duplicate })),
    };
  }],
  ["GET", /^\/api\/onsite\/snapshot$/, ({ b }) => b.onsite.snapshot()],
  ["GET", /^\/api\/onsite\/search$/, ({ b, url }) => ({ results: b.onsite.search((url.searchParams.get("q") ?? "").slice(0, 100)) })],
  ["GET", /^\/api\/onsite\/recent$/, ({ b, url }) => ({ recent: b.onsite.recentCheckins(url.searchParams.get("date") ?? "") })],
  ["POST", /^\/api\/onsite\/wristband$/, ({ b, body }) => {
    const { attendeeId, uid } = parse(z.object({ attendeeId: z.string().min(1), uid: z.string().min(1).max(40) }), body);
    return { attendee: b.onsite.pairWristband(attendeeId, uid) };
  }],
  // ผู้เข้างานยืนยันตัวที่บูธด้วยรหัสบัตร + อีเมล (เบราว์เซอร์จำไว้ใช้กับทุกบูธ)
  ["POST", /^\/api\/booths\/([^/]+)\/identify$/, ({ b, params, body }) => {
    const { ticketCode, email } = parse(z.object({ ticketCode: z.string().min(1).max(20), email: z.string().min(3).max(200) }), body);
    b.onsite.boothBySlug(params[0]!);
    const a = b.onsite.identifyAttendee(ticketCode, email);
    setStored(ATTENDEE_KEY, signAttendeeCookie(ATTENDEE_SECRET, a.id));
    return { ok: true };
  }],
  ["DELETE", /^\/api\/booths\/([^/]+)\/identify$/, () => {
    setStored(ATTENDEE_KEY, null);
    return { ok: true };
  }],
  ["POST", /^\/api\/booths\/([^/]+)\/action$/, ({ b, params, body }) => {
    const { action } = parse(z.object({ action: z.enum(["visit", "interested", "request_info"]) }), body);
    const attendeeId = currentAttendeeId();
    if (!attendeeId) throw new TicketingError("forbidden", "not identified");
    return { interestLevel: b.onsite.attendeeBoothAction(params[0]!, attendeeId, action).interestLevel };
  }],
  ["POST", /^\/api\/booth-staff\/([^/]+)\/scan$/, ({ b, params, body }) => {
    const input = parse(z.object({ id: z.uuid(), code: z.string().min(1).max(500), deviceName: z.string().max(60).default("") }), body);
    return b.onsite.staffScan({ ...input, boothId: params[0]! });
  }],
  ["PATCH", /^\/api\/booth-staff\/([^/]+)\/leads\/([^/]+)$/, ({ b, params, body }) => {
    const p = parse(z.object({ rating: z.enum(["hot", "warm", "cold"]).nullish(), notes: z.string().max(1000).optional() }), body);
    return { lead: b.onsite.updateLead(params[0]!, params[1]!, { ...(p.rating !== undefined ? { rating: p.rating } : {}), notes: p.notes }) };
  }],
  // export lead เป็น CSV — ทุกครั้งถูกบันทึกเป็นหลักฐานการแชร์ข้อมูล
  ["POST", /^\/api\/sponsors\/([^/]+)\/export$/, ({ b, params, body }) => {
    const by = (body as { by?: unknown } | null)?.by;
    const { csv, record } = b.onsite.exportLeads(params[0]!, typeof by === "string" ? by : "");
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="leads-${params[0]}-${record.createdAt.slice(0, 10)}.csv"`,
      },
    });
  }],
];

export async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const url = new URL(path, "http://local");
  const route = routes.find(([m, re]) => m === method && re.test(url.pathname));
  if (!route) return json({ error: { code: "not_found" } }, 404);
  const b = await getBackend();
  let body: unknown = null;
  try {
    body = typeof init.body === "string" ? JSON.parse(init.body) : null;
  } catch {
    body = null;
  }
  try {
    const out = await route[2]({
      b,
      params: route[1].exec(url.pathname)!.slice(1),
      body,
      url,
      headers: new Headers(init.headers),
    });
    return out instanceof Response ? out : json(out, method === "POST" && url.pathname === "/api/orders" ? 201 : 200);
  } catch (err) {
    if (err instanceof TicketingError) {
      return json({ error: { code: err.code, message: err.message, details: err.details ?? null } }, STATUS[err.code] ?? 409);
    }
    if (err instanceof InvalidWebhookError) return json({ error: { code: "invalid_signature" } }, 401);
    console.error(err);
    return json({ error: { code: "unknown" } }, 500);
  } finally {
    if (method !== "GET") persist();
  }
}

// attendee ที่ยืนยันตัวที่บูธแล้ว (ค่าเซ็น HMAC ใน localStorage)
export function currentAttendeeId(): string | null {
  return verifyAttendeeCookie(ATTENDEE_SECRET, getStored(ATTENDEE_KEY) ?? undefined);
}

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) throw new TicketingError("invalid_input", "invalid input");
  return r.data;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

function getStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStored(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}
