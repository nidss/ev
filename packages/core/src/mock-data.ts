// ข้อมูลงาน demo: MOC Expo 2026 — งานแสดงและจำหน่ายสินค้า พร้อมกิจกรรมส่งเสริมผู้ประกอบการ ของกระทรวงพาณิชย์
// ลงทะเบียนฟรีทั้งหมด (ไม่มีบัตรเสียเงิน / workshop / add-on)
// หมายเหตุ: วันที่ สถานที่ หมวดสินค้า และรายชื่อผู้ออกบูธเป็นข้อมูลตัวอย่าง — แก้ให้ตรงกับรายละเอียดงานจริงก่อนใช้งาน
import type {
  Booth,
  Catalog,
  Checkpoint,
  EventInfo,
  FloorPlan,
  ProductCategory,
  PromoCode,
  Sponsor,
  TermsDocument,
  TicketType,
} from "./types";

const EVENT_ID = "evt_moc26";
const EVENT_NAME = "MOC Expo 2026";
const ORGANIZER_TH = "กระทรวงพาณิชย์";
const ORGANIZER_EN = "the Ministry of Commerce";
const PRIVACY_EMAIL = "privacy@moc-expo.example";

// เงื่อนไขการลงทะเบียนและการใช้ข้อมูลส่วนบุคคล (ฉบับร่าง — ต้องให้ฝ่ายกฎหมายตรวจก่อนใช้จริง)
// สอดคล้องกับการทำงานของระบบ: ข้อมูลส่งให้ผู้ประกอบการเฉพาะบูธที่ผู้เข้าชมสแกนหรือให้สแกนเท่านั้น
const termsDocument: TermsDocument = {
  title: { th: "เงื่อนไขการลงทะเบียนและการใช้ข้อมูลส่วนบุคคล", en: "Registration Terms and Personal Data Notice" },
  updatedAt: "2026-10-06",
  sections: [
    {
      heading: { th: "1. การลงทะเบียนและป้ายชื่อ", en: "1. Registration and name badges" },
      paragraphs: [
        {
          th: `งาน ${EVENT_NAME} จัดโดย${ORGANIZER_TH} ("ผู้จัดงาน") เข้าชมฟรีโดยไม่มีค่าใช้จ่าย ผู้เข้าชมแต่ละคนลงทะเบียนได้ 1 ครั้ง และจะได้รับป้ายชื่อพร้อม QR Code 1 ใบ ใช้ได้ทุกวันตลอดการจัดงาน`,
          en: `${EVENT_NAME} is organised by ${ORGANIZER_EN} (the "Organiser") and is free to attend. Each visitor registers once and receives one name badge with a QR code, valid on every day of the event.`,
        },
        {
          th: "ป้ายชื่อเป็นของผู้ลงทะเบียนเท่านั้น ห้ามโอนหรือให้ผู้อื่นใช้แทน โปรดแสดง QR Code บนป้ายชื่อหรือในโทรศัพท์ที่จุดเช็คอินทุกครั้งที่เข้างาน และติดป้ายชื่อไว้ตลอดเวลาที่อยู่ในงาน",
          en: "Badges are personal and may not be transferred. Show the badge QR code (printed or on your phone) at check-in every time you enter, and wear the badge while in the venue.",
        },
        {
          th: "ผู้ลงทะเบียนประเภทผู้ประกอบการ / ผู้ซื้อ (Trade) เข้าโซน Business Matching ได้ และอาจถูกขอให้แสดงนามบัตรหรือหลักฐานการประกอบธุรกิจ สื่อมวลชนต้องใช้โค้ดจากผู้จัดงานและแสดงบัตรสื่อมวลชนที่จุดเช็คอิน",
          en: "Trade visitors may enter the Business Matching zone and may be asked for a business card or proof of business. Media must register with the Organiser's code and show a press card at check-in.",
        },
      ],
    },
    {
      heading: { th: "2. การซื้อสินค้าภายในงาน", en: "2. Buying products at the event" },
      paragraphs: [
        {
          th: "การซื้อขายสินค้าและบริการภายในงานเป็นการตกลงระหว่างผู้ซื้อกับผู้ประกอบการที่ออกบูธโดยตรง ราคา การรับประกัน การเปลี่ยนหรือคืนสินค้า และการออกใบเสร็จ เป็นไปตามเงื่อนไขของผู้ประกอบการแต่ละราย",
          en: "Purchases at the event are agreements directly between you and the exhibitor. Prices, warranties, exchanges, returns and receipts follow each exhibitor's own terms.",
        },
        {
          th: "หากพบปัญหาเกี่ยวกับสินค้าหรือบริการ แจ้งได้ที่จุดประชาสัมพันธ์ของงาน ผู้จัดงานจะช่วยประสานงานกับผู้ประกอบการที่เกี่ยวข้อง",
          en: "If you have a problem with a product or service, tell the information desk and the Organiser will help liaise with the exhibitor.",
        },
      ],
    },
    {
      heading: { th: "3. การเปลี่ยนแปลงงานและความปลอดภัย", en: "3. Changes and safety" },
      paragraphs: [
        {
          th: "ผู้จัดงานขอสงวนสิทธิ์ในการเปลี่ยนแปลงวันเวลา กำหนดการ กิจกรรม วิทยากร หรือผังบูธตามความเหมาะสม และอาจจำกัดจำนวนผู้เข้าพื้นที่ในบางช่วงเวลาเพื่อความปลอดภัย",
          en: "The Organiser may change dates, times, the programme, speakers or the booth layout where necessary, and may limit entry at busy times for safety.",
        },
      ],
    },
    {
      heading: { th: "4. การเก็บและใช้ข้อมูลส่วนบุคคล", en: "4. How we use your personal data" },
      paragraphs: [
        {
          th: "ด้วยการกรอกและส่งข้อมูลในแบบฟอร์มนี้ ท่านรับทราบว่าผู้จัดงานและผู้ให้บริการระบบลงทะเบียนจะเก็บ ใช้ และประมวลผลข้อมูลของท่าน (เช่น ชื่อ อีเมล เบอร์โทรศัพท์ สัญชาติ บริษัท ตำแหน่ง และประวัติการเช็คอิน) เพื่อออกป้ายชื่อ ยืนยันตัวตนและตรวจสอบสิทธิ์ที่จุดเช็คอิน แจ้งข้อมูลที่จำเป็นเกี่ยวกับงานทางอีเมลและ/หรือโทรศัพท์ และจัดทำสถิติผู้เข้าชมเพื่อพัฒนากิจกรรมส่งเสริมผู้ประกอบการ",
          en: "By submitting this form you acknowledge that the Organiser and its registration provider will collect, use and process your data (such as name, email, phone, nationality, company, job title and check-in history) to issue badges, verify identity and entitlement at check-in, send essential event information by email and/or phone, and produce visitor statistics to improve programmes that support entrepreneurs.",
        },
        {
          th: "ข่าวสารเกี่ยวกับงานและกิจกรรมครั้งถัดไปจะส่งให้เฉพาะผู้ที่เลือก \"รับข่าวสารงานครั้งถัดไปจากผู้จัด\" เท่านั้น",
          en: "News about future events and programmes is sent only to those who opt in to receive it.",
        },
        {
          th: "ผู้จัดงานจะไม่เปิดเผยข้อมูลส่วนบุคคลของท่านแก่บุคคลหรือหน่วยงานภายนอกที่ไม่เกี่ยวข้องกับงานนี้ โดยไม่ได้รับความยินยอมจากท่าน เว้นแต่กฎหมายกำหนด ข้อมูลจะถูกเก็บรักษาด้วยมาตรการความปลอดภัยที่เหมาะสม และจะลบหรือทำให้ไม่สามารถระบุตัวตนได้เมื่อพ้นระยะเวลาที่จำเป็น",
          en: "The Organiser will not disclose your personal data to unrelated third parties without your consent, except where required by law. Data is kept with appropriate security measures and deleted or anonymised once no longer needed.",
        },
      ],
    },
    {
      heading: { th: "5. การแชร์ข้อมูลกับผู้ประกอบการที่ออกบูธ", en: "5. Sharing data with exhibitors" },
      paragraphs: [
        {
          th: "ภายในงาน ท่านอาจถูกขอให้สแกน QR Code บนป้ายชื่อหรือแตะสายรัดข้อมือที่บูธ และท่านสามารถสแกน QR Code ของบูธเพื่อกด \"สนใจ\" หรือ \"ขอข้อมูลเพิ่ม\" ได้ ท่านเลือกได้เสมอว่าจะให้บูธสแกนหรือไม่",
          en: "At booths you may be asked to have your badge QR code scanned or tap your wristband, and you may scan a booth's QR code to tap \"Interested\" or \"Request info\". Whether to be scanned is always your choice.",
        },
        {
          th: "การยอมรับเงื่อนไขนี้ถือว่าท่านยินยอมให้ส่งข้อมูลของท่าน (ชื่อ อีเมล บริษัท ตำแหน่ง และความสนใจที่ท่านแสดงที่บูธ) ให้แก่ผู้ประกอบการของบูธที่ท่านให้สแกนหรือที่ท่านสแกนเท่านั้น เพื่อให้ติดต่อกลับเกี่ยวกับสินค้าหรือบริการที่ท่านสนใจ บูธที่ท่านไม่ได้สแกนจะไม่ได้รับข้อมูลของท่าน",
          en: "By accepting these terms you consent to your details (name, email, company, job title and the interest you showed at the booth) being shared only with the exhibitor of a booth where you were scanned or which you scanned, so they can follow up about products or services you showed interest in. Booths you did not scan do not receive your data.",
        },
        {
          th: "เมื่อข้อมูลถูกส่งให้ผู้ประกอบการแล้ว ข้อมูลนั้นจะอยู่ภายใต้นโยบายความเป็นส่วนตัวของผู้ประกอบการรายนั้น ผู้จัดงานบันทึกประวัติการส่งต่อข้อมูลทุกครั้ง แต่ไม่รับผิดชอบต่อการที่ผู้ประกอบการนำข้อมูลของท่านไปใช้",
          en: "Once shared, your data is governed by that exhibitor's privacy policy. The Organiser logs every data export but is not responsible for how exhibitors use your data.",
        },
      ],
    },
    {
      heading: { th: "6. สิทธิ์ของท่าน", en: "6. Your rights" },
      paragraphs: [
        {
          th: `ท่านมีสิทธิ์ขอเข้าถึง ขอสำเนา ขอแก้ไข ขอลบ หรือขอระงับการใช้ข้อมูลส่วนบุคคลของท่าน และถอนความยินยอมในการส่งข้อมูลให้ผู้ประกอบการหรือรับข่าวสารได้ทุกเมื่อ โดยติดต่อ ${PRIVACY_EMAIL} การถอนความยินยอมไม่กระทบข้อมูลที่ส่งให้ผู้ประกอบการไปแล้วก่อนหน้านั้น`,
          en: `You may request access to, a copy of, correction, deletion or restriction of your personal data, and withdraw consent to exhibitor sharing or news at any time by contacting ${PRIVACY_EMAIL}. Withdrawal does not affect data already shared with exhibitors before then.`,
        },
      ],
    },
    {
      heading: { th: "7. การถ่ายภาพและบันทึกวิดีโอ", en: "7. Photography and video" },
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
  slug: "moc-expo-2026",
  shortCode: "MOC26",
  name: { th: EVENT_NAME, en: EVENT_NAME },
  tagline: {
    th: "งานแสดงและจำหน่ายสินค้า พร้อมกิจกรรมส่งเสริมผู้ประกอบการ โดยกระทรวงพาณิชย์",
    en: "Trade show and shopping fair with programmes for entrepreneurs, by the Ministry of Commerce",
  },
  description: {
    th:
      "รวมสินค้าคุณภาพจากผู้ประกอบการไทยทั่วประเทศ ทั้งอาหาร แฟชั่น ของแต่งบ้าน สุขภาพและความงาม " +
      "หัตถกรรมและสินค้า GI ไปจนถึงนวัตกรรมและแฟรนไชส์ ช้อปได้ในราคาพิเศษ พร้อมเวทีสัมมนาให้ความรู้ " +
      "และโซน Business Matching จับคู่ธุรกิจระหว่างผู้ประกอบการกับผู้ซื้อ เข้าชมฟรี",
    en:
      "Quality products from Thai entrepreneurs nationwide — food, fashion, home living, health & beauty, " +
      "crafts and GI products, innovation and franchises — at special prices, plus seminars and a Business " +
      "Matching zone connecting entrepreneurs with buyers. Free entry.",
  },
  startsAt: "2026-11-26T10:00:00+07:00",
  endsAt: "2026-11-29T20:00:00+07:00",
  timezone: "Asia/Bangkok",
  venueName: {
    th: "ศูนย์การประชุมแห่งชาติสิริกิติ์ (QSNCC) ฮอลล์ 1–4",
    en: "Queen Sirikit National Convention Center (QSNCC), Hall 1–4",
  },
  venueAddress: {
    th: "60 ถนนรัชดาภิเษก แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110 (MRT ศูนย์การประชุมแห่งชาติสิริกิติ์)",
    en: "60 Ratchadaphisek Rd, Khlong Toei, Bangkok 10110 (MRT Queen Sirikit National Convention Centre)",
  },
  organizerName: "กระทรวงพาณิชย์ (Ministry of Commerce)",
  coverGradient: ["#1e3a8a", "#0f766e"],
  coverImageUrl: "/events/moc26-cover.webp",
  capacity: 60000,
  holdMinutes: 15,
  feeMode: "absorb",
  platformFeeBps: 0,
  vatRateBps: 700,
  refundPolicy: {
    th: "ลงทะเบียนฟรี ไม่มีค่าใช้จ่าย",
    en: "Registration is free of charge.",
  },
  termsDocument,
  terms: [
    {
      th: "ลงทะเบียนฟรี ป้ายชื่อ 1 ใบต่อ 1 คน ใช้ได้ทุกวันของงาน แสดง QR บนป้ายชื่อที่จุดเช็คอิน",
      en: "Free registration. One badge per person, valid every day. Show the badge QR code at check-in.",
    },
    {
      th: "ผู้ประกอบการ / ผู้ซื้อ (Trade) เข้าโซน Business Matching ได้ โปรดพกนามบัตร",
      en: "Trade visitors may enter the Business Matching zone. Please bring a business card.",
    },
    {
      th: "สื่อมวลชนต้องแสดงบัตรสื่อมวลชนหรือหนังสือรับรองจากต้นสังกัดที่จุดเช็คอิน",
      en: "Media must show a press card or letter from their outlet at check-in.",
    },
  ],
};

const ticketTypes: TicketType[] = [
  {
    id: "tt_visitor",
    eventId: EVENT_ID,
    code: "VISITOR",
    kind: "general",
    name: { th: "ผู้เข้าชมงานทั่วไป", en: "General Visitor" },
    description: {
      th: "เข้าชมและช้อปสินค้าได้ทุกโซน พร้อมกิจกรรมบนเวที ตลอด 4 วัน",
      en: "Shop every product zone and join stage activities on all 4 days.",
    },
    perks: [
      { th: "โซนสินค้าทุกหมวด (A–F)", en: "All product zones (A–F)" },
      { th: "เวทีกิจกรรมและสัมมนา", en: "Stage activities and seminars" },
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
    salesEndsAt: "2026-11-29T18:00:00+07:00",
    slotIds: null,
    requiresTicketTypeIds: null,
    entryCheck: null,
    sortOrder: 10,
  },
  {
    id: "tt_trade",
    eventId: EVENT_ID,
    code: "TRADE",
    kind: "trade",
    name: { th: "ผู้ประกอบการ / ผู้ซื้อ (Trade)", en: "Entrepreneur / Trade Buyer" },
    description: {
      th: "สำหรับผู้ประกอบการ ผู้ซื้อ และผู้แทนจำหน่าย — ทุกสิทธิ์ของผู้เข้าชมทั่วไป พร้อมเข้าโซน Business Matching",
      en: "For entrepreneurs, buyers and distributors — everything in General Visitor plus the Business Matching zone.",
    },
    perks: [
      { th: "โซน Business Matching จับคู่ธุรกิจ", en: "Business Matching zone" },
      { th: "สัมมนาเชิงลึกสำหรับผู้ประกอบการ", en: "In-depth seminars for entrepreneurs" },
    ],
    priceSatang: 0,
    compareAtSatang: null,
    quota: 5000,
    countsTowardEventCapacity: true,
    isPublic: true,
    holderInfo: "full",
    minPerOrder: 1,
    maxPerOrder: 5,
    onePerPerson: true,
    salesStartsAt: null,
    salesEndsAt: "2026-11-29T18:00:00+07:00",
    slotIds: null,
    requiresTicketTypeIds: null,
    entryCheck: null,
    sortOrder: 20,
  },
  {
    id: "tt_press",
    eventId: EVENT_ID,
    code: "PRESS",
    kind: "press",
    name: { th: "สื่อมวลชน (Press)", en: "Press" },
    description: {
      th: "สำหรับสื่อมวลชน เข้าได้ทุกโซนตลอดงาน — ต้องใช้โค้ดจากผู้จัด",
      en: "For media, all areas on every day. Requires an invitation code.",
    },
    perks: [
      { th: "ทุกโซนตลอดงาน", en: "All areas, every day" },
      { th: "ห้องสื่อมวลชน", en: "Press room" },
    ],
    priceSatang: 0,
    compareAtSatang: null,
    quota: 300,
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
    sortOrder: 30,
  },
];

const promoCodes: PromoCode[] = [
  {
    id: "pc_press",
    eventId: EVENT_ID,
    code: "PRESS2026",
    label: { th: "โค้ดสื่อมวลชน", en: "Media code" },
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
    name: { th: "ประตู 1 (ทางเข้าหลัก)", en: "Gate 1 (main entrance)" },
    kind: "entrance",
    allowedTicketTypeIds: null,
  },
  {
    id: "cp_gate_b",
    eventId: EVENT_ID,
    name: { th: "ประตู 2", en: "Gate 2" },
    kind: "entrance",
    allowedTicketTypeIds: null,
  },
  {
    id: "cp_bm",
    eventId: EVENT_ID,
    name: { th: "โซน Business Matching", en: "Business Matching zone" },
    kind: "restricted_area",
    allowedTicketTypeIds: ["tt_trade", "tt_press"],
  },
];

// หมวดสินค้า — สีจากชุด categorical มาตรฐาน 6 ช่องแรก (ตามลำดับ) ผ่าน validate_palette แบบ adjacent ทั้งโหมดสว่าง/มืด
// ผังวางโซนให้หมวดที่อยู่ติดกันเป็นคู่ที่อยู่ติดกันในลำดับสีเท่านั้น (A|B|C แถวบน, D|E|F แถวล่าง คั่นด้วยพื้นที่ส่วนกลาง)
// ทุกโซนมีตัวอักษรหมวดและชื่อกำกับ เพราะสีบางคู่แยกยากสำหรับผู้ที่มองเห็นสีผิดปกติ
const categories: ProductCategory[] = [
  {
    id: "cat_food",
    code: "A",
    name: { th: "อาหารและเครื่องดื่ม", en: "Food & Beverage" },
    shortName: { th: "อาหาร", en: "Food" },
    color: "#2a78d6",
    colorDark: "#3987e5",
  },
  {
    id: "cat_fashion",
    code: "B",
    name: { th: "ผ้าและแฟชั่น", en: "Textiles & Fashion" },
    shortName: { th: "แฟชั่น", en: "Fashion" },
    color: "#eb6834",
    colorDark: "#d95926",
  },
  {
    id: "cat_home",
    code: "C",
    name: { th: "ของใช้และของแต่งบ้าน", en: "Home & Living" },
    shortName: { th: "ของแต่งบ้าน", en: "Home" },
    color: "#1baf7a",
    colorDark: "#199e70",
  },
  {
    id: "cat_beauty",
    code: "D",
    name: { th: "สุขภาพและความงาม", en: "Health & Beauty" },
    shortName: { th: "สุขภาพ·ความงาม", en: "Health·Beauty" },
    color: "#eda100",
    colorDark: "#c98500",
  },
  {
    id: "cat_craft",
    code: "E",
    name: { th: "หัตถกรรม OTOP และสินค้า GI", en: "Crafts, OTOP & GI" },
    shortName: { th: "หัตถกรรม·GI", en: "Crafts·GI" },
    color: "#e87ba4",
    colorDark: "#d55181",
  },
  {
    id: "cat_biz",
    code: "F",
    name: { th: "นวัตกรรม แฟรนไชส์ และบริการ", en: "Innovation, Franchise & Services" },
    shortName: { th: "นวัตกรรม·บริการ", en: "Innovation" },
    color: "#008300",
    colorDark: "#008300",
  },
];

const floorPlan: FloorPlan = {
  title: { th: "ผังงาน", en: "Floor plan" },
  width: 320,
  height: 214,
  zones: [
    { id: "z_a", label: categories[0]!.name, categoryId: "cat_food", x: 8, y: 8, w: 100, h: 78 },
    { id: "z_b", label: categories[1]!.name, categoryId: "cat_fashion", x: 110, y: 8, w: 100, h: 78 },
    { id: "z_c", label: categories[2]!.name, categoryId: "cat_home", x: 212, y: 8, w: 100, h: 78 },
    { id: "z_stage", label: { th: "เวทีกิจกรรม / สัมมนา", en: "Stage & seminars" }, categoryId: null, x: 8, y: 92, w: 150, h: 34 },
    { id: "z_bm", label: { th: "Business Matching", en: "Business Matching" }, categoryId: null, x: 162, y: 92, w: 150, h: 34 },
    { id: "z_d", label: categories[3]!.name, categoryId: "cat_beauty", x: 8, y: 132, w: 100, h: 62 },
    { id: "z_e", label: categories[4]!.name, categoryId: "cat_craft", x: 110, y: 132, w: 100, h: 62 },
    { id: "z_f", label: categories[5]!.name, categoryId: "cat_biz", x: 212, y: 132, w: 100, h: 62 },
  ],
  entrances: [
    { id: "cp_gate_a", label: { th: "ประตู 1", en: "Gate 1" }, x: 52, y: 206 },
    { id: "cp_gate_b", label: { th: "ประตู 2", en: "Gate 2" }, x: 256, y: 206 },
  ],
};

// ผู้ประกอบการที่ออกบูธ — ชื่อทั้งหมดเป็นชื่อสมมติ (หมวดละ 2 บูธ)
const exhibitorDefs: [string, string, string, string][] = [
  ["cat_food", "Baan Suan Snacks", "ผลไม้อบแห้งและขนมพื้นบ้าน", "Dried fruit and traditional snacks"],
  ["cat_food", "Golden Field Rice", "ข้าวหอมมะลิและผลิตภัณฑ์จากข้าว", "Jasmine rice and rice products"],
  ["cat_fashion", "Lanna Weave", "ผ้าทอมือและเสื้อผ้าร่วมสมัย", "Hand-woven textiles and modern wear"],
  ["cat_fashion", "Indigo Craft", "ผ้าย้อมครามธรรมชาติ", "Natural indigo-dyed fabrics"],
  ["cat_home", "Teak & Clay Home", "เฟอร์นิเจอร์ไม้และเซรามิก", "Wood furniture and ceramics"],
  ["cat_home", "Bamboo Living", "ของใช้ในบ้านจากไม้ไผ่", "Bamboo homeware"],
  ["cat_beauty", "Herb Garden Spa", "ผลิตภัณฑ์สปาและสมุนไพรไทย", "Thai herbal spa products"],
  ["cat_beauty", "Siam Coconut Beauty", "เครื่องสำอางจากมะพร้าว", "Coconut-based cosmetics"],
  ["cat_craft", "Benjarong Studio", "เครื่องเบญจรงค์และของที่ระลึก", "Benjarong porcelain and gifts"],
  ["cat_craft", "Silver Hill Craft", "เครื่องเงินและเครื่องประดับ GI", "GI silverware and jewellery"],
  ["cat_biz", "SmartShop POS", "ระบบขายหน้าร้านและรับชำระเงินสำหรับ SME", "Point-of-sale and payments for SMEs"],
  ["cat_biz", "Franchise Hub", "แฟรนไชส์อาหารและเครื่องดื่ม", "Food and beverage franchises"],
];

const sponsors: Sponsor[] = exhibitorDefs.map(([, name, th, en], i) => {
  const handle = name.split(" ")[0]!.toLowerCase();
  return {
    id: `sp_${i + 1}`,
    eventId: EVENT_ID,
    name,
    tier: "exhibitor",
    description: { th, en },
    websiteUrl: `https://example.com/${handle}`,
    contactEmail: `sales@${handle}.example.com`,
  };
});

// slug ยาวสุ่ม เพื่อไม่ให้เดา URL บูธอื่นได้ (ค่าตายตัวใน mock)
const QR_SLUGS = [
  "k7q2mx9a", "p3w8zr1d", "h5n4tb6c", "v9e2yk3s", "m1x7qd8f", "r6c3ju2w",
  "t4g8wn5e", "c2z6pk7h", "y8b3rf1m", "n5d9qs4x", "w7j2hv6t", "f3u8ea9k",
];

const booths: Booth[] = sponsors.map((sp, i) => {
  const categoryId = exhibitorDefs[i]![0];
  const cat = categories.find((c) => c.id === categoryId)!;
  const nth = exhibitorDefs.slice(0, i).filter(([c]) => c === categoryId).length + 1;
  return {
    id: `bo_${i + 1}`,
    eventId: EVENT_ID,
    sponsorId: sp.id,
    code: `${cat.code}${String(nth).padStart(2, "0")}`,
    qrSlug: QR_SLUGS[i]!,
    zone: cat.code,
    categoryId,
  };
});

export function createMockCatalog(): Catalog {
  // คืนสำเนาใหม่ทุกครั้ง เพื่อไม่ให้แต่ละที่แก้ข้อมูลกันเอง
  return structuredClone({
    event,
    slots: [],
    ticketTypes,
    products: [],
    promoCodes,
    checkpoints,
    sponsors,
    booths,
    categories,
    floorPlan,
  });
}
