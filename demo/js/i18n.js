// Attendee-facing text. Adding a language = adding one more key per entry.
const DICT = {
  register: { th: 'ลงทะเบียน', en: 'Register' },
  registerTitle: { th: 'ลงทะเบียนเข้างาน', en: 'Event registration' },
  firstName: { th: 'ชื่อ', en: 'First name' },
  lastName: { th: 'นามสกุล', en: 'Last name' },
  email: { th: 'อีเมล', en: 'Email' },
  phone: { th: 'เบอร์โทร (ไม่บังคับ)', en: 'Phone (optional)' },
  company: { th: 'บริษัท', en: 'Company' },
  jobTitle: { th: 'ตำแหน่ง', en: 'Job title' },
  nationality: { th: 'สัญชาติ', en: 'Nationality' },
  idDoc: { th: 'เอกสารยืนยันตัวตน', en: 'ID document' },
  thaiId: { th: 'บัตรประชาชน', en: 'Thai ID card' },
  passport: { th: 'Passport', en: 'Passport' },
  ticketType: { th: 'ประเภทบัตร', en: 'Ticket type' },
  interests: { th: 'สิ่งที่สนใจ', en: 'Interests' },
  consentTerms: { th: 'ฉันยอมรับเงื่อนไขการเข้าร่วมงานและนโยบายความเป็นส่วนตัว', en: 'I accept the event terms and privacy policy' },
  consentShare: { th: 'ยินยอมให้แชร์ชื่อ บริษัท ตำแหน่ง และอีเมลของฉัน กับ sponsor ที่ฉันสแกนหรือแตะที่บูธเท่านั้น', en: 'Share my name, company, title and email only with sponsors whose booth I scan or tap' },
  consentMarketing: { th: 'รับข่าวสารงานถัดไปจากผู้จัด', en: 'Send me news about future events from the organizer' },
  optional: { th: 'ไม่บังคับ', en: 'optional' },
  submit: { th: 'ลงทะเบียนและรับบัตร', en: 'Register and get ticket' },
  dupEmail: { th: 'อีเมลนี้ลงทะเบียนแล้ว', en: 'This email is already registered' },
  soldOut: { th: 'บัตรประเภทนี้เต็มแล้ว', en: 'This ticket type is sold out' },
  yourTicket: { th: 'บัตรเข้างานของคุณ', en: 'Your ticket' },
  showAtGate: { th: 'แสดง QR นี้ที่ประตู แล้วรับสายรัดข้อมือ RFID สำหรับแตะที่บูธ', en: 'Show this QR at the gate and collect your RFID wristband for booth taps' },
  ticketCode: { th: 'รหัสบัตร', en: 'Ticket code' },
  addWallet: { th: 'เพิ่มลง Wallet', en: 'Add to Wallet' },
  sendLine: { th: 'ส่งเข้า LINE', en: 'Send to LINE' },
  checkedIn: { th: 'เข้างานแล้ว', en: 'Checked in' },
  notCheckedIn: { th: 'ยังไม่ได้เช็คอิน', en: 'Not checked in yet' },
  wristband: { th: 'สายรัดข้อมือ RFID', en: 'RFID wristband' },
  privacy: { th: 'ความเป็นส่วนตัว', en: 'Privacy' },
  shareOn: { th: 'sponsor ที่คุณสแกนจะได้รับข้อมูลติดต่อของคุณ', en: 'Sponsors you scan receive your contact details' },
  shareOff: { th: 'sponsor จะไม่ได้รับข้อมูลของคุณ (นับเป็นผู้เยี่ยมชมเท่านั้น)', en: 'Sponsors will not receive your details (counted as a visit only)' },
  turnOn: { th: 'เปิดการแชร์', en: 'Turn sharing on' },
  turnOff: { th: 'ถอนความยินยอม', en: 'Withdraw consent' },
  boothsVisited: { th: 'บูธที่คุณเยี่ยมชม', en: 'Booths you visited' },
  interested: { th: 'สนใจ', en: "I'm interested" },
  requestInfo: { th: 'ขอข้อมูลเพิ่ม', en: 'Request more info' },
  thanks: { th: 'ส่งให้ sponsor แล้ว ขอบคุณ!', en: 'Sent to the sponsor. Thank you!' },
  thanksNoShare: { th: 'บันทึกแล้ว sponsor จะเห็นเป็นตัวเลขผู้เยี่ยมชมเท่านั้น เพราะคุณยังไม่ได้ยินยอมแชร์ข้อมูล', en: 'Saved. The sponsor only sees a visitor count because you have not agreed to share your details.' },
  whoAreYou: { th: 'ยืนยันตัวตนด้วยรหัสบัตร', en: 'Confirm with your ticket code' },
  whoAreYouHint: { th: 'ดูได้ในอีเมลบัตร เช่น EV-7K2Q-9MXD', en: 'Find it in your ticket email, e.g. EV-7K2Q-9MXD' },
  confirm: { th: 'ยืนยัน', en: 'Confirm' },
  notFound: { th: 'ไม่พบรหัสบัตรนี้', en: 'Ticket code not found' },
  visitWebsite: { th: 'เว็บไซต์', en: 'Website' },
  required: { th: 'กรุณากรอกช่องที่จำเป็น', en: 'Please fill in the required fields' },
};

let lang = (() => { try { return localStorage.getItem('ev-demo-lang') || 'th'; } catch { return 'th'; } })();
export const getLang = () => lang;
export function setLang(l) { lang = l; try { localStorage.setItem('ev-demo-lang', l); } catch {} }
export const t = (k) => DICT[k]?.[lang] ?? DICT[k]?.th ?? k;
export const tx = (obj) => (obj && (obj[lang] || obj.th || obj.en)) || '';

export const langToggle = () => `<div class="lang">${['th', 'en'].map((l) => `<button type="button" data-lang="${l}" class="${l === lang ? 'on' : ''}">${l.toUpperCase()}</button>`).join('')}</div>`;
