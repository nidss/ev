// ข้อมูลตัวอย่าง (mock) ของงาน 1 งาน — มีทั้งบัตรฟรี บัตรเสียเงิน workshop และ add-on
// ยังไม่มีผังที่นั่ง: ความจุนับเป็นจำนวนต่อรอบ / ต่อประเภทบัตรเท่านั้น
import type { Booth, Catalog, Checkpoint, EventInfo, Product, PromoCode, Sponsor, TicketType, TimeSlot } from "./types";

const EVENT_ID = "evt_bet26";
const baht = (n: number) => n * 100;

const event: EventInfo = {
  id: EVENT_ID,
  slug: "bangkok-event-tech-2026",
  shortCode: "BET26",
  name: {
    th: "Bangkok Event Tech & Finance Expo 2026",
    en: "Bangkok Event Tech & Finance Expo 2026",
  },
  tagline: {
    th: "งานแสดงเทคโนโลยีและการเงินสำหรับผู้จัดงานอีเว้นท์ 2 วันเต็ม",
    en: "Two days of technology and finance for event organizers",
  },
  description: {
    th:
      "รวมผู้จัดงาน ซัพพลายเออร์ และสปอนเซอร์กว่า 8,000 คน พบบูธเทคโนโลยีลงทะเบียน เช็คอิน ระบบเก็บ lead " +
      "และบริการทุนหมุนเวียนสำหรับผู้จัดงาน พร้อมเวทีสัมมนาและ workshop ลงมือทำจริงจำนวนจำกัด",
    en:
      "Meet 8,000+ organizers, suppliers and sponsors. Explore registration, check-in and lead-capture tech " +
      "and working-capital services for organizers, plus conference talks and limited-seat hands-on workshops.",
  },
  startsAt: "2026-11-21T09:00:00+07:00",
  endsAt: "2026-11-22T18:00:00+07:00",
  timezone: "Asia/Bangkok",
  venueName: {
    th: "ศูนย์การประชุมแห่งชาติสิริกิติ์ (QSNCC) ฮอลล์ 5–6",
    en: "Queen Sirikit National Convention Center (QSNCC), Hall 5–6",
  },
  venueAddress: {
    th: "60 ถนนรัชดาภิเษก แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110 (MRT ศูนย์การประชุมแห่งชาติสิริกิติ์)",
    en: "60 Ratchadaphisek Rd, Khlong Toei, Bangkok 10110 (MRT Queen Sirikit National Convention Centre)",
  },
  organizerName: "EV Demo Organizer Co., Ltd.",
  coverGradient: ["#0f766e", "#1e3a8a"],
  capacity: 8000,
  holdMinutes: 15,
  feeMode: "absorb",
  platformFeeBps: 300,
  vatRateBps: 700,
  refundPolicy: {
    th: "ขอคืนเงินได้ถึง 7 วันก่อนวันงาน (ภายใน 14 พ.ย. 2569) ยกเว้นบัตรที่ซื้อด้วยโค้ดส่วนลด",
    en: "Refunds available until 7 days before the event (by 14 Nov 2026), except tickets bought with a promo code.",
  },
  terms: [
    {
      th: "บัตรเข้างาน 1 ใบใช้ได้กับผู้ถือบัตร 1 คน และต้องแสดง QR บนบัตรที่จุดเช็คอิน",
      en: "One ticket admits one holder. Show the QR code at check-in.",
    },
    {
      th: "บัตร workshop ต้องใช้คู่กับบัตรเข้างาน และเข้าได้เฉพาะรอบที่ระบุบนบัตร",
      en: "Workshop tickets must be used with an admission ticket and are valid only for the session shown.",
    },
    {
      th: "บัตร Press ต้องแสดงบัตรสื่อมวลชนหรือหนังสือรับรองจากต้นสังกัดที่จุดเช็คอิน",
      en: "Press passes require a valid press card or letter from your media outlet at check-in.",
    },
  ],
};

const slots: TimeSlot[] = [
  {
    id: "slot_day1",
    eventId: EVENT_ID,
    label: { th: "วันเสาร์ 21 พ.ย. 2569", en: "Sat 21 Nov 2026" },
    startsAt: "2026-11-21T09:00:00+07:00",
    endsAt: "2026-11-21T18:00:00+07:00",
    capacity: 5000,
  },
  {
    id: "slot_day2",
    eventId: EVENT_ID,
    label: { th: "วันอาทิตย์ 22 พ.ย. 2569", en: "Sun 22 Nov 2026" },
    startsAt: "2026-11-22T09:00:00+07:00",
    endsAt: "2026-11-22T18:00:00+07:00",
    capacity: 5000,
  },
  {
    id: "slot_ws_ai",
    eventId: EVENT_ID,
    label: { th: "เสาร์ 21 พ.ย. · 10:00–12:00 · ห้อง W1", en: "Sat 21 Nov · 10:00–12:00 · Room W1" },
    startsAt: "2026-11-21T10:00:00+07:00",
    endsAt: "2026-11-21T12:00:00+07:00",
    capacity: 40,
  },
  {
    id: "slot_ws_line",
    eventId: EVENT_ID,
    label: { th: "เสาร์ 21 พ.ย. · 14:00–16:00 · ห้อง W2", en: "Sat 21 Nov · 14:00–16:00 · Room W2" },
    startsAt: "2026-11-21T14:00:00+07:00",
    endsAt: "2026-11-21T16:00:00+07:00",
    capacity: 30,
  },
  {
    id: "slot_ws_fin",
    eventId: EVENT_ID,
    label: { th: "อาทิตย์ 22 พ.ย. · 10:00–12:30 · ห้อง W1", en: "Sun 22 Nov · 10:00–12:30 · Room W1" },
    startsAt: "2026-11-22T10:00:00+07:00",
    endsAt: "2026-11-22T12:30:00+07:00",
    capacity: 40,
  },
  {
    id: "slot_ws_content",
    eventId: EVENT_ID,
    label: { th: "อาทิตย์ 22 พ.ย. · 13:30–16:30 · ห้อง W2", en: "Sun 22 Nov · 13:30–16:30 · Room W2" },
    startsAt: "2026-11-22T13:30:00+07:00",
    endsAt: "2026-11-22T16:30:00+07:00",
    // เหลือที่นั่งน้อยตั้งแต่เริ่ม เพื่อให้เห็นสถานะ "ใกล้เต็ม" ในหน้า demo
    capacity: 8,
  },
];

const ADMISSION_IDS = ["tt_expo", "tt_conf", "tt_vip", "tt_press"];

const ticketTypes: TicketType[] = [
  {
    id: "tt_expo",
    eventId: EVENT_ID,
    code: "EXPO",
    kind: "general",
    name: { th: "Expo Pass (เข้าชมงานแสดงสินค้า)", en: "Expo Pass" },
    description: {
      th: "เข้าชมโซนบูธและเวทีเปิดได้ 1 วันตามที่เลือก",
      en: "Access to the exhibition hall and open stage for the selected day.",
    },
    perks: [
      { th: "เข้าโซนบูธทั้งหมด", en: "All exhibition booths" },
      { th: "เวทีเปิด (Open Stage)", en: "Open stage talks" },
    ],
    priceSatang: 0,
    compareAtSatang: null,
    quota: null,
    countsTowardEventCapacity: true,
    isPublic: true,
    holderInfo: "full",
    minPerOrder: 1,
    maxPerOrder: 5,
    onePerPerson: true,
    salesStartsAt: null,
    salesEndsAt: "2026-11-22T15:00:00+07:00",
    slotIds: ["slot_day1", "slot_day2"],
    requiresTicketTypeIds: null,
    entryCheck: null,
    sortOrder: 10,
  },
  {
    id: "tt_conf",
    eventId: EVENT_ID,
    code: "CONF",
    kind: "conference",
    name: { th: "Conference Pass 2 วัน", en: "2-Day Conference Pass" },
    description: {
      th: "เข้าห้องสัมมนาหลักทั้ง 2 วัน พร้อมสิทธิ์ทุกอย่างของ Expo Pass — ราคา Early Bird ถึง 31 ต.ค.",
      en: "Main conference hall for both days plus everything in the Expo Pass. Early-bird price until 31 Oct.",
    },
    perks: [
      { th: "ห้องสัมมนาหลัก 2 วัน", en: "Main conference, both days" },
      { th: "เอกสารประกอบการบรรยาย", en: "Session slides & materials" },
      { th: "Coffee break", en: "Coffee breaks" },
    ],
    priceSatang: baht(2500),
    compareAtSatang: baht(3200),
    quota: 1500,
    countsTowardEventCapacity: true,
    isPublic: true,
    holderInfo: "full",
    minPerOrder: 1,
    maxPerOrder: 10,
    onePerPerson: false,
    salesStartsAt: null,
    salesEndsAt: "2026-11-20T23:59:00+07:00",
    slotIds: null,
    requiresTicketTypeIds: null,
    entryCheck: null,
    sortOrder: 20,
  },
  {
    id: "tt_vip",
    eventId: EVENT_ID,
    code: "VIP",
    kind: "vip",
    name: { th: "VIP Pass 2 วัน", en: "2-Day VIP Pass" },
    description: {
      th: "ทุกอย่างของ Conference Pass + ที่นั่งแถวหน้า, VIP lounge, อาหารกลางวัน และงาน networking ช่วงเย็น",
      en: "Everything in the Conference Pass plus front-row seating, VIP lounge, lunch and the evening networking party.",
    },
    perks: [
      { th: "ที่นั่งแถวหน้า", en: "Front-row seating" },
      { th: "VIP lounge + อาหารกลางวัน 2 วัน", en: "VIP lounge + lunch both days" },
      { th: "Networking party คืนวันเสาร์", en: "Saturday networking party" },
    ],
    priceSatang: baht(6900),
    compareAtSatang: null,
    quota: 200,
    countsTowardEventCapacity: true,
    isPublic: true,
    holderInfo: "full",
    minPerOrder: 1,
    maxPerOrder: 4,
    onePerPerson: false,
    salesStartsAt: null,
    salesEndsAt: "2026-11-20T23:59:00+07:00",
    slotIds: null,
    requiresTicketTypeIds: null,
    entryCheck: null,
    sortOrder: 30,
  },
  {
    id: "tt_press",
    eventId: EVENT_ID,
    code: "PRESS",
    kind: "press",
    name: { th: "Press Pass (สื่อมวลชน)", en: "Press Pass" },
    description: {
      th: "สำหรับสื่อมวลชน เข้าได้ทุกโซน 2 วัน — ต้องใช้โค้ดจากผู้จัด",
      en: "For media, all areas for both days. Requires an invitation code.",
    },
    perks: [
      { th: "ทุกโซน 2 วัน", en: "All areas, both days" },
      { th: "ห้องสื่อมวลชน", en: "Press room" },
    ],
    priceSatang: 0,
    compareAtSatang: null,
    quota: 100,
    countsTowardEventCapacity: true,
    isPublic: false,
    holderInfo: "full",
    minPerOrder: 1,
    maxPerOrder: 2,
    onePerPerson: true,
    salesStartsAt: null,
    salesEndsAt: null,
    slotIds: null,
    requiresTicketTypeIds: null,
    entryCheck: {
      th: "ตรวจบัตรสื่อมวลชน / หนังสือรับรองจากต้นสังกัด",
      en: "Check press card or media letter",
    },
    sortOrder: 40,
  },
  workshop({
    id: "tt_ws_ai",
    code: "WS-AI",
    slotId: "slot_ws_ai",
    priceBaht: 1200,
    name: { th: "Workshop: ใช้ AI จัดกลุ่ม lead ให้ sponsor", en: "Workshop: AI lead scoring for sponsors" },
    description: {
      th: "ลงมือทำ: จัดกลุ่ม lead จากข้อมูลการสแกนบูธ และสรุปรายงานส่ง sponsor (นำโน้ตบุ๊กมาเอง)",
      en: "Hands-on: segment booth-scan leads and build a sponsor report (bring your laptop).",
    },
    sortOrder: 100,
  }),
  workshop({
    id: "tt_ws_line",
    code: "WS-LINE",
    slotId: "slot_ws_line",
    priceBaht: 890,
    name: { th: "Workshop: ทำ LINE OA สำหรับงานอีเว้นท์", en: "Workshop: LINE OA for events" },
    description: {
      th: "ตั้งค่า LINE OA ส่งบัตร แจ้งเตือน และทำแบบสอบถามหลังงานแบบอัตโนมัติ",
      en: "Set up a LINE OA to deliver tickets, reminders and post-event surveys automatically.",
    },
    sortOrder: 110,
  }),
  workshop({
    id: "tt_ws_fin",
    code: "WS-FIN",
    slotId: "slot_ws_fin",
    priceBaht: 1500,
    name: {
      th: "Workshop: วางแผนกระแสเงินสดและทุนหมุนเวียนสำหรับผู้จัดงาน",
      en: "Workshop: Cash-flow & working capital for organizers",
    },
    description: {
      th: "ทำงบประมาณงานจริง วางรอบรับ-จ่าย และเตรียมเอกสารขอทุนหมุนเวียน",
      en: "Build a real event budget, plan cash in/out and prepare a working-capital application.",
    },
    sortOrder: 120,
  }),
  workshop({
    id: "tt_ws_content",
    code: "WS-CONTENT",
    slotId: "slot_ws_content",
    priceBaht: 990,
    name: { th: "Workshop: Content & Live สำหรับงานอีเว้นท์", en: "Workshop: Content & live streaming for events" },
    description: {
      th: "ถ่าย ตัด และไลฟ์จากหน้างานด้วยมือถือ ให้ sponsor ได้ยอดเห็นมากขึ้น",
      en: "Shoot, edit and stream from the venue with a phone to boost sponsor reach.",
    },
    sortOrder: 130,
  }),
];

function workshop(input: {
  id: string;
  code: string;
  slotId: string;
  priceBaht: number;
  name: TicketType["name"];
  description: TicketType["description"];
  sortOrder: number;
}): TicketType {
  return {
    id: input.id,
    eventId: EVENT_ID,
    code: input.code,
    kind: "workshop",
    name: input.name,
    description: input.description,
    perks: [],
    priceSatang: baht(input.priceBaht),
    compareAtSatang: null,
    quota: null,
    countsTowardEventCapacity: false,
    isPublic: true,
    holderInfo: "name_only",
    minPerOrder: 1,
    maxPerOrder: 4,
    onePerPerson: false,
    salesStartsAt: null,
    salesEndsAt: "2026-11-20T23:59:00+07:00",
    slotIds: [input.slotId],
    requiresTicketTypeIds: ADMISSION_IDS,
    entryCheck: null,
    sortOrder: input.sortOrder,
  };
}

const products: Product[] = [
  {
    id: "pr_lunch",
    eventId: EVENT_ID,
    code: "LUNCH",
    name: { th: "ชุดอาหารกลางวัน (ต่อวัน)", en: "Lunch box (per day)" },
    description: { th: "รับที่จุดแลกอาหาร โซน F ด้วย QR ของคำสั่งซื้อ", en: "Pick up at Zone F with your order QR." },
    priceSatang: baht(250),
    stock: 2000,
    maxPerOrder: 20,
    requiresTicketTypeIds: ADMISSION_IDS,
    sortOrder: 10,
  },
  {
    id: "pr_tshirt",
    eventId: EVENT_ID,
    code: "TSHIRT",
    name: { th: "เสื้อยืดที่ระลึก", en: "Event T-shirt" },
    description: { th: "เลือกไซซ์ที่จุดรับของหน้างาน", en: "Choose your size at the pickup counter." },
    priceSatang: baht(390),
    stock: 300,
    maxPerOrder: 10,
    requiresTicketTypeIds: null,
    sortOrder: 20,
  },
  {
    id: "pr_parking",
    eventId: EVENT_ID,
    code: "PARKING",
    name: { th: "บัตรจอดรถ 2 วัน", en: "Parking pass (2 days)" },
    description: { th: "ลานจอด P1 จำนวนจำกัด", en: "Car park P1, limited spaces." },
    priceSatang: baht(300),
    stock: 200,
    maxPerOrder: 2,
    requiresTicketTypeIds: ADMISSION_IDS,
    sortOrder: 30,
  },
];

const promoCodes: PromoCode[] = [
  {
    id: "pc_team10",
    eventId: EVENT_ID,
    code: "TEAM10",
    label: { th: "ลด 10% บัตร Conference / VIP", en: "10% off Conference / VIP passes" },
    discountType: "percent",
    discountValue: 10,
    ticketTypeIds: ["tt_conf", "tt_vip"],
    unlocksTicketTypeIds: null,
    maxUses: 200,
    validFrom: null,
    validTo: "2026-11-20T23:59:00+07:00",
  },
  {
    id: "pc_ws300",
    eventId: EVENT_ID,
    code: "WORKSHOP300",
    label: { th: "ลด 300 บาท เมื่อซื้อ workshop", en: "฿300 off workshops" },
    discountType: "amount",
    discountValue: baht(300),
    ticketTypeIds: ["tt_ws_ai", "tt_ws_line", "tt_ws_fin", "tt_ws_content"],
    unlocksTicketTypeIds: null,
    maxUses: 100,
    validFrom: null,
    validTo: "2026-11-20T23:59:00+07:00",
  },
  {
    id: "pc_press",
    eventId: EVENT_ID,
    code: "PRESS2026",
    label: { th: "โค้ดสื่อมวลชน (ปลดล็อก Press Pass)", en: "Media code (unlocks Press Pass)" },
    discountType: "amount",
    discountValue: 0,
    ticketTypeIds: null,
    unlocksTicketTypeIds: ["tt_press"],
    maxUses: null,
    validFrom: null,
    validTo: null,
  },
];

const checkpoints: Checkpoint[] = [
  {
    id: "cp_gate_a",
    eventId: EVENT_ID,
    name: { th: "ประตู A (ทางเข้าหลัก)", en: "Gate A (main entrance)" },
    kind: "entrance",
    allowedTicketTypeIds: null,
  },
  {
    id: "cp_gate_b",
    eventId: EVENT_ID,
    name: { th: "ประตู B", en: "Gate B" },
    kind: "entrance",
    allowedTicketTypeIds: null,
  },
  {
    id: "cp_vip",
    eventId: EVENT_ID,
    name: { th: "VIP Lounge", en: "VIP Lounge" },
    kind: "vip_area",
    allowedTicketTypeIds: ["tt_vip", "tt_press"],
  },
  {
    id: "cp_room_w1",
    eventId: EVENT_ID,
    name: { th: "ห้อง Workshop W1", en: "Workshop room W1" },
    kind: "workshop",
    allowedTicketTypeIds: ["tt_ws_ai", "tt_ws_fin"],
  },
  {
    id: "cp_room_w2",
    eventId: EVENT_ID,
    name: { th: "ห้อง Workshop W2", en: "Workshop room W2" },
    kind: "workshop",
    allowedTicketTypeIds: ["tt_ws_line", "tt_ws_content"],
  },
];

// สปอนเซอร์และบูธ — ชื่อบริษัททั้งหมดเป็นชื่อสมมติ
const sponsorDefs: [string, Sponsor["tier"], string, string][] = [
  ["Bluewave Pay", "platinum", "ระบบรับชำระเงินและ PromptPay สำหรับงานอีเว้นท์", "Payments and PromptPay for events"],
  ["Nimbus Cloud", "gold", "คลาวด์และ AI สำหรับวิเคราะห์ข้อมูลผู้เข้างาน", "Cloud and AI for attendee analytics"],
  ["Northstar Logistics", "gold", "ขนส่งบูธและอุปกรณ์งานแสดงสินค้า", "Booth and exhibition logistics"],
  ["Lotus Insure", "silver", "ประกันภัยงานอีเว้นท์และผู้เข้างาน", "Event and attendee insurance"],
  ["Orbit Stage", "silver", "แสง เสียง และเวทีครบวงจร", "Lighting, sound and staging"],
  ["Pixel Factory", "exhibitor", "เอเจนซี่การตลาดดิจิทัลและไลฟ์สตรีม", "Digital marketing and live streaming agency"],
];

const sponsors: Sponsor[] = sponsorDefs.map(([name, tier, th, en], i) => ({
  id: `sp_${i + 1}`,
  eventId: EVENT_ID,
  name,
  tier,
  description: { th, en },
  websiteUrl: `https://example.com/${name.split(" ")[0]!.toLowerCase()}`,
  contactEmail: `leads@${name.split(" ")[0]!.toLowerCase()}.example.com`,
}));

const booths: Booth[] = sponsors.map((sp, i) => ({
  id: `bo_${i + 1}`,
  eventId: EVENT_ID,
  sponsorId: sp.id,
  code: `B${String(i + 1).padStart(2, "0")}`,
  // slug ยาวสุ่ม เพื่อไม่ให้เดา URL บูธอื่นได้ (ค่าตายตัวใน mock)
  qrSlug: ["k7q2mx9a", "p3w8zr1d", "h5n4tb6c", "v9e2yk3s", "m1x7qd8f", "r6c3ju2w"][i]!,
  zone: i < 2 ? "A" : i < 4 ? "B" : "C",
}));

export function createMockCatalog(): Catalog {
  // คืนสำเนาใหม่ทุกครั้ง เพื่อไม่ให้ test แต่ละตัวแก้ข้อมูลกันเอง
  return structuredClone({ event, slots, ticketTypes, products, promoCodes, checkpoints, sponsors, booths });
}
