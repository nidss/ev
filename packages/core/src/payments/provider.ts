// interface กลางของ payment gateway — เปลี่ยนจาก mock เป็นเจ้าจริง (Omise / 2C2P / GB Prime Pay) ได้โดยไม่แก้ business logic
import type { PaymentMethod } from "../types";

export interface CreateChargeInput {
  orderId: string;
  amountSatang: number;
  method: PaymentMethod;
  description: string;
  returnUrl: string; // หน้าที่ gateway พาผู้ซื้อกลับมาหลังจ่าย (ห้ามใช้ตัดสินผลการจ่าย)
}

export interface CreateChargeResult {
  providerChargeId: string;
  redirectUrl: string;
}

// ผลการจ่ายที่ได้จาก webhook (เชื่อถือได้หลังตรวจลายเซ็นแล้วเท่านั้น)
export interface PaymentEvent {
  eventId: string; // id ของ webhook — ใช้กันประมวลผลซ้ำ
  providerChargeId: string;
  status: "succeeded" | "failed";
  amountSatang: number;
  occurredAt: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>;
  verifyWebhook(headers: Record<string, string | null | undefined>, rawBody: string): Promise<PaymentEvent>;
  refund(input: { providerChargeId: string; amountSatang: number; reason: string }): Promise<{ providerRefundId: string }>;
}

export class InvalidWebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidWebhookError";
  }
}
