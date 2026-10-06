// ชนิดข้อมูลหลักของระบบซื้อบัตร — โครงตรงกับ data model ใน docs/TICKETING.md §8
// เงินทุกจำนวนเก็บเป็นสตางค์ (int), เวลาเก็บเป็น ISO string

export type Locale = "th" | "en";
export type I18n = Record<Locale, string>;

export type TicketKind = "general" | "trade" | "conference" | "vip" | "press" | "workshop";
export type HolderInfo = "buyer_only" | "name_only" | "full";
export type FeeMode = "absorb" | "pass_on";
export type PaymentMethod = "card" | "promptpay" | "mobile_banking";

export interface EventInfo {
  id: string;
  slug: string;
  shortCode: string; // ใช้ใน QR เช่น MOC26
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
  coverImageUrl: string | null; // path ภายในเว็บ เช่น /events/moc26-cover.webp (null = ใช้ gradient)
  capacity: number | null;
  holdMinutes: number;
  feeMode: FeeMode;
  platformFeeBps: number; // 300 = 3%
  vatRateBps: number; // 700 = 7%
  refundPolicy: I18n;
  terms: I18n[]; // สรุปสั้นที่แสดงบนหน้างาน
  termsDocument: TermsDocument; // เงื่อนไขฉบับเต็ม (เปิดเป็น modal)
}

export interface TermsSection {
  heading: I18n;
  paragraphs: I18n[];
}

export interface TermsDocument {
  title: I18n;
  updatedAt: string; // YYYY-MM-DD
  sections: TermsSection[];
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

export type CheckpointKind = "entrance" | "workshop" | "vip_area" | "restricted_area";

// จุดเช็คอิน เช่น ประตูหลัก, ห้อง workshop, VIP lounge
export interface Checkpoint {
  id: string;
  eventId: string;
  name: I18n;
  kind: CheckpointKind;
  allowedTicketTypeIds: string[] | null; // null = บัตรเข้างานทุกประเภท (ไม่รวม workshop)
}

export type SponsorTier = "platinum" | "gold" | "silver" | "exhibitor";

export interface Sponsor {
  id: string;
  eventId: string;
  name: string;
  tier: SponsorTier;
  description: I18n;
  websiteUrl: string;
  contactEmail: string;
}

export interface Booth {
  id: string;
  eventId: string;
  sponsorId: string;
  code: string; // เช่น B01
  qrSlug: string; // QR บูธ = /b/<qrSlug>
  zone: string;
  categoryId: string | null; // หมวดสินค้า (กำหนดสีบนผังงาน)
}

// หมวดสินค้า — สีใช้ระบายโซนบนผังงาน (ผ่าน validate_palette ทั้งโหมดสว่าง/มืด)
// สีไม่ได้สื่อความหมายเพียงอย่างเดียว: ทุกโซนมีตัวอักษรหมวด + ชื่อกำกับ และรหัสบูธขึ้นต้นด้วยตัวอักษรเดียวกัน
export interface ProductCategory {
  id: string;
  code: string; // ตัวอักษรหมวด เช่น A
  name: I18n;
  shortName: I18n; // ป้ายสั้นบนผัง (ชื่อเต็มอยู่ในคำอธิบายสัญลักษณ์)
  color: string; // บนพื้นสว่าง (รวมถึงงานพิมพ์)
  colorDark: string; // บนพื้นมืด
}

// พิกัดเป็นหน่วยของผัง (ไม่ใช่เมตร) — มุมซ้ายบน = (0, 0)
export interface FloorZone {
  id: string;
  label: I18n;
  categoryId: string | null; // null = พื้นที่ส่วนกลาง เช่น เวที จุดลงทะเบียน
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FloorMarker {
  id: string;
  label: I18n;
  x: number;
  y: number;
}

export interface FloorPlan {
  title: I18n;
  width: number;
  height: number;
  zones: FloorZone[];
  entrances: FloorMarker[];
}

export interface Catalog {
  event: EventInfo;
  slots: TimeSlot[];
  ticketTypes: TicketType[];
  products: Product[];
  promoCodes: PromoCode[];
  checkpoints: Checkpoint[];
  sponsors: Sponsor[];
  booths: Booth[];
  categories: ProductCategory[];
  floorPlan: FloorPlan | null;
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
  termsAcceptedAt: string;
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
  rfidUid: string | null; // สายรัดข้อมือ RFID ที่ผูกตอนเช็คอิน
  firstCheckedInAt: string | null;
}

export type CheckinResult =
  | "accepted"
  | "already_in"
  | "wrong_checkpoint"
  | "wrong_day"
  | "entry_check_failed"
  | "cancelled"
  | "invalid_qr"
  | "unknown";

// ทุกการสแกนที่หน้างาน (รวมที่ไม่ผ่าน) — id สร้างจากเครื่องสแกน ส่งซ้ำกี่ครั้งก็บันทึกครั้งเดียว
export interface Checkin {
  id: string;
  eventId: string;
  attendeeId: string | null;
  checkpointId: string;
  operatingDate: string; // วันที่หน้างาน YYYY-MM-DD
  deviceName: string;
  result: CheckinResult;
  rawCode: string | null;
  scannedAt: string;
  receivedAt: string;
  offline: boolean;
}

export type InterestLevel = "visit" | "interested" | "request_info";
export type LeadRating = "hot" | "warm" | "cold";

export interface BoothScan {
  id: string;
  eventId: string;
  boothId: string;
  attendeeId: string;
  source: "attendee_scanned_booth" | "staff_scanned_badge";
  action: InterestLevel;
  deviceName: string | null;
  scannedAt: string;
}

// 1 แถวต่อ (บูธ, ผู้เข้างาน) — sponsor เห็นตัวบุคคลเฉพาะคนที่ยินยอม
export interface Lead {
  id: string;
  eventId: string;
  sponsorId: string;
  boothId: string;
  attendeeId: string;
  firstScannedAt: string;
  lastScannedAt: string;
  scanCount: number;
  interestLevel: InterestLevel;
  rating: LeadRating | null;
  notes: string;
}

export interface LeadExport {
  id: string;
  sponsorId: string;
  exportedBy: string;
  attendeeIds: string[];
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
