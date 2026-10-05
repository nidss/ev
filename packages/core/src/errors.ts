export type TicketingErrorCode =
  | "not_found"
  | "forbidden"
  | "invalid_input"
  | "not_on_sale"
  | "sold_out"
  | "limit_exceeded"
  | "requires_admission"
  | "promo_invalid"
  | "duplicate_holder"
  | "order_expired"
  | "invalid_state";

// error ที่ตั้งใจส่งกลับให้ผู้ใช้เห็น (API แปลงเป็น 4xx)
export class TicketingError extends Error {
  constructor(
    readonly code: TicketingErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "TicketingError";
  }
}
