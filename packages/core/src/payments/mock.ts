// payment gateway จำลอง: ไม่มีเงินจริง ผู้ซื้อกดปุ่ม "จ่ายสำเร็จ / ไม่สำเร็จ" ในหน้า mock
// แต่ยังส่งผลกลับผ่าน webhook ที่เซ็น HMAC เหมือน gateway จริง เพื่อให้ทดสอบ flow ฝั่งเราได้ครบ
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { PaymentMethod } from "../types";
import {
  InvalidWebhookError,
  type CreateChargeInput,
  type CreateChargeResult,
  type PaymentEvent,
  type PaymentProvider,
} from "./provider";

export const MOCK_SIGNATURE_HEADER = "x-mock-signature";

export interface MockCharge {
  id: string;
  orderId: string;
  amountSatang: number;
  method: PaymentMethod;
  description: string;
  returnUrl: string;
  status: "pending" | "succeeded" | "failed";
  refundedSatang: number;
  createdAt: string;
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  private charges = new Map<string, MockCharge>();

  constructor(
    private readonly options: { secret: string; payPageBaseUrl: string; now?: () => Date },
  ) {}

  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    const id = `mockch_${randomUUID().replaceAll("-", "")}`;
    this.charges.set(id, {
      id,
      orderId: input.orderId,
      amountSatang: input.amountSatang,
      method: input.method,
      description: input.description,
      returnUrl: input.returnUrl,
      status: "pending",
      refundedSatang: 0,
      createdAt: this.now().toISOString(),
    });
    return { providerChargeId: id, redirectUrl: `${this.options.payPageBaseUrl}/${id}` };
  }

  getCharge(id: string): MockCharge | undefined {
    return this.charges.get(id);
  }

  // จำลองว่าผู้ซื้อจ่ายเสร็จ/ไม่สำเร็จ → คืน webhook request ที่เซ็นแล้ว ให้ส่งต่อเข้า handler
  simulate(chargeId: string, outcome: "succeeded" | "failed"): { headers: Record<string, string>; body: string } {
    const charge = this.charges.get(chargeId);
    if (!charge) throw new Error(`unknown mock charge ${chargeId}`);
    if (charge.status !== "pending") throw new Error(`mock charge ${chargeId} is already ${charge.status}`);
    charge.status = outcome;
    const event: PaymentEvent = {
      eventId: `mockevt_${randomUUID().replaceAll("-", "")}`,
      providerChargeId: chargeId,
      status: outcome,
      amountSatang: charge.amountSatang,
      occurredAt: this.now().toISOString(),
    };
    const body = JSON.stringify(event);
    return { headers: { [MOCK_SIGNATURE_HEADER]: this.sign(body) }, body };
  }

  async verifyWebhook(headers: Record<string, string | null | undefined>, rawBody: string): Promise<PaymentEvent> {
    const given = headers[MOCK_SIGNATURE_HEADER];
    if (!given) throw new InvalidWebhookError("missing signature");
    const expected = Buffer.from(this.sign(rawBody));
    const actual = Buffer.from(given);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new InvalidWebhookError("bad signature");
    }
    return JSON.parse(rawBody) as PaymentEvent;
  }

  async refund(input: { providerChargeId: string; amountSatang: number; reason: string }) {
    const charge = this.charges.get(input.providerChargeId);
    if (!charge || charge.status !== "succeeded") throw new Error("cannot refund this charge");
    if (charge.refundedSatang + input.amountSatang > charge.amountSatang) throw new Error("refund exceeds charge");
    charge.refundedSatang += input.amountSatang;
    return { providerRefundId: `mockrf_${randomUUID().replaceAll("-", "")}` };
  }

  private sign(body: string): string {
    return createHmac("sha256", this.options.secret).update(body).digest("hex");
  }

  private now(): Date {
    return this.options.now ? this.options.now() : new Date();
  }
}
