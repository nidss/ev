// business logic ของการซื้อบัตร: แสดงบัตร → จองที่นั่ง → checkout → จ่ายเงิน → ออกบัตร
// prototype เก็บข้อมูลใน memory (MemoryStore) — ทุกขั้น "ตรวจ + หักความจุ" ทำแบบ synchronous
// จึงเทียบเท่า transaction เดียวใน Postgres ตาม docs/TICKETING.md §3
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { generateQrKeys, hashToken, newAccessToken, readableCode, signTicketQr, type QrKeys } from "./codes";
import { TicketingError } from "./errors";
import type { PaymentProvider } from "./payments/provider";
import { priceOrder, type PricingResult } from "./pricing";
import type {
  Attendee,
  Catalog,
  Holder,
  Order,
  OrderItem,
  Payment,
  PaymentMethod,
  Product,
  PromoCode,
  Refund,
  TicketType,
  TimeSlot,
} from "./types";
import {
  checkoutSchema,
  createOrderSchema,
  quoteSchema,
  type CheckoutInput,
  type CreateOrderInput,
  type QuoteInput,
} from "./validation";

export class MemoryStore {
  orders = new Map<string, Order>();
  payments = new Map<string, Payment>();
  paymentIdByCharge = new Map<string, string>();
  attendees = new Map<string, Attendee>();
  refunds: Refund[] = [];
  processedWebhookEvents = new Set<string>();
  // ตัวนับความจุ (= taken ใน data model): นับทั้งที่จองรอจ่ายและที่ขายแล้ว
  eventTaken = 0;
  slotTaken = new Map<string, number>();
  ticketTypeTaken = new Map<string, number>();
  productTaken = new Map<string, number>();
  promoUsed = new Map<string, number>();
}

export type SaleState = "on_sale" | "not_started" | "ended" | "sold_out";

export interface TicketAvailability {
  ticketType: TicketType;
  saleState: SaleState;
  remaining: number | null; // null = ไม่จำกัด
  slots: { slot: TimeSlot; remaining: number | null }[];
}

// รอบ = วันที่เข้างาน (แบบ "เลือกรอบการแสดง" ของ ThaiTicketMajor / "เลือกวันที่" ของ Zipevent)
export interface RoundOffer {
  ticketTypeId: string;
  slotId: string | null; // null = บัตรที่ใช้ได้ทั้งงาน (แสดงในทุกรอบ)
  remaining: number | null;
  saleState: SaleState;
}

export interface EventRound {
  date: string; // YYYY-MM-DD ตามเวลาท้องถิ่นของงาน
  startsAt: string;
  endsAt: string;
  status: "on_sale" | "sold_out" | "closed";
  offers: RoundOffer[];
}

export interface EventView {
  catalog: Catalog;
  tickets: TicketAvailability[];
  rounds: EventRound[];
  products: { product: Product; remaining: number | null }[];
  unlock: { code: string; valid: boolean } | null;
}

export interface OrderView {
  order: Order;
  attendees: Attendee[];
  payments: Payment[];
  catalog: Catalog;
  holdSecondsLeft: number;
}

export type CheckoutResult =
  | { status: "confirmed" }
  | { status: "redirect"; redirectUrl: string };

interface Hold {
  event: number;
  slots: Map<string, number>;
  ticketTypes: Map<string, number>;
  products: Map<string, number>;
}

export interface TicketingOptions {
  catalog: Catalog;
  payments: PaymentProvider;
  // URL ของเว็บ ใช้สร้างลิงก์ที่ gateway พากลับมา
  baseUrl: string;
  store?: MemoryStore;
  qrKeys?: QrKeys;
  now?: () => Date;
}

export class TicketingService {
  readonly catalog: Catalog;
  readonly store: MemoryStore;
  readonly qrKeys: QrKeys;
  private readonly payments: PaymentProvider;
  private readonly baseUrl: string;
  private readonly now: () => Date;

  constructor(options: TicketingOptions) {
    this.catalog = options.catalog;
    this.payments = options.payments;
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.store = options.store ?? new MemoryStore();
    this.qrKeys = options.qrKeys ?? generateQrKeys();
    this.now = options.now ?? (() => new Date());
  }

  // ---------- หน้า event ----------

  getEventView(slug: string, opts: { unlockCode?: string | null } = {}): EventView {
    this.requireEvent(slug);
    this.expireStale();
    const unlockPromo = opts.unlockCode ? this.findPromo(opts.unlockCode) : null;
    const unlocked = new Set(unlockPromo?.unlocksTicketTypeIds ?? []);

    const tickets = this.catalog.ticketTypes
      .filter((t) => t.isPublic || unlocked.has(t.id))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => this.availability(t));

    const products = [...this.catalog.products]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((product) => ({ product, remaining: remainingOf(product.stock, this.store.productTaken.get(product.id)) }));

    return {
      catalog: this.catalog,
      tickets,
      rounds: this.rounds(tickets),
      products,
      unlock: opts.unlockCode
        ? { code: opts.unlockCode, valid: unlocked.size > 0 && this.isPromoActive(unlockPromo!) }
        : null,
    };
  }

  private rounds(tickets: TicketAvailability[]): EventRound[] {
    const { event } = this.catalog;
    const day = (iso: string) => localDate(iso, event.timezone);
    const dates: string[] = [];
    for (let d = Date.parse(event.startsAt); day(new Date(d).toISOString()) <= day(event.endsAt); d += 86_400_000) {
      const key = day(new Date(d).toISOString());
      if (!dates.includes(key)) dates.push(key);
    }

    return dates.map((date) => {
      const offers: RoundOffer[] = [];
      for (const t of tickets) {
        if (t.slots.length === 0) {
          offers.push({ ticketTypeId: t.ticketType.id, slotId: null, remaining: t.remaining, saleState: t.saleState });
          continue;
        }
        for (const s of t.slots) {
          if (day(s.slot.startsAt) !== date) continue;
          const timeClosed = t.saleState === "not_started" || t.saleState === "ended";
          offers.push({
            ticketTypeId: t.ticketType.id,
            slotId: s.slot.id,
            remaining: s.remaining,
            saleState: timeClosed ? t.saleState : s.remaining === 0 ? "sold_out" : "on_sale",
          });
        }
      }
      const daySlots = this.catalog.slots.filter((s) => day(s.startsAt) === date);
      // สถานะของรอบดูจากบัตรเข้างาน (workshop ซื้อเดี่ยวไม่ได้ จึงไม่นับ)
      const admission = offers.filter((o) => this.ticketType(o.ticketTypeId).requiresTicketTypeIds === null);
      const status = admission.some((o) => o.saleState === "on_sale")
        ? "on_sale"
        : admission.some((o) => o.saleState === "sold_out")
          ? "sold_out"
          : "closed";
      return {
        date,
        startsAt: daySlots.map((s) => s.startsAt).sort()[0] ?? event.startsAt,
        endsAt: daySlots.map((s) => s.endsAt).sort().at(-1) ?? event.endsAt,
        status,
        offers,
      };
    });
  }

  private availability(t: TicketType): TicketAvailability {
    const now = this.now().getTime();
    const typeRemaining = remainingOf(t.quota, this.store.ticketTypeTaken.get(t.id));
    const eventRemaining = t.countsTowardEventCapacity
      ? remainingOf(this.catalog.event.capacity, this.store.eventTaken)
      : null;
    const base = minRemaining(typeRemaining, eventRemaining);

    const slots = (t.slotIds ?? []).map((id) => {
      const slot = this.slot(id);
      return { slot, remaining: minRemaining(base, remainingOf(slot.capacity, this.store.slotTaken.get(id))) };
    });
    const remaining = slots.length > 0 ? maxRemaining(slots.map((s) => s.remaining)) : base;

    let saleState: SaleState = "on_sale";
    if (t.salesStartsAt && now < Date.parse(t.salesStartsAt)) saleState = "not_started";
    else if (t.salesEndsAt && now > Date.parse(t.salesEndsAt)) saleState = "ended";
    else if (remaining !== null && remaining <= 0) saleState = "sold_out";

    return { ticketType: t, saleState, remaining, slots };
  }

  // ---------- สร้าง order + จองที่นั่ง ----------

  createOrder(slug: string, rawInput: unknown): { order: Order; accessToken: string } {
    this.requireEvent(slug);
    this.expireStale();
    const input = parseOrThrow<CreateOrderInput>(createOrderSchema, rawInput);
    const unlockPromo = input.unlockCode ? this.findPromo(input.unlockCode) : null;
    const unlocked = new Set(
      unlockPromo && this.isPromoActive(unlockPromo) ? (unlockPromo.unlocksTicketTypeIds ?? []) : [],
    );

    const items: OrderItem[] = [];
    const qtyByType = new Map<string, number>();
    const qtyByProduct = new Map<string, number>();

    for (const line of input.lines) {
      if (line.kind === "ticket") {
        const t = this.catalog.ticketTypes.find((x) => x.id === line.ticketTypeId);
        if (!t || (!t.isPublic && !unlocked.has(t.id))) {
          throw new TicketingError("not_found", `ticket type ${line.ticketTypeId} not found`);
        }
        const state = this.availability(t).saleState;
        if (state === "not_started" || state === "ended") {
          throw new TicketingError("not_on_sale", `${t.code} is not on sale`, { ticketTypeId: t.id });
        }
        const slotId = this.resolveSlot(t, line.slotId ?? null);
        qtyByType.set(t.id, (qtyByType.get(t.id) ?? 0) + line.quantity);
        const existing = items.find((i) => i.ticketTypeId === t.id && i.slotId === slotId);
        if (existing) existing.quantity += line.quantity;
        else
          items.push({
            id: randomUUID(),
            kind: "ticket",
            ticketTypeId: t.id,
            productId: null,
            slotId,
            quantity: line.quantity,
            unitPriceSatang: t.priceSatang,
            discountSatang: 0,
            nameSnapshot: t.name,
          });
      } else {
        const p = this.catalog.products.find((x) => x.id === line.productId);
        if (!p) throw new TicketingError("not_found", `product ${line.productId} not found`);
        qtyByProduct.set(p.id, (qtyByProduct.get(p.id) ?? 0) + line.quantity);
        const existing = items.find((i) => i.productId === p.id);
        if (existing) existing.quantity += line.quantity;
        else
          items.push({
            id: randomUUID(),
            kind: "addon",
            ticketTypeId: null,
            productId: p.id,
            slotId: null,
            quantity: line.quantity,
            unitPriceSatang: p.priceSatang,
            discountSatang: 0,
            nameSnapshot: p.name,
          });
      }
    }

    if (qtyByType.size === 0) throw new TicketingError("invalid_input", "order must contain at least one ticket");

    for (const [id, qty] of qtyByType) {
      const t = this.ticketType(id);
      if (qty < t.minPerOrder || qty > t.maxPerOrder) {
        throw new TicketingError("limit_exceeded", `${t.code}: ${t.minPerOrder}-${t.maxPerOrder} per order`, {
          ticketTypeId: id,
          max: t.maxPerOrder,
        });
      }
      if (t.requiresTicketTypeIds && !t.requiresTicketTypeIds.some((r) => qtyByType.has(r))) {
        throw new TicketingError("requires_admission", `${t.code} requires an admission ticket`, { ticketTypeId: id });
      }
    }
    for (const [id, qty] of qtyByProduct) {
      const p = this.product(id);
      if (qty > p.maxPerOrder) {
        throw new TicketingError("limit_exceeded", `${p.code}: max ${p.maxPerOrder} per order`, {
          productId: id,
          max: p.maxPerOrder,
        });
      }
      if (p.requiresTicketTypeIds && !p.requiresTicketTypeIds.some((r) => qtyByType.has(r))) {
        throw new TicketingError("requires_admission", `${p.code} requires an admission ticket`, { productId: id });
      }
    }

    this.reserve(this.holdFor(items));

    const now = this.now();
    const accessToken = newAccessToken();
    const pricing = this.price(items, null, null);
    const order: Order = {
      id: randomUUID(),
      eventId: this.catalog.event.id,
      orderCode: readableCode("OR"),
      accessTokenHash: hashToken(accessToken),
      status: "pending_payment",
      expiresAt: new Date(now.getTime() + this.catalog.event.holdMinutes * 60_000).toISOString(),
      createdAt: now.toISOString(),
      termsAcceptedAt: now.toISOString(),
      items,
      unlockCode: unlockPromo && unlocked.size > 0 ? unlockPromo.code : null,
      buyer: null,
      holders: [],
      consents: null,
      taxInvoice: null,
      promoCodeId: null,
      promoReserved: false,
      ...pricingFields(pricing),
      paymentMethod: null,
      confirmedAt: null,
      holdReleased: false,
    };
    applyLineDiscounts(order, pricing);
    this.store.orders.set(order.id, order);
    return { order, accessToken };
  }

  private resolveSlot(t: TicketType, slotId: string | null): string | null {
    if (t.slotIds === null) {
      if (slotId) throw new TicketingError("invalid_input", `${t.code} does not use time slots`);
      return null;
    }
    if (t.slotIds.length === 1 && !slotId) return t.slotIds[0]!;
    if (!slotId || !t.slotIds.includes(slotId)) {
      throw new TicketingError("invalid_input", `${t.code} requires a valid time slot`, { ticketTypeId: t.id });
    }
    return slotId;
  }

  // ---------- อ่าน order (ผู้ซื้อใช้ access token) ----------

  getOrder(orderId: string, accessToken: string): OrderView {
    this.expireStale();
    const order = this.authorize(orderId, accessToken);
    return {
      order,
      attendees: [...this.store.attendees.values()].filter((a) => a.orderId === order.id),
      payments: [...this.store.payments.values()]
        .filter((p) => p.orderId === order.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      catalog: this.catalog,
      holdSecondsLeft:
        order.status === "pending_payment"
          ? Math.max(0, Math.floor((Date.parse(order.expiresAt) - this.now().getTime()) / 1000))
          : 0,
    };
  }

  // ราคาก่อนยืนยัน — ใช้ตอนผู้ซื้อกดใช้โค้ดส่วนลด / เปลี่ยนวิธีจ่าย
  quote(orderId: string, accessToken: string, rawInput: unknown): PricingResult & { promo: PromoCode | null } {
    this.expireStale();
    const order = this.authorize(orderId, accessToken);
    this.requirePending(order);
    const input = parseOrThrow<QuoteInput>(quoteSchema, rawInput);
    const promo = input.promoCode ? this.validatePromo(input.promoCode, order) : null;
    return { ...this.price(order.items, promo, input.paymentMethod ?? null), promo };
  }

  // ---------- checkout ----------

  async submitCheckout(orderId: string, accessToken: string, rawInput: unknown): Promise<CheckoutResult> {
    this.expireStale();
    const order = this.authorize(orderId, accessToken);
    this.requirePending(order);
    const input = parseOrThrow<CheckoutInput>(checkoutSchema, rawInput);

    const holders = this.validateHolders(order, input);
    const promo = input.promoCode ? this.validatePromo(input.promoCode, order) : null;

    // จองสิทธิ์ใช้โค้ด (นับรวมกับ order อื่นที่ยังรอจ่าย) — เปลี่ยนโค้ดได้ ระบบคืนสิทธิ์ของโค้ดเดิมก่อน
    if (order.promoReserved && order.promoCodeId !== (promo?.id ?? null)) this.releasePromo(order);
    if (promo && !order.promoReserved) {
      const used = this.store.promoUsed.get(promo.id) ?? 0;
      if (promo.maxUses !== null && used >= promo.maxUses) {
        throw new TicketingError("promo_invalid", "promo code fully used");
      }
      this.store.promoUsed.set(promo.id, used + 1);
      order.promoReserved = true;
    }
    order.promoCodeId = promo?.id ?? null;

    const pricing = this.price(order.items, promo, input.paymentMethod ?? null);
    if (pricing.totalSatang > 0 && !input.paymentMethod) {
      throw new TicketingError("invalid_input", "payment method is required");
    }

    order.buyer = input.buyer;
    order.holders = holders;
    order.consents = input.consents;
    order.taxInvoice = input.taxInvoice ?? null;
    order.paymentMethod = pricing.totalSatang > 0 ? (input.paymentMethod ?? null) : null;
    Object.assign(order, pricingFields(pricing));
    applyLineDiscounts(order, pricing);

    // บัตรฟรีทั้งหมด (หรือส่วนลดเต็มจำนวน) → ยืนยันทันทีไม่ผ่าน gateway
    if (pricing.totalSatang === 0) {
      this.confirm(order);
      return { status: "confirmed" };
    }

    const method = input.paymentMethod as PaymentMethod;
    const charge = await this.payments.createCharge({
      orderId: order.id,
      amountSatang: pricing.totalSatang,
      method,
      description: `${this.catalog.event.shortCode} ${order.orderCode}`,
      returnUrl: `${this.baseUrl}/t/${order.id}?token=${encodeURIComponent(accessToken)}`,
    });
    const payment: Payment = {
      id: randomUUID(),
      orderId: order.id,
      provider: this.payments.name,
      providerChargeId: charge.providerChargeId,
      method,
      amountSatang: pricing.totalSatang,
      status: "pending",
      createdAt: this.now().toISOString(),
      paidAt: null,
    };
    this.store.payments.set(payment.id, payment);
    this.store.paymentIdByCharge.set(payment.providerChargeId, payment.id);
    return { status: "redirect", redirectUrl: charge.redirectUrl };
  }

  private validateHolders(order: Order, input: CheckoutInput): Holder[] {
    const holders: Holder[] = [];
    const seen = new Set<string>();
    for (const item of order.items) {
      if (item.kind !== "ticket") continue;
      const t = this.ticketType(item.ticketTypeId!);
      for (let index = 0; index < item.quantity; index++) {
        const given = input.holders.find((h) => h.orderItemId === item.id && h.index === index);
        if (t.holderInfo === "buyer_only") continue;
        if (!given) {
          throw new TicketingError("invalid_input", `holder info required for ${t.code} #${index + 1}`, {
            orderItemId: item.id,
            index,
          });
        }
        if (t.holderInfo === "full" && !given.email) {
          throw new TicketingError("invalid_input", `holder email required for ${t.code} #${index + 1}`, {
            orderItemId: item.id,
            index,
          });
        }
        if (t.onePerPerson && given.email) {
          const key = `${t.id}|${item.slotId ?? ""}|${given.email.toLowerCase()}`;
          const taken =
            seen.has(key) ||
            [...this.store.attendees.values()].some(
              (a) =>
                a.status === "registered" &&
                a.ticketTypeId === t.id &&
                a.slotId === item.slotId &&
                a.email?.toLowerCase() === given.email!.toLowerCase(),
            );
          if (taken) {
            throw new TicketingError("duplicate_holder", `${given.email} already has ${t.code}`, {
              orderItemId: item.id,
              index,
              email: given.email,
            });
          }
          seen.add(key);
        }
        holders.push({ ...given, orderItemId: item.id, index });
      }
    }
    return holders;
  }

  // ---------- webhook จาก payment gateway ----------

  async handleWebhook(
    headers: Record<string, string | null | undefined>,
    rawBody: string,
  ): Promise<{ result: "confirmed" | "failed" | "refunded" | "duplicate" | "ignored" }> {
    const event = await this.payments.verifyWebhook(headers, rawBody);
    if (this.store.processedWebhookEvents.has(event.eventId)) return { result: "duplicate" };

    const paymentId = this.store.paymentIdByCharge.get(event.providerChargeId);
    const payment = paymentId ? this.store.payments.get(paymentId) : undefined;
    if (!payment) throw new TicketingError("not_found", `unknown charge ${event.providerChargeId}`);
    if (event.amountSatang !== payment.amountSatang) {
      throw new TicketingError("invalid_state", "webhook amount does not match payment");
    }
    this.store.processedWebhookEvents.add(event.eventId);
    if (payment.status !== "pending") return { result: "duplicate" };

    if (event.status === "failed") {
      payment.status = "failed";
      return { result: "failed" };
    }

    payment.status = "succeeded";
    payment.paidAt = event.occurredAt;
    const order = this.store.orders.get(payment.orderId)!;

    if (order.status === "pending_payment" && !order.holdReleased) {
      this.confirm(order);
      return { result: "confirmed" };
    }

    // จ่ายมาหลัง order หมดเวลา (ที่นั่งถูกปล่อยไปแล้ว): ลองจองใหม่ ถ้าเต็มแล้วคืนเงินอัตโนมัติ
    if (order.status === "expired") {
      try {
        this.reserve(this.holdFor(order.items));
        order.holdReleased = false;
        this.confirm(order);
        return { result: "confirmed" };
      } catch (err) {
        if (!(err instanceof TicketingError) || err.code !== "sold_out") throw err;
        await this.refundPayment(payment, "paid after hold expired; sold out");
        order.status = "refunded";
        return { result: "refunded" };
      }
    }

    // order ยืนยันไปแล้วด้วยการจ่ายอีกครั้ง (จ่ายซ้ำ) → คืนเงินรายการนี้
    await this.refundPayment(payment, "duplicate payment");
    return { result: "refunded" };
  }

  private async refundPayment(payment: Payment, reason: string) {
    const { providerRefundId } = await this.payments.refund({
      providerChargeId: payment.providerChargeId,
      amountSatang: payment.amountSatang,
      reason,
    });
    this.store.refunds.push({
      id: randomUUID(),
      orderId: payment.orderId,
      paymentId: payment.id,
      amountSatang: payment.amountSatang,
      reason,
      providerRefundId,
      createdAt: this.now().toISOString(),
    });
  }

  // ---------- ออกบัตร ----------

  private confirm(order: Order) {
    const nowIso = this.now().toISOString();
    order.status = "confirmed";
    order.confirmedAt = nowIso;
    const buyer = order.buyer!;
    const shareConsent = order.consents?.shareWithSponsors ?? false;

    for (const item of order.items) {
      if (item.kind !== "ticket") continue;
      for (let index = 0; index < item.quantity; index++) {
        const h = order.holders.find((x) => x.orderItemId === item.id && x.index === index);
        const person = h ?? {
          firstName: buyer.firstName,
          lastName: buyer.lastName,
          email: buyer.email,
          company: null,
          jobTitle: null,
        };
        const id = randomUUID();
        this.store.attendees.set(id, {
          id,
          eventId: order.eventId,
          orderId: order.id,
          orderItemId: item.id,
          ticketTypeId: item.ticketTypeId!,
          slotId: item.slotId,
          ticketCode: readableCode("EV"),
          qrVersion: 1,
          qrToken: signTicketQr(this.qrKeys, this.catalog.event.shortCode, id, 1),
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email,
          company: person.company,
          jobTitle: person.jobTitle,
          // consent ของผู้ซื้อใช้แทนได้เฉพาะบัตรของผู้ซื้อเอง — ผู้ถือบัตรคนอื่นต้องให้ consent เอง (Phase ถัดไป)
          shareWithSponsors: shareConsent && person.email?.toLowerCase() === buyer.email.toLowerCase(),
          status: "registered",
          createdAt: nowIso,
        });
      }
    }
  }

  // ---------- ปล่อยที่นั่งของ order ที่หมดเวลา ----------

  // prototype เรียกแบบ lazy ทุกครั้งที่มี request — ของจริงให้ worker เรียกทุก 1 นาที
  expireStale(): number {
    const now = this.now().getTime();
    let count = 0;
    for (const order of this.store.orders.values()) {
      if (order.status !== "pending_payment" || Date.parse(order.expiresAt) > now) continue;
      order.status = "expired";
      this.release(this.holdFor(order.items));
      order.holdReleased = true;
      if (order.promoReserved) this.releasePromo(order);
      // charge ที่ยังค้างอยู่ยังจ่ายเข้ามาได้ → handleWebhook จะจองใหม่หรือคืนเงิน
      count++;
    }
    return count;
  }

  // ---------- ความจุ ----------

  private holdFor(items: OrderItem[]): Hold {
    const hold: Hold = { event: 0, slots: new Map(), ticketTypes: new Map(), products: new Map() };
    for (const item of items) {
      if (item.kind === "ticket") {
        const t = this.ticketType(item.ticketTypeId!);
        if (t.countsTowardEventCapacity) hold.event += item.quantity;
        inc(hold.ticketTypes, t.id, item.quantity);
        if (item.slotId) inc(hold.slots, item.slotId, item.quantity);
      } else {
        inc(hold.products, item.productId!, item.quantity);
      }
    }
    return hold;
  }

  // ตรวจทุกชั้นก่อน แล้วค่อยหักพร้อมกัน (all-or-nothing)
  private reserve(hold: Hold) {
    const s = this.store;
    const { event } = this.catalog;
    if (event.capacity !== null && s.eventTaken + hold.event > event.capacity) {
      throw new TicketingError("sold_out", "event is full");
    }
    for (const [id, qty] of hold.slots) {
      const slot = this.slot(id);
      if (slot.capacity !== null && (s.slotTaken.get(id) ?? 0) + qty > slot.capacity) {
        throw new TicketingError("sold_out", `slot ${id} is full`, {
          slotId: id,
          remaining: slot.capacity - (s.slotTaken.get(id) ?? 0),
        });
      }
    }
    for (const [id, qty] of hold.ticketTypes) {
      const t = this.ticketType(id);
      if (t.quota !== null && (s.ticketTypeTaken.get(id) ?? 0) + qty > t.quota) {
        throw new TicketingError("sold_out", `${t.code} sold out`, {
          ticketTypeId: id,
          remaining: t.quota - (s.ticketTypeTaken.get(id) ?? 0),
        });
      }
    }
    for (const [id, qty] of hold.products) {
      const p = this.product(id);
      if (p.stock !== null && (s.productTaken.get(id) ?? 0) + qty > p.stock) {
        throw new TicketingError("sold_out", `${p.code} out of stock`, {
          productId: id,
          remaining: p.stock - (s.productTaken.get(id) ?? 0),
        });
      }
    }
    s.eventTaken += hold.event;
    for (const [id, qty] of hold.slots) inc(s.slotTaken, id, qty);
    for (const [id, qty] of hold.ticketTypes) inc(s.ticketTypeTaken, id, qty);
    for (const [id, qty] of hold.products) inc(s.productTaken, id, qty);
  }

  private release(hold: Hold) {
    const s = this.store;
    s.eventTaken -= hold.event;
    for (const [id, qty] of hold.slots) inc(s.slotTaken, id, -qty);
    for (const [id, qty] of hold.ticketTypes) inc(s.ticketTypeTaken, id, -qty);
    for (const [id, qty] of hold.products) inc(s.productTaken, id, -qty);
  }

  // ---------- โค้ดส่วนลด ----------

  private findPromo(code: string): PromoCode | null {
    const c = code.trim().toUpperCase();
    return this.catalog.promoCodes.find((p) => p.code.toUpperCase() === c) ?? null;
  }

  private isPromoActive(p: PromoCode): boolean {
    const now = this.now().getTime();
    if (p.validFrom && now < Date.parse(p.validFrom)) return false;
    if (p.validTo && now > Date.parse(p.validTo)) return false;
    return true;
  }

  private validatePromo(code: string, order: Order): PromoCode {
    const promo = this.findPromo(code);
    if (!promo || !this.isPromoActive(promo)) throw new TicketingError("promo_invalid", "invalid promo code");
    const reservedByThisOrder = order.promoReserved && order.promoCodeId === promo.id;
    if (!reservedByThisOrder && promo.maxUses !== null && (this.store.promoUsed.get(promo.id) ?? 0) >= promo.maxUses) {
      throw new TicketingError("promo_invalid", "promo code fully used");
    }
    if (promo.discountValue > 0) {
      const applicable = order.items.some(
        (i) =>
          i.kind === "ticket" &&
          i.unitPriceSatang > 0 &&
          (promo.ticketTypeIds === null || promo.ticketTypeIds.includes(i.ticketTypeId!)),
      );
      if (!applicable) throw new TicketingError("promo_invalid", "promo code does not apply to this order");
    }
    return promo;
  }

  private releasePromo(order: Order) {
    if (!order.promoReserved || !order.promoCodeId) return;
    inc(this.store.promoUsed, order.promoCodeId, -1);
    order.promoReserved = false;
  }

  // ---------- helper ----------

  private price(items: OrderItem[], promo: PromoCode | null, method: PaymentMethod | null): PricingResult {
    const { event } = this.catalog;
    return priceOrder({
      lines: items.map((i) => ({
        id: i.id,
        kind: i.kind,
        ticketTypeId: i.ticketTypeId,
        unitPriceSatang: i.unitPriceSatang,
        quantity: i.quantity,
      })),
      promo,
      feeMode: event.feeMode,
      platformFeeBps: event.platformFeeBps,
      vatRateBps: event.vatRateBps,
      method,
    });
  }

  private authorize(orderId: string, accessToken: string): Order {
    const order = this.store.orders.get(orderId);
    if (!order) throw new TicketingError("not_found", "order not found");
    if (!accessToken || hashToken(accessToken) !== order.accessTokenHash) {
      throw new TicketingError("forbidden", "invalid order token");
    }
    return order;
  }

  private requirePending(order: Order) {
    if (order.status === "expired") throw new TicketingError("order_expired", "order hold has expired");
    if (order.status !== "pending_payment") throw new TicketingError("invalid_state", `order is ${order.status}`);
  }

  private requireEvent(slug: string) {
    if (slug !== this.catalog.event.slug) throw new TicketingError("not_found", "event not found");
  }

  private ticketType(id: string): TicketType {
    const t = this.catalog.ticketTypes.find((x) => x.id === id);
    if (!t) throw new Error(`unknown ticket type ${id}`);
    return t;
  }

  private product(id: string): Product {
    const p = this.catalog.products.find((x) => x.id === id);
    if (!p) throw new Error(`unknown product ${id}`);
    return p;
  }

  private slot(id: string): TimeSlot {
    const s = this.catalog.slots.find((x) => x.id === id);
    if (!s) throw new Error(`unknown slot ${id}`);
    return s;
  }
}

function pricingFields(p: PricingResult) {
  return {
    subtotalSatang: p.subtotalSatang,
    discountSatang: p.discountSatang,
    feeSatang: p.feeSatang,
    totalSatang: p.totalSatang,
    vatSatang: p.vatSatang,
    platformFeeSatang: p.platformFeeSatang,
    gatewayFeeSatang: p.gatewayFeeSatang,
  };
}

function applyLineDiscounts(order: Order, pricing: PricingResult) {
  for (const item of order.items) {
    item.discountSatang = pricing.lines.find((l) => l.id === item.id)?.discountSatang ?? 0;
  }
}

function parseOrThrow<T>(schema: z.ZodType<T, any>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success) throw new TicketingError("invalid_input", "invalid input", { issues: r.error.issues });
  return r.data;
}

// วันที่ YYYY-MM-DD ตาม timezone ของงาน
function localDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}

function inc(map: Map<string, number>, key: string, by: number) {
  map.set(key, (map.get(key) ?? 0) + by);
}

function remainingOf(capacity: number | null, taken: number | undefined): number | null {
  return capacity === null ? null : Math.max(0, capacity - (taken ?? 0));
}

function minRemaining(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

function maxRemaining(xs: (number | null)[]): number | null {
  if (xs.some((x) => x === null)) return null;
  return Math.max(0, ...(xs as number[]));
}
