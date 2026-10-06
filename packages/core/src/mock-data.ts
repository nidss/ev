// ข้อมูลตัวอย่าง (mock) ของงาน 1 งาน — มีทั้งบัตรฟรี บัตรเสียเงิน workshop และ add-on
// ยังไม่มีผังที่นั่ง: ความจุนับเป็นจำนวนต่อรอบ / ต่อประเภทบัตรเท่านั้น
import type { Booth, Catalog, Checkpoint, EventInfo, Product, PromoCode, Sponsor, TermsDocument, TicketType, TimeSlot } from "./types";

const EVENT_ID = "evt_bet26";
const baht = (n: number) => n * 100;

// เงื่อนไขการซื้อบัตรและการใช้ข้อมูลส่วนบุคคล (ฉบับร่าง — ต้องให้ฝ่ายกฎหมายตรวจก่อนใช้จริง)
// สอดคล้องกับการทำงานของระบบ: ข้อมูลส่งให้ sponsor เฉพาะคนที่ติ๊กยินยอมตอนลงทะเบียน
const ORGANIZER_TH = "บริษัท อีวี เดโม ออร์แกไนเซอร์ จำกัด";
const ORGANIZER_EN = "EV Demo Organizer Co., Ltd.";
const EVENT_NAME = "Bangkok Event Tech & Finance Expo 2026";
const PRIVACY_EMAIL = "privacy@ev-demo.example";

const termsDocument: TermsDocument = {
  title: { th: "เงื่อนไขการซื้อบัตรและการใช้ข้อมูลส่วนบุคคล", en: "Ticket Terms and Personal Data Notice" },
  updatedAt: "2026-10-06",
  sections: [
    {
      heading: { th: "1. การซื้อและการใช้บัตร", en: "1. Buying and using tickets" },
      paragraphs: [
        {
          th: `งาน ${EVENT_NAME} จัดโดย ${ORGANIZER_TH} ("ผู้จัดงาน") บัตรเข้างาน 1 ใบใช้ได้กับผู้ถือบัตร 1 คนตามชื่อที่ลงทะเบียน และต้องแสดง QR Code บนบัตรหรือรหัสบัตรที่จุดเช็คอิน`,
          en: `${EVENT_NAME} is organised by ${ORGANIZER_EN} (the "Organiser"). Each ticket admits one registered holder, who must show the ticket QR code or ticket code at check-in.`,
        },
        {
          th: "บัตรรายวันใช้ได้เฉพาะวันที่เลือก บัตร Conference และ VIP ใช้ได้ทั้ง 2 วัน บัตร Workshop ต้องใช้คู่กับบัตรเข้างาน และเข้าได้เฉพาะรอบและห้องที่ระบุบนบัตร",
          en: "Day passes are valid only on the selected day. Conference and VIP passes are valid on both days. Workshop tickets must be used with an admission ticket and are valid only for the session and room shown.",
        },
        {
          th: "เมื่อกดยืนยันบัตร ระบบจะกันที่นั่งไว้ 15 นาที หากชำระเงินไม่สำเร็จภายในเวลาดังกล่าว ที่นั่งจะถูกปล่อยคืนโดยอัตโนมัติ ราคาบัตรรวมภาษีมูลค่าเพิ่มแล้ว และจำนวนบัตรสูงสุดต่อคำสั่งซื้อเป็นไปตามที่ระบุในแต่ละประเภทบัตร",
          en: "Confirming your tickets holds them for 15 minutes; unpaid tickets are released automatically. Prices include VAT. The maximum number of tickets per order is shown for each ticket type.",
        },
        {
          th: "ห้ามนำบัตรไปขายต่อในราคาที่สูงกว่าราคาหน้าบัตร ผู้จัดงานขอสงวนสิทธิ์ยกเลิกบัตรที่พบว่ามีการขายต่อหรือได้มาโดยไม่ชอบ โดยไม่คืนเงิน",
          en: "Tickets may not be resold above face value. The Organiser may cancel, without refund, tickets found to be resold or obtained improperly.",
        },
      ],
    },
    {
      heading: { th: "2. การยกเลิก การคืนเงิน และการเปลี่ยนแปลงงาน", en: "2. Cancellation, refunds and changes" },
      paragraphs: [
        {
          th: "ขอคืนเงินได้ถึง 7 วันก่อนวันงาน (ภายใน 14 พ.ย. 2569) ยกเว้นบัตรที่ซื้อด้วยโค้ดส่วนลด บัตรที่คืนเงินแล้วจะใช้เข้างานไม่ได้",
          en: "Refunds are available until 7 days before the event (by 14 Nov 2026), except tickets bought with a promo code. Refunded tickets can no longer be used.",
        },
        {
          th: "หากงานถูกยกเลิกโดยผู้จัดงาน ผู้ซื้อจะได้รับเงินคืนเต็มจำนวน หากมีการเลื่อนวันหรือเปลี่ยนสถานที่ บัตรเดิมยังใช้ได้ และผู้ที่ไม่สะดวกสามารถขอคืนเงินได้ภายในระยะเวลาที่ผู้จัดงานแจ้ง",
          en: "If the Organiser cancels the event, you will receive a full refund. If the date or venue changes, existing tickets remain valid and holders who cannot attend may request a refund within the period the Organiser announces.",
        },
        {
          th: "ผู้จัดงานขอสงวนสิทธิ์ในการเปลี่ยนแปลงกำหนดการ วิทยากร หรือรายละเอียดของกิจกรรมตามความเหมาะสม",
          en: "The Organiser may change the programme, speakers or activity details where necessary.",
        },
      ],
    },
    {
      heading: { th: "3. การเก็บและใช้ข้อมูลส่วนบุคคล", en: "3. How we use your personal data" },
      paragraphs: [
        {
          th: `ด้วยการกรอกและส่งข้อมูลในแบบฟอร์มนี้ ท่านรับทราบว่าผู้จัดงานและผู้ให้บริการระบบจำหน่ายบัตรจะเก็บ ใช้ และประมวลผลข้อมูลของท่าน (เช่น ชื่อ อีเมล เบอร์โทรศัพท์ สัญชาติ บริษัท ตำแหน่ง และประวัติการเช็คอิน) เพื่อออกและส่งบัตร ยืนยันตัวตนและตรวจสอบสิทธิ์ที่จุดเช็คอิน แจ้งข้อมูลที่จำเป็นเกี่ยวกับงานทางอีเมลและ/หรือโทรศัพท์ ออกใบเสร็จหรือใบกำกับภาษี และจัดเตรียมเนื้อหาและกิจกรรมภายในงานให้เหมาะสมกับผู้เข้าร่วม`,
          en: "By submitting this form you acknowledge that the Organiser and its ticketing provider will collect, use and process your data (such as name, email, phone, nationality, company, job title and check-in history) to issue and deliver tickets, verify identity and entitlement at check-in, send essential event information by email and/or phone, issue receipts or tax invoices, and plan content and activities for attendees.",
        },
        {
          th: "ข่าวสารเกี่ยวกับงานครั้งถัดไปจะส่งให้เฉพาะผู้ที่เลือก \"รับข่าวสารงานครั้งถัดไปจากผู้จัด\" เท่านั้น",
          en: "News about future events is sent only to those who opt in to receive it.",
        },
        {
          th: "ผู้จัดงานจะไม่เปิดเผยข้อมูลส่วนบุคคลของท่านแก่บริษัทหรือหน่วยงานภายนอกที่ไม่เกี่ยวข้องกับงานนี้ โดยไม่ได้รับความยินยอมจากท่าน เว้นแต่กฎหมายกำหนด ข้อมูลจะถูกเก็บรักษาด้วยมาตรการความปลอดภัยที่เหมาะสม และจะลบหรือทำให้ไม่สามารถระบุตัวตนได้เมื่อพ้นระยะเวลาที่จำเป็น",
          en: "The Organiser will not disclose your personal data to unrelated third parties without your consent, except where required by law. Data is kept with appropriate security measures and deleted or anonymised once no longer needed.",
        },
      ],
    },
    {
      heading: { th: "4. การแชร์ข้อมูลกับสปอนเซอร์ที่บูธ", en: "4. Sharing data with sponsors at booths" },
      paragraphs: [
        {
          th: "ภายในงาน ระหว่างเยี่ยมชมบูธ ท่านอาจถูกขอให้สแกน QR Code บนบัตร/ป้ายชื่อ หรือแตะสายรัดข้อมือ และท่านสามารถสแกน QR Code ของบูธเพื่อกด \"สนใจ\" หรือ \"ขอข้อมูลเพิ่ม\" ได้ ท่านมีสิทธิ์เลือกว่าจะให้สแกนหรือไม่",
          en: "At booths you may be asked to have your ticket/badge QR code scanned or tap your wristband, and you may scan a booth's QR code to tap \"Interested\" or \"Request info\". Whether to be scanned is your choice.",
        },
        {
          th: "ข้อมูลของท่าน (ชื่อ อีเมล บริษัท ตำแหน่ง และความสนใจที่ท่านแสดงที่บูธ) จะถูกส่งให้เฉพาะสปอนเซอร์ของบูธที่ท่านถูกสแกนหรือสแกนเท่านั้น และเฉพาะกรณีที่ท่านเลือก \"ยินยอมให้ส่งข้อมูลให้ sponsor\" ในขั้นกรอกข้อมูล หากไม่ได้ยินยอม สปอนเซอร์จะเห็นเพียงจำนวนผู้เข้าชมบูธ โดยไม่เห็นข้อมูลที่ระบุตัวท่าน",
          en: "Your details (name, email, company, job title and the interest you showed at the booth) are shared only with the sponsor of a booth where you were scanned or which you scanned, and only if you ticked \"share my details with sponsors\" when registering. Otherwise the sponsor sees only a visitor count, not who you are.",
        },
        {
          th: "เมื่อข้อมูลถูกส่งให้สปอนเซอร์แล้ว ข้อมูลนั้นจะอยู่ภายใต้นโยบายความเป็นส่วนตัวของสปอนเซอร์รายนั้น ผู้จัดงานบันทึกประวัติการส่งต่อข้อมูลทุกครั้ง แต่ไม่รับผิดชอบต่อการที่สปอนเซอร์นำข้อมูลของท่านไปใช้",
          en: "Once shared, your data is governed by that sponsor's privacy policy. The Organiser logs every data export but is not responsible for how sponsors use your data.",
        },
      ],
    },
    {
      heading: { th: "5. สิทธิ์ของท่าน", en: "5. Your rights" },
      paragraphs: [
        {
          th: `ท่านมีสิทธิ์ขอเข้าถึง ขอสำเนา ขอแก้ไข ขอลบ หรือขอระงับการใช้ข้อมูลส่วนบุคคลของท่าน และถอนความยินยอมในการส่งข้อมูลให้สปอนเซอร์หรือรับข่าวสารได้ทุกเมื่อ โดยติดต่อ ${PRIVACY_EMAIL} การถอนความยินยอมไม่กระทบข้อมูลที่ส่งให้สปอนเซอร์ไปแล้วก่อนหน้านั้น`,
          en: `You may request access to, a copy of, correction, deletion or restriction of your personal data, and withdraw consent to sponsor sharing or marketing at any time by contacting ${PRIVACY_EMAIL}. Withdrawal does not affect data already shared with sponsors before then.`,
        },
      ],
    },
    {
      heading: { th: "6. การถ่ายภาพและบันทึกวิดีโอ", en: "6. Photography and video" },
      paragraphs: [
        {
          th: "ภายในงานมีการถ่ายภาพและบันทึกวิดีโอเพื่อใช้ประชาสัมพันธ์งาน การเข้าร่วมงานถือว่าท่านรับทราบว่าภาพของท่านอาจปรากฏในสื่อดังกล่าว หากไม่ประสงค์ให้ใช้ภาพที่เห็นตัวท่านชัดเจน โปรดแจ้งเจ้าหน้าที่หรือติดต่ออีเมลข้างต้น",
          en: "Photos and video are taken at the event for promotion. By attending you acknowledge you may appear in this material. If you prefer clearly identifiable images of you not to be used, tell our staff or contact the email above.",
        },
      ],
    },
  ],
};

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
  coverImageUrl: "/events/bet26-cover.webp",
  capacity: 8000,
  holdMinutes: 15,
  feeMode: "absorb",
  platformFeeBps: 300,
  vatRateBps: 700,
  refundPolicy: {
    th: "ขอคืนเงินได้ถึง 7 วันก่อนวันงาน (ภายใน 14 พ.ย. 2569) ยกเว้นบัตรที่ซื้อด้วยโค้ดส่วนลด",
    en: "Refunds available until 7 days before the event (by 14 Nov 2026), except tickets bought with a promo code.",
  },
  termsDocument,
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
