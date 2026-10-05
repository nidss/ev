// ชนิดข้อมูลหลักของระบบซื้อบัตร — โครงตรงกับ data model ใน docs/TICKETING.md §8
// เงินทุกจำนวนเก็บเป็นสตางค์ (int), เวลาเก็บเป็น ISO string

export type Locale = "th" | "en";
export type I18n = Record<Locale, string>;

export type TicketKind = "general" | "conference" | "vip" | "press" | "workshop";
export type HolderInfo = "buyer_only" | "name_only" | "full";
export type FeeMode = "absorb" | "pass_on";
export type PaymentMethod = "card" | "promptpay" | "mobile_banking";

export interface EventInfo {
  id: string;
  slug: string;
  shortCode: string; // ใช้ใน QR เช่น BET26
  name: I18n;
  tagline: I18n;
  description: I18n;
  startsAt: string;
  endsAt: string;
  timezone: string;
  venueName: I18n;
  venueAddress: I18n;
  organizerName: string;
  coverGradient: [string, string];
  capacity: number | null;
  holdMinutes: number;
  feeMode: FeeMode;
  platformFeeBps: number; // 300 = 3%
  vatRateBps: number; // 700 = 7%
  refundPolicy: I18n;
  terms: I18n[];
}

export interface TimeSlot {
  id: string;
  eventId: string;
  label: I18n;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
}

export interface TicketType {
  id: string;
  eventId: string;
  code: string;
  kind: TicketKind;
  name: I18n;
  description: I18n;
  perks: I18n[];
  priceSatang: number;
  compareAtSatang: number | null;
  quota: number | null;
  // false = ไม่หักความจุรวมของงาน (เช่น workshop ที่ผู้ถือมีบัตรเข้างานอยู่แล้ว) แต่ยังหักความจุของรอบตัวเอง
  countsTowardEventCapacity: boolean;
  isPublic: boolean;
  holderInfo: HolderInfo;
  minPerOrder: number;
  maxPerOrder: number;
  onePerPerson: boolean;
  salesStartsAt: string | null;
  salesEndsAt: string | null;
  // null = ใช้ได้ทั้งงาน, 1 ค่า = รอบตายตัว (เช่น workshop), หลายค่า = ผู้ซื้อเลือกรอบ
  slotIds: string[] | null;
  // ต้องมีบัตรประเภทใดประเภทหนึ่งในนี้อยู่ใน order เดียวกัน
  requiresTicketTypeIds: string[] | null;
  entryCheck: I18n | null;
  sortOrder: number;
}

export interface Product {
  id: string;
  eventId: string;
  code: string;
  name: I18n;
  description: I18n;
  priceSatang: number;
  stock: number | null;
  maxPerOrder: number;
  requiresTicketTypeIds: string[] | null;
  sortOrder: number;
}

export interface PromoCode {
  id: string;
  eventId: string;
  code: string;
  label: I18n;
  discountType: "percent" | "amount";
  discountValue: number; // percent: 10 = 10%, amount: สตางค์ต่อ order
  ticketTypeIds: string[] | null; // null = ลดได้ทุกประเภทบัตร (ไม่รวม add-on)
  unlocksTicketTypeIds: string[] | null;
  maxUses: number | null;
  validFrom: string | null;
  validTo: string | null;
}

export interface Catalog {
  event: EventInfo;
  slots: TimeSlot[];
  ticketTypes: TicketType[];
  products: Product[];
  promoCodes: PromoCode[];
}

export type OrderLineInput =
  | { kind: "ticket"; ticketTypeId: string; slotId?: string | null; quantity: number }
  | { kind: "addon"; productId: string; quantity: number };

export interface OrderItem {
  id: string;
  kind: "ticket" | "addon";
  ticketTypeId: string | null;
  productId: string | null;
  slotId: string | null;
  quantity: number;
  unitPriceSatang: number;
  discountSatang: number;
  nameSnapshot: I18n;
}

export type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "expired"
  | "cancelled"
  | "refunded";

export interface Buyer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  nationality: string;
}

export interface Holder {
  orderItemId: string;
  index: number; // ใบที่เท่าไรของ item นั้น (เริ่ม 0)
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  jobTitle: string | null;
}

export interface Consents {
  terms: boolean;
  shareWithSponsors: boolean;
  organizerMarketing: boolean;
}

export interface TaxInvoiceInfo {
  name: string;
  taxId: string;
  branch: string;
  address: string;
}

export interface Order {
  id: string;
  eventId: string;
  orderCode: string;
  accessTokenHash: string;
  status: OrderStatus;
  expiresAt: string;
  createdAt: string;
  items: OrderItem[];
  unlockCode: string | null;
  buyer: Buyer | null;
  holders: Holder[];
  consents: Consents | null;
  taxInvoice: TaxInvoiceInfo | null;
  promoCodeId: string | null;
  promoReserved: boolean;
  subtotalSatang: number;
  discountSatang: number;
  feeSatang: number;
  totalSatang: number;
  vatSatang: number;
  platformFeeSatang: number;
  gatewayFeeSatang: number;
  paymentMethod: PaymentMethod | null;
  confirmedAt: string | null;
  holdReleased: boolean;
}

export type PaymentStatus = "pending" | "succeeded" | "failed";

export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  providerChargeId: string;
  method: PaymentMethod;
  amountSatang: number;
  status: PaymentStatus;
  createdAt: string;
  paidAt: string | null;
}

export interface Attendee {
  id: string;
  eventId: string;
  orderId: string;
  orderItemId: string;
  ticketTypeId: string;
  slotId: string | null;
  ticketCode: string;
  qrVersion: number;
  qrToken: string;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  jobTitle: string | null;
  shareWithSponsors: boolean;
  status: "registered" | "cancelled" | "refunded";
  createdAt: string;
}

export interface Refund {
  id: string;
  orderId: string;
  paymentId: string;
  amountSatang: number;
  reason: string;
  providerRefundId: string;
  createdAt: string;
}
