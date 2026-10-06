import { describe, expect, it } from "vitest";
import {
  MockPaymentProvider,
  priceOrder,
  TicketingError,
  TicketingService,
  verifyTicketQr,
  type Catalog,
} from "../src";
import { createPaidFixtureCatalog } from "./fixtures/paid-catalog";

const SLUG = "bangkok-event-tech-2026";

function setup(opts: { catalog?: Catalog; start?: string } = {}) {
  let now = new Date(opts.start ?? "2026-10-05T10:00:00+07:00");
  const clock = () => now;
  const payments = new MockPaymentProvider({ secret: "test-secret", payPageBaseUrl: "http://x/mock-pay", now: clock });
  const svc = new TicketingService({
    catalog: opts.catalog ?? createPaidFixtureCatalog(),
    payments,
    baseUrl: "http://x",
    now: clock,
  });
  return {
    svc,
    payments,
    advance(minutes: number) {
      now = new Date(now.getTime() + minutes * 60_000);
    },
  };
}

const buyer = {
  firstName: "Somchai",
  lastName: "Jaidee",
  email: "somchai@example.com",
  phone: null,
  nationality: "TH",
};
const consents = { shareWithSponsors: true, organizerMarketing: false };

function holdersFor(order: { items: { id: string; kind: string; quantity: number }[] }, emailPrefix = "h") {
  return order.items
    .filter((i) => i.kind === "ticket")
    .flatMap((i) =>
      Array.from({ length: i.quantity }, (_, index) => ({
        orderItemId: i.id,
        index,
        firstName: "Holder",
        lastName: `${index}`,
        email: `${emailPrefix}${index}-${i.id.slice(0, 4)}@example.com`,
      })),
    );
}

function expectCode(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(TicketingError);
    expect((e as TicketingError).code).toBe(code);
    return;
  }
  throw new Error(`expected TicketingError ${code}`);
}

async function expectCodeAsync(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toMatchObject({ code });
}

describe("pricing", () => {
  it("applies percent discount only to eligible ticket lines and computes inclusive VAT", () => {
    const r = priceOrder({
      lines: [
        { id: "a", kind: "ticket", ticketTypeId: "tt_conf", unitPriceSatang: 250_000, quantity: 2 },
        { id: "b", kind: "addon", ticketTypeId: null, unitPriceSatang: 39_000, quantity: 1 },
      ],
      promo: {
        id: "p",
        eventId: "e",
        code: "X",
        label: { th: "", en: "" },
        discountType: "percent",
        discountValue: 10,
        ticketTypeIds: ["tt_conf"],
        unlocksTicketTypeIds: null,
        maxUses: null,
        validFrom: null,
        validTo: null,
      },
      feeMode: "absorb",
      platformFeeBps: 300,
      vatRateBps: 700,
      method: "card",
    });
    expect(r.subtotalSatang).toBe(539_000);
    expect(r.discountSatang).toBe(50_000);
    expect(r.totalSatang).toBe(489_000);
    expect(r.feeSatang).toBe(0);
    expect(r.vatSatang).toBe(Math.round((489_000 * 7) / 107));
    expect(r.platformFeeSatang).toBe(14_670);
    expect(r.gatewayFeeSatang).toBe(Math.round((489_000 * 365) / 10_000));
  });

  it("adds platform fee on top when fee mode is pass_on", () => {
    const r = priceOrder({
      lines: [{ id: "a", kind: "ticket", ticketTypeId: "t", unitPriceSatang: 100_000, quantity: 1 }],
      promo: null,
      feeMode: "pass_on",
      platformFeeBps: 300,
      vatRateBps: 0,
      method: null,
    });
    expect(r.feeSatang).toBe(3_000);
    expect(r.totalSatang).toBe(103_000);
  });
});

describe("event view", () => {
  it("hides the press pass until a valid unlock code is given", () => {
    const { svc } = setup();
    expect(svc.getEventView(SLUG).tickets.map((t) => t.ticketType.code)).not.toContain("PRESS");
    const unlocked = svc.getEventView(SLUG, { unlockCode: "press2026" });
    expect(unlocked.unlock?.valid).toBe(true);
    expect(unlocked.tickets.map((t) => t.ticketType.code)).toContain("PRESS");
  });

  it("shows both free and paid tickets", () => {
    const { svc } = setup();
    const prices = svc.getEventView(SLUG).tickets.map((t) => t.ticketType.priceSatang);
    expect(prices).toContain(0);
    expect(prices.some((p) => p > 0)).toBe(true);
  });
});

describe("rounds", () => {
  it("groups offers by event day: day tickets and workshops per day, 2-day passes in every round", () => {
    const { svc } = setup();
    const rounds = svc.getEventView(SLUG).rounds;
    expect(rounds.map((r) => r.date)).toEqual(["2026-11-21", "2026-11-22"]);
    const sat = rounds[0]!;
    const offers = sat.offers.map((o) => `${o.ticketTypeId}|${o.slotId ?? ""}`);
    expect(offers).toContain("tt_expo|slot_day1");
    expect(offers).not.toContain("tt_expo|slot_day2");
    expect(offers).toContain("tt_conf|");
    expect(offers).toContain("tt_ws_ai|slot_ws_ai");
    expect(offers).not.toContain("tt_ws_fin|slot_ws_fin");
    expect(sat.status).toBe("on_sale");
    expect(sat.startsAt).toBe("2026-11-21T09:00:00+07:00");
  });

  it("marks a sold-out workshop per round without closing the round", () => {
    const { svc } = setup();
    for (let i = 0; i < 2; i++) {
      svc.createOrder(SLUG, {
        acceptTerms: true,
        lines: [
          { kind: "ticket", ticketTypeId: "tt_conf", quantity: 4 },
          { kind: "ticket", ticketTypeId: "tt_ws_content", quantity: 4 },
        ],
      });
    }
    const sun = svc.getEventView(SLUG).rounds[1]!;
    expect(sun.offers.find((o) => o.ticketTypeId === "tt_ws_content")!.saleState).toBe("sold_out");
    expect(sun.status).toBe("on_sale");
  });
});

describe("create order", () => {
  it("requires accepting the terms first and records when", () => {
    const { svc } = setup();
    expectCode(
      () => svc.createOrder(SLUG, { lines: [{ kind: "ticket", ticketTypeId: "tt_conf", quantity: 1 }] }),
      "invalid_input",
    );
    const { order } = svc.createOrder(SLUG, {
      acceptTerms: true,
      lines: [{ kind: "ticket", ticketTypeId: "tt_conf", quantity: 1 }],
    });
    expect(order.termsAcceptedAt).toBe(new Date("2026-10-05T10:00:00+07:00").toISOString());
  });

  it("reserves capacity and releases it when the hold expires", () => {
    const { svc, advance } = setup();
    svc.createOrder(SLUG, { acceptTerms: true, lines: [{ kind: "ticket", ticketTypeId: "tt_vip", quantity: 3 }] });
    expect(svc.store.ticketTypeTaken.get("tt_vip")).toBe(3);
    expect(svc.store.eventTaken).toBe(3);
    advance(16);
    expect(svc.expireStale()).toBe(1);
    expect(svc.store.ticketTypeTaken.get("tt_vip")).toBe(0);
    expect(svc.store.eventTaken).toBe(0);
  });

  it("never oversells a workshop slot and is all-or-nothing", () => {
    const { svc } = setup();
    // WS-CONTENT มี 8 ที่ — 2 order ละ 4 ใบเต็มพอดี
    for (let i = 0; i < 2; i++) {
      svc.createOrder(SLUG, {
        acceptTerms: true,
        lines: [
          { kind: "ticket", ticketTypeId: "tt_conf", quantity: 4 },
          { kind: "ticket", ticketTypeId: "tt_ws_content", quantity: 4 },
        ],
      });
    }
    const confBefore = svc.store.ticketTypeTaken.get("tt_conf");
    expectCode(
      () =>
        svc.createOrder(SLUG, {
          acceptTerms: true,
          lines: [
            { kind: "ticket", ticketTypeId: "tt_conf", quantity: 1 },
            { kind: "ticket", ticketTypeId: "tt_ws_content", quantity: 1 },
          ],
        }),
      "sold_out",
    );
    expect(svc.store.slotTaken.get("slot_ws_content")).toBe(8);
    // บัตร conference ใน order ที่ล้มเหลวต้องไม่ถูกหัก
    expect(svc.store.ticketTypeTaken.get("tt_conf")).toBe(confBefore);
    const ws = svc.getEventView(SLUG).tickets.find((t) => t.ticketType.code === "WS-CONTENT")!;
    expect(ws.saleState).toBe("sold_out");
  });

  it("requires an admission ticket in the same order for workshops and add-ons", () => {
    const { svc } = setup();
    expectCode(
      () => svc.createOrder(SLUG, { acceptTerms: true, lines: [{ kind: "ticket", ticketTypeId: "tt_ws_ai", quantity: 1 }] }),
      "requires_admission",
    );
    expectCode(
      () =>
        svc.createOrder(SLUG, {
          acceptTerms: true,
          lines: [
            { kind: "ticket", ticketTypeId: "tt_ws_ai", quantity: 1 },
            { kind: "addon", productId: "pr_lunch", quantity: 1 },
          ],
        }),
      "requires_admission",
    );
  });

  it("requires choosing a day for the expo pass and enforces per-order limits", () => {
    const { svc } = setup();
    expectCode(
      () => svc.createOrder(SLUG, { acceptTerms: true, lines: [{ kind: "ticket", ticketTypeId: "tt_expo", quantity: 1 }] }),
      "invalid_input",
    );
    expectCode(
      () =>
        svc.createOrder(SLUG, {
          acceptTerms: true,
          lines: [
            { kind: "ticket", ticketTypeId: "tt_expo", slotId: "slot_day1", quantity: 3 },
            { kind: "ticket", ticketTypeId: "tt_expo", slotId: "slot_day2", quantity: 3 },
          ],
        }),
      "limit_exceeded",
    );
  });

  it("rejects hidden tickets without the unlock code and stops sales after the sales window", () => {
    const { svc } = setup();
    expectCode(
      () => svc.createOrder(SLUG, { acceptTerms: true, lines: [{ kind: "ticket", ticketTypeId: "tt_press", quantity: 1 }] }),
      "not_found",
    );
    const late = setup({ start: "2026-11-21T12:00:00+07:00" });
    expectCode(
      () => late.svc.createOrder(SLUG, { acceptTerms: true, lines: [{ kind: "ticket", ticketTypeId: "tt_conf", quantity: 1 }] }),
      "not_on_sale",
    );
  });
});

describe("checkout", () => {
  it("confirms a free order immediately and issues signed QR tickets", async () => {
    const { svc } = setup();
    const { order, accessToken } = svc.createOrder(SLUG, {
      acceptTerms: true,
      lines: [{ kind: "ticket", ticketTypeId: "tt_expo", slotId: "slot_day1", quantity: 2 }],
    });
    const holders = holdersFor(order);
    holders[0]!.email = buyer.email;
    const res = await svc.submitCheckout(order.id, accessToken, { buyer, holders, consents });
    expect(res).toEqual({ status: "confirmed" });
    const view = svc.getOrder(order.id, accessToken);
    expect(view.order.status).toBe("confirmed");
    expect(view.attendees).toHaveLength(2);
    expect(view.attendees.every((a) => verifyTicketQr(svc.qrKeys.publicKey, a.qrToken))).toBe(true);
    // consent ของผู้ซื้อใช้ได้กับบัตรของผู้ซื้อเองเท่านั้น
    expect(view.attendees.filter((a) => a.shareWithSponsors).map((a) => a.email)).toEqual([buyer.email]);
  });

  it("treats accepting the terms as sponsor consent for the buyer's own ticket only", async () => {
    const { svc } = setup();
    const { order, accessToken } = svc.createOrder(SLUG, {
      acceptTerms: true,
      lines: [{ kind: "ticket", ticketTypeId: "tt_expo", slotId: "slot_day1", quantity: 2 }],
    });
    const holders = holdersFor(order);
    holders[0]!.email = buyer.email;
    // ไม่ส่ง shareWithSponsors → ใช้ค่าจากการยอมรับเงื่อนไข (true)
    await svc.submitCheckout(order.id, accessToken, { buyer, holders, consents: { organizerMarketing: false } });
    const shared = svc.getOrder(order.id, accessToken).attendees.map((a) => [a.email, a.shareWithSponsors]);
    expect(shared).toContainEqual([buyer.email, true]);
    expect(shared.filter(([, s]) => s)).toHaveLength(1);
  });

  it("rejects the same person registering twice for a one-per-person free ticket", async () => {
    const { svc } = setup();
    const first = svc.createOrder(SLUG, {
      acceptTerms: true,
      lines: [{ kind: "ticket", ticketTypeId: "tt_expo", slotId: "slot_day1", quantity: 1 }],
    });
    const h = holdersFor(first.order);
    h[0]!.email = "dup@example.com";
    await svc.submitCheckout(first.order.id, first.accessToken, { buyer, holders: h, consents });

    const second = svc.createOrder(SLUG, {
      acceptTerms: true,
      lines: [{ kind: "ticket", ticketTypeId: "tt_expo", slotId: "slot_day1", quantity: 1 }],
    });
    const h2 = holdersFor(second.order);
    h2[0]!.email = "DUP@example.com";
    await expectCodeAsync(
      svc.submitCheckout(second.order.id, second.accessToken, { buyer, holders: h2, consents }),
      "duplicate_holder",
    );
  });

  it("runs a paid order through the mock gateway and webhook", async () => {
    const { svc, payments } = setup();
    const { order, accessToken } = svc.createOrder(SLUG, {
      acceptTerms: true,
      lines: [
        { kind: "ticket", ticketTypeId: "tt_conf", quantity: 1 },
        { kind: "ticket", ticketTypeId: "tt_ws_fin", quantity: 1 },
        { kind: "addon", productId: "pr_tshirt", quantity: 1 },
      ],
    });
    const quote = svc.quote(order.id, accessToken, { promoCode: "workshop300" });
    expect(quote.discountSatang).toBe(30_000);

    const res = await svc.submitCheckout(order.id, accessToken, {
      buyer,
      holders: holdersFor(order),
      consents,
      promoCode: "WORKSHOP300",
      paymentMethod: "promptpay",
    });
    expect(res.status).toBe("redirect");
    const view = svc.getOrder(order.id, accessToken);
    expect(view.order.totalSatang).toBe(250_000 + 150_000 + 39_000 - 30_000);
    expect(view.order.status).toBe("pending_payment");

    const chargeId = view.payments[0]!.providerChargeId;
    const hook = payments.simulate(chargeId, "succeeded");
    expect(await svc.handleWebhook(hook.headers, hook.body)).toEqual({ result: "confirmed" });
    // webhook ซ้ำต้องไม่ออกบัตรซ้ำ
    expect(await svc.handleWebhook(hook.headers, hook.body)).toEqual({ result: "duplicate" });
    const after = svc.getOrder(order.id, accessToken);
    expect(after.order.status).toBe("confirmed");
    expect(after.attendees).toHaveLength(2);
    expect(svc.store.promoUsed.get("pc_ws300")).toBe(1);
  });

  it("rejects webhooks with a bad signature", async () => {
    const { svc, payments } = setup();
    const { order, accessToken } = svc.createOrder(SLUG, {
      acceptTerms: true,
      lines: [{ kind: "ticket", ticketTypeId: "tt_vip", quantity: 1 }],
    });
    await svc.submitCheckout(order.id, accessToken, {
      buyer,
      holders: holdersFor(order),
      consents,
      paymentMethod: "card",
    });
    const chargeId = svc.getOrder(order.id, accessToken).payments[0]!.providerChargeId;
    const hook = payments.simulate(chargeId, "succeeded");
    await expect(svc.handleWebhook({ "x-mock-signature": "00" }, hook.body)).rejects.toThrow(/signature/);
    expect(svc.getOrder(order.id, accessToken).order.status).toBe("pending_payment");
  });

  it("lets the buyer retry after a failed payment", async () => {
    const { svc, payments } = setup();
    const { order, accessToken } = svc.createOrder(SLUG, {
      acceptTerms: true,
      lines: [{ kind: "ticket", ticketTypeId: "tt_conf", quantity: 1 }],
    });
    const input = { buyer, holders: holdersFor(order), consents, paymentMethod: "card" as const };
    await svc.submitCheckout(order.id, accessToken, input);
    const first = svc.getOrder(order.id, accessToken).payments[0]!;
    const fail = payments.simulate(first.providerChargeId, "failed");
    expect(await svc.handleWebhook(fail.headers, fail.body)).toEqual({ result: "failed" });

    await svc.submitCheckout(order.id, accessToken, input);
    const second = svc.getOrder(order.id, accessToken).payments[1]!;
    const ok = payments.simulate(second.providerChargeId, "succeeded");
    expect(await svc.handleWebhook(ok.headers, ok.body)).toEqual({ result: "confirmed" });
  });

  it("re-reserves on late payment, or refunds when the slot filled up meanwhile", async () => {
    const { svc, payments, advance } = setup();
    const lines = [
      { kind: "ticket" as const, ticketTypeId: "tt_conf", quantity: 4 },
      { kind: "ticket" as const, ticketTypeId: "tt_ws_content", quantity: 4 },
    ];
    const late = svc.createOrder(SLUG, { acceptTerms: true, lines });
    await svc.submitCheckout(late.order.id, late.accessToken, {
      buyer,
      holders: holdersFor(late.order),
      consents,
      paymentMethod: "mobile_banking",
    });
    const lateCharge = svc.getOrder(late.order.id, late.accessToken).payments[0]!.providerChargeId;

    advance(20); // หมดเวลาจอง ที่นั่งถูกปล่อย
    expect(svc.getOrder(late.order.id, late.accessToken).order.status).toBe("expired");
    // มีคนอื่นซื้อ workshop จนเต็ม
    svc.createOrder(SLUG, { acceptTerms: true, lines });
    svc.createOrder(SLUG, { acceptTerms: true, lines });

    const hook = payments.simulate(lateCharge, "succeeded");
    expect(await svc.handleWebhook(hook.headers, hook.body)).toEqual({ result: "refunded" });
    expect(svc.store.refunds).toHaveLength(1);
    expect(svc.getOrder(late.order.id, late.accessToken).order.status).toBe("refunded");

    // กรณียังมีที่ว่าง: จ่ายช้าแต่ได้บัตร
    const s2 = setup();
    const o = s2.svc.createOrder(SLUG, { acceptTerms: true, lines: [{ kind: "ticket", ticketTypeId: "tt_vip", quantity: 1 }] });
    await s2.svc.submitCheckout(o.order.id, o.accessToken, {
      buyer,
      holders: holdersFor(o.order),
      consents,
      paymentMethod: "promptpay",
    });
    const c = s2.svc.getOrder(o.order.id, o.accessToken).payments[0]!.providerChargeId;
    s2.advance(30);
    s2.svc.expireStale();
    const h2 = s2.payments.simulate(c, "succeeded");
    expect(await s2.svc.handleWebhook(h2.headers, h2.body)).toEqual({ result: "confirmed" });
    expect(s2.svc.store.ticketTypeTaken.get("tt_vip")).toBe(1);
  });

  it("refuses checkout with a wrong token or after expiry", async () => {
    const { svc, advance } = setup();
    const { order, accessToken } = svc.createOrder(SLUG, {
      acceptTerms: true,
      lines: [{ kind: "ticket", ticketTypeId: "tt_conf", quantity: 1 }],
    });
    expectCode(() => svc.getOrder(order.id, "wrong"), "forbidden");
    advance(16);
    await expectCodeAsync(
      svc.submitCheckout(order.id, accessToken, {
        buyer,
        holders: holdersFor(order),
        consents,
        paymentMethod: "card",
      }),
      "order_expired",
    );
  });

  it("releases a reserved promo use when the order expires", async () => {
    const catalog = createPaidFixtureCatalog();
    catalog.promoCodes.find((p) => p.code === "TEAM10")!.maxUses = 1;
    const { svc, advance } = setup({ catalog });
    const a = svc.createOrder(SLUG, { acceptTerms: true, lines: [{ kind: "ticket", ticketTypeId: "tt_conf", quantity: 1 }] });
    await svc.submitCheckout(a.order.id, a.accessToken, {
      buyer,
      holders: holdersFor(a.order),
      consents,
      promoCode: "TEAM10",
      paymentMethod: "card",
    });
    const b = svc.createOrder(SLUG, { acceptTerms: true, lines: [{ kind: "ticket", ticketTypeId: "tt_conf", quantity: 1 }] });
    expectCode(() => svc.quote(b.order.id, b.accessToken, { promoCode: "TEAM10" }), "promo_invalid");
    advance(16);
    svc.expireStale();
    const c = svc.createOrder(SLUG, { acceptTerms: true, lines: [{ kind: "ticket", ticketTypeId: "tt_conf", quantity: 1 }] });
    expect(svc.quote(c.order.id, c.accessToken, { promoCode: "TEAM10" }).discountSatang).toBe(25_000);
  });
});
