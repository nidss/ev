// schema ของ input จากผู้ซื้อ — ใช้ร่วมกันทั้ง API และฟอร์ม
import { z } from "zod";

const name = z.string().trim().min(1).max(100);
const optionalText = z.string().trim().max(200).nullish().transform((v) => (v ? v : null));

export const orderLineSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ticket"),
    ticketTypeId: z.string().min(1),
    slotId: z.string().min(1).nullish(),
    quantity: z.number().int().min(1).max(50),
  }),
  z.object({
    kind: z.literal("addon"),
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(50),
  }),
]);

export const createOrderSchema = z.object({
  lines: z.array(orderLineSchema).min(1).max(30),
  unlockCode: z.string().trim().max(40).nullish(),
  // ผู้ซื้อต้องกดยอมรับเงื่อนไขก่อนเลือกบัตร (ขั้นที่ 1 ของ flow) — บันทึกเวลาไว้ใน order
  acceptTerms: z.literal(true),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const holderSchema = z.object({
  orderItemId: z.string().min(1),
  index: z.number().int().min(0),
  firstName: name,
  lastName: name,
  email: z.email().nullish().transform((v) => v ?? null),
  company: optionalText,
  jobTitle: optionalText,
});

export const checkoutSchema = z.object({
  buyer: z.object({
    firstName: name,
    lastName: name,
    email: z.email(),
    // ไม่บังคับ: ผู้เข้างานต่างชาติอาจไม่มีเบอร์ไทย
    phone: z.string().trim().max(30).nullish().transform((v) => (v ? v : null)),
    nationality: z.string().length(2).toUpperCase(),
  }),
  holders: z.array(holderSchema).max(100),
  promoCode: z.string().trim().max(40).nullish(),
  consents: z.object({
    shareWithSponsors: z.boolean(),
    organizerMarketing: z.boolean(),
  }),
  taxInvoice: z
    .object({
      name: name,
      taxId: z.string().trim().regex(/^\d{13}$/),
      branch: z.string().trim().min(1).max(50),
      address: z.string().trim().min(1).max(500),
    })
    .nullish(),
  paymentMethod: z.enum(["card", "promptpay", "mobile_banking"]).nullish(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const quoteSchema = z.object({
  promoCode: z.string().trim().max(40).nullish(),
  paymentMethod: z.enum(["card", "promptpay", "mobile_banking"]).nullish(),
});
export type QuoteInput = z.infer<typeof quoteSchema>;
