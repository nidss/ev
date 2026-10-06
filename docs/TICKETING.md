# ระบบซื้อบัตร (Ticketing) บนหน้าลงทะเบียน

หน้าลงทะเบียนต้องขายบัตรได้ด้วย ไม่ใช่แค่ลงทะเบียนฟรี เอกสารนี้ย้าย "ขายบัตรออนไลน์" จาก Phase 2 มาไว้ใน **Phase 1 (MVP)**
และขยาย data model ใน [ARCHITECTURE.md](./ARCHITECTURE.md) ให้รองรับ

> **สถานะ:** มี prototype ที่ใช้งานได้แล้ว (`packages/core` + `apps/web`) ใช้ราคาบัตร mock (§12) และ payment gateway จำลอง
> prototype รันในเบราว์เซอร์ทั้งหมด (ขึ้น GitHub Pages) ข้อมูลเก็บใน localStorage ยังไม่ต่อ Postgres — วิธีรันดูที่ [README](../README.md)

---

## 1. สิ่งที่ได้จากตัวอย่าง Zipevent

ตัวอย่างที่ดู:
- [Space & Time Cube+](https://www.zipeventapp.com/e/Space-Time-Cube) (Seacon Bangkae) และ [Space & Time Cube Pattaya](https://www.zipeventapp.com/e/Space-Time-Cube-Pattaya)
- [Fahlanna Art Museum](https://www.zipeventapp.com/e/fahlanna-art-museum) (เชียงใหม่)

> หมายเหตุ: ตอนเขียนเอกสารนี้เปิดหน้า zipeventapp.com ตรงๆ ไม่ได้ (network ของ environment บล็อกไว้) ข้อมูลด้านล่างจึงมาจาก
> ผลค้นหาและหน้า listing ของงานเดียวกันบนเว็บอื่น ควรเปิดหน้าจริงตรวจรายละเอียด UI อีกครั้งก่อนออกแบบหน้าจอ

| สิ่งที่เห็น | ตัวอย่างจริง | ผลต่อระบบเรา |
|---|---|---|
| **งานจัดยาวหลายเดือน ขายเป็นวัน/รอบ** | Space & Time Cube Pattaya: 9 ธ.ค. 2025 – 8 ธ.ค. 2026, 11:00–22:00 / Fahlanna เปิด 10:00–19:00, **ปิดวันพุธ**, เข้ารอบสุดท้าย 18:30 | ต้องมี "รอบ" (time slot) ที่สร้างจากเวลาเปิด-ปิด + วันหยุด ไม่ใช่งานวันเดียว |
| **บัตรใช้ได้เฉพาะวัน/รอบที่เลือก** | Fahlanna: "Tickets are valid only for the date and time selected at purchase" | ผูกบัตรกับรอบ, เครื่องสแกนต้องตรวจวัน/รอบ |
| **ราคาแยกตามกลุ่มคน** | ผู้ใหญ่ 599 / เด็ก 449 (Pattaya); Fahlanna แยกราคา **คนไทย vs ต่างชาติ** และ ผู้ใหญ่/เด็ก/ผู้สูงอายุ | ticket type มี "เงื่อนไขสิทธิ์" ที่ต้องตรวจหน้างาน |
| **เงื่อนไขสิทธิ์ตรวจหน้างาน** | เด็กต่ำกว่า 80 ซม. เข้าฟรี, บัตรเด็กสำหรับต่ำกว่า 140 ซม. + ต้องมีผู้ปกครอง, อายุ 60+ ใช้ราคาเด็ก (แสดงบัตร), ผู้พิการเข้าฟรี (แสดงบัตรคนพิการ), บัตรราคาคนไทยต้องแสดงบัตร ปชช./ใบขับขี่/passport | เครื่องสแกนต้องแสดง "ต้องตรวจ: ..." ให้ staff ก่อนกดรับเข้า |
| **บัตรรวม / แพ็กเกจ** | Main Hall 599 vs Combo (Main Hall + Jumping Spacecraft) 699; Seacon: Full Package 799, Main Hall + Rail Cinema 699 | บัตรหนึ่งใบเข้าได้หลายโซน → ผูก ticket type กับหลาย checkpoint |
| **Add-on** | Zipevent มีฟีเจอร์ Add-on ขายสินค้า/สิทธิพิเศษเพิ่มระหว่างซื้อบัตร | ขาย item ที่ไม่ใช่บัตรใน order เดียวกัน |
| **จำกัดจำนวนต่อคำสั่งซื้อ + คำถามก่อนยืนยัน** | ฟีเจอร์ "Add Features" ของ Zipevent | `max_per_order` + คำถามใน checkout (ใช้ `form_fields` ที่มีอยู่) |
| **ช่องทางจ่าย** | บัตรเครดิต, PromptPay (QR), Mobile Banking, โอนเงิน | ต่อ payment gateway ไทย |
| **ได้ e-ticket QR ทันที** | ส่งทาง email / SMS หลังจ่ายสำเร็จ | ใช้ flow ส่งบัตรเดิม (`message_outbox`) |

### ข้อสรุป: รองรับ 2 รูปแบบงานด้วยโครงสร้างเดียว

| | งานประชุม/เอ็กซ์โป (เคสหลักของเรา ~8,000 คน) | งานแบบ attraction/นิทรรศการ (แบบ Zipevent) |
|---|---|---|
| ระยะเวลา | 1–3 วัน | หลายสัปดาห์–หลายเดือน |
| รอบ | 1 รอบต่อวัน (หรือไม่มีรอบ) | หลายรอบต่อวัน ทุก 30–60 นาที |
| ข้อมูลผู้ถือบัตร | **ต้องรู้ทุกคน** (ใช้ทำ lead ให้ sponsor) | ส่วนใหญ่รู้แค่ผู้ซื้อ |
| ราคา | ฟรี / early bird / VIP | ผู้ใหญ่ / เด็ก / คนไทย / ต่างชาติ / combo |

ทั้งสองแบบใช้ตารางเดียวกัน ต่างกันที่การตั้งค่าของ event และ ticket type

---

## 2. Flow ฝั่งผู้ซื้อ

ปรับตามแนวของ [ThaiTicketMajor](https://www.thaiticketmajor.com/concert/faye-peraya-birthday-party-2026-1410-static.html)
(ยอมรับเงื่อนไข → เลือกรอบ → เลือกโซน → เลือกที่นั่ง → ชำระเงิน) และ [Zipevent](https://www.zipeventapp.com/e/Space-Time-Cube)
(เลือกวัน → เลือกรอบ → เลือกจำนวน → add-on → checkout) — งานเราไม่มีผังที่นั่ง จึงรวม "เลือกโซน + ที่นั่ง" เป็นขั้นเลือกบัตรตามจำนวน

เลือกบัตรได้ทันทีบนหน้างาน (แบบ Zipevent) ไม่ต้องเปลี่ยนหน้า — ขั้นตอนเหลือ 3 ขั้น: เลือกบัตร → กรอกข้อมูล → ชำระเงิน

```
หน้า event (/e/:slug)
  ├─ โปสเตอร์ + ชื่องาน + วันที่ + สถานที่ + ราคาบัตร (ฟรี / 890 / … / 6,900 บาท) + ผู้จัด + [ซื้อบัตร ↓]
  ├─ ① เลือกบัตร (#tickets)
  │    ├─ ชิปเลือกวัน (รอบ) พร้อมสถานะ เปิดขาย / บัตรหมด / ปิดขาย — วันที่เลือกเก็บใน URL (?round=YYYY-MM-DD)
  │    ├─ บัตรเข้างานของวันนั้น (บัตร 2 วันแสดงทุกวัน) + ช่องโค้ดปลดล็อกบัตรซ่อน
  │    ├─ workshop ของวันนั้น + add-on
  │    └─ สรุปยอด (ด้านข้าง / แถบล่างบนมือถือ) + ☐ ยอมรับเงื่อนไข (ลิงก์ไปหัวข้อเงื่อนไข) → [ยืนยันบัตร]
  └─ รายละเอียดงาน, เงื่อนไขการซื้อบัตร (#terms), นโยบายคืนเงิน, ตารางราคาบัตร
        │
        ▼  สร้าง order (บันทึกเวลายอมรับเงื่อนไข) + กันที่นั่ง 15 นาที (นับถอยหลังบนจอ)
Checkout (/e/:slug/checkout?order=…&token=…)
  ② กรอกข้อมูล        ผู้ซื้อ, ผู้ถือบัตรรายใบ, รับข่าวสาร (ไม่บังคับ), ขอใบกำกับภาษี
  ③ ตรวจสอบและชำระ   ทวนข้อมูล (แก้ไขย้อนกลับได้) + โค้ดส่วนลด + เลือกวิธีจ่าย → [ชำระเงิน ฿x,xxx]
        │                                                       (บัตรฟรี: [ยืนยันการลงทะเบียน] → สำเร็จทันที)
        ▼  หน้า gateway (ตอนนี้เป็น mock /mock-pay?charge=…) → webhook ยืนยันการจ่าย
หน้าสำเร็จ + e-ticket QR รายใบ (/t?order=…&token=…)
```

สิ่งที่ยังไม่ทำจาก flow ของ ThaiTicketMajor (เพราะงานนี้ไม่ต้องใช้ หรือรอตัดสินใจ):
- **ผังที่นั่ง / เลือกที่นั่ง** — งานนี้ไม่มีผังที่นั่ง
- **ห้องรอคิว (waiting room)** ตอนเปิดขาย — จำเป็นเมื่อคนกดพร้อมกันหลายหมื่น (Phase 2 ตาม §3)
- **บังคับสมัครสมาชิก / จำกัดจำนวนต่อบัญชี** — ตอนนี้จำกัดต่อ order และกันซ้ำด้วย email ของผู้ถือบัตร
- **ค่าบริการต่อใบ** (ThaiTicketMajor เก็บ 30 บาท/ใบ + 3% ถ้าจ่ายบัตรเครดิต) — ระบบรองรับ `fee_mode = pass_on` แล้ว แต่งานตัวอย่างตั้งเป็น `absorb`
- **บัตรกระดาษ / รับบัตรที่จุดจำหน่าย** — ตอนนี้มีแต่ e-ticket

- **บัตรฟรีใช้ flow เดียวกัน** — order ยอด 0 บาทข้ามขั้นจ่ายเงิน แล้วยืนยันทันที (ทำให้ลงทะเบียนฟรีกับซื้อบัตรเป็นโค้ดชุดเดียว)
- **ผสมได้** — order เดียวมีบัตรฟรีกับบัตรเสียเงินปนกันได้
- **ภาษา** — หน้าเลือกบัตร/checkout ใช้ i18n เดิม ราคาแสดงเป็นบาทเสมอ (ไม่แปลงสกุลเงิน)

### ข้อมูลผู้ถือบัตร (`ticket_types.holder_info`)

| ค่า | ใช้กับ | พฤติกรรม |
|---|---|---|
| `buyer_only` | นิทรรศการ, attraction | ไม่ถามชื่อรายใบ บัตรทุกใบผูกกับผู้ซื้อ |
| `name_only` | งานทั่วไป | ถามชื่อรายใบ |
| `full` | งานประชุม/เอ็กซ์โปที่มี sponsor | ถามฟอร์มเต็มรายใบ (บริษัท, ตำแหน่ง, ความสนใจ, consent ของ**ผู้ถือบัตรเอง**) |

กรณี `full` ผู้ซื้อกรอกให้คนอื่นตอน checkout ไม่ได้ครบ (เช่น consent ต้องเป็นของเจ้าตัว) → ระบบส่ง **ลิงก์ "กรอกข้อมูลผู้ถือบัตร"** ให้แต่ละคนทาง email
บัตรที่ยังไม่กรอกข้อมูลแสดงสถานะ `unassigned` และ organizer ตั้งได้ว่าจะให้เช็คอินได้หรือไม่ (`events.settings.require_holder_before_checkin`)

---

## 3. การจองที่นั่งและกันขายเกิน (inventory)

ความจุมีได้หลายชั้นพร้อมกัน และ order ต้องผ่าน**ทุกชั้น**:

1. `events.capacity` — ความจุรวมทั้งงาน
2. `time_slots.capacity` — ความจุต่อรอบ (ใช้ร่วมกันทุกประเภทบัตร เช่น รอบละ 200 คน)
3. `ticket_types.quota` — โควตาทั้งงานของประเภทบัตร (เช่น VIP 100 ใบ, early bird 500 ใบ)
4. `slot_ticket_quotas.quota` — โควตาประเภทบัตรต่อรอบ (ไม่บังคับ)

**วิธีจอง** — ทำใน transaction เดียว ด้วย conditional update ทีละชั้น เรียงลำดับเดิมเสมอ (event → slot → ticket type → slot quota) เพื่อกัน deadlock:

```sql
UPDATE time_slots
   SET taken = taken + :qty
 WHERE id = :slot_id AND status = 'open'
   AND (capacity IS NULL OR taken + :qty <= capacity)
RETURNING taken;
-- ไม่มีแถวคืนมา = เต็ม → rollback ทั้ง order แล้วบอกผู้ซื้อว่าเหลือไม่พอ
```

- `taken` นับทั้ง "จองไว้รอจ่าย" และ "จ่ายแล้ว" → ไม่ต้องแยกสองตัวเลข
- order ที่หมดเวลา (`expires_at` ผ่านไปแล้วยังไม่จ่าย) → worker ปล่อยที่นั่งคืน (ลด `taken`) ทุก 1 นาที
- **จ่ายเงินมาหลังหมดเวลา** (เกิดได้กับ PromptPay/mobile banking) → ลองจองใหม่ ถ้ายังมีที่ให้ยืนยัน order ตามปกติ ถ้าเต็มแล้ว → คืนเงินอัตโนมัติ + แจ้งผู้ซื้อ
- ticket type ที่ `counts_toward_capacity = false` (เช่น เด็กต่ำกว่า 80 ซม. เข้าฟรี) ไม่หักความจุ
- ระยะเวลาจอง: ค่าเริ่มต้น 15 นาที ปรับได้ต่องาน (`events.settings.hold_minutes`)

**โหลด**: งาน 8,000 คนเปิดขายพร้อมกัน conditional update บน Postgres รับได้สบาย
ถ้าภายหลังมีงานแบบคอนเสิร์ต (หลายหมื่นคนกดพร้อมกันในไม่กี่นาที) ค่อยเพิ่ม virtual waiting room + ตัดสต็อกล่วงหน้าใน Redis (Phase 2)

---

## 4. การชำระเงิน

### Gateway

ใช้ gateway ไทยที่รองรับครบในเจ้าเดียว แล้วซ่อนไว้หลัง interface `PaymentProvider` ใน `packages/core/payments` เพื่อเปลี่ยนเจ้าได้:
- ตัวเลือก: **Opn Payments (Omise)**, **2C2P**, **GB Prime Pay** — ต้องเทียบค่าธรรมเนียม/เงื่อนไขการโอนเงินออก (settlement) ก่อนเลือก
- วิธีจ่ายที่ต้องมีใน MVP: **บัตรเครดิต/เดบิต** (ต่างชาติใช้ได้), **PromptPay QR**, **Mobile Banking** (K PLUS, SCB Easy, Krungthai NEXT, Bualuang ฯลฯ)
- เผื่อไว้สำหรับนักท่องเที่ยว: Alipay / WeChat Pay (ถ้า gateway มี)

```ts
// packages/core/payments/provider.ts
interface PaymentProvider {
  createCharge(input: { orderId: string; amountSatang: number; method: PaymentMethod; returnUrl: string }):
    Promise<{ providerChargeId: string; redirectUrl?: string; qrPayload?: string; expiresAt?: Date }>;
  verifyWebhook(headers: Headers, rawBody: string): Promise<PaymentEvent>;  // ตรวจลายเซ็น webhook
  refund(input: { providerChargeId: string; amountSatang: number; reason: string }): Promise<{ providerRefundId: string }>;
}
```

- **เชื่อผล webhook เท่านั้น** ไม่เชื่อ redirect กลับจาก gateway (redirect แค่พาไปหน้า "กำลังตรวจสอบการชำระเงิน")
- webhook ต้อง idempotent: `payments.provider_charge_id` unique, ประมวลผลซ้ำได้ไม่ออกบัตรซ้ำ
- worker เรียก API ของ gateway ตรวจสถานะซ้ำ (reconcile) ทุก 5 นาทีสำหรับ order ที่ค้าง `pending_payment` เผื่อ webhook หาย

### ค่าธรรมเนียม

ตั้งต่องาน (`events.settings.fee_mode`):
- `absorb` — organizer รับภาระ ผู้ซื้อเห็นราคาเต็มตามป้าย (แบบตัวอย่าง Zipevent ที่ราคาบนหน้าเป็นราคาจ่ายจริง)
- `pass_on` — บวกค่าธรรมเนียมเป็นบรรทัดแยกใน checkout

ค่าธรรมเนียมแพลตฟอร์ม (ของเรา) และค่าธรรมเนียม gateway บันทึกแยกต่อ order เพื่อคำนวณยอดโอนให้ organizer

### ใบเสร็จ / ใบกำกับภาษี

- ราคาบัตรเป็น **ราคารวม VAT 7%** (ถ้า organizer จด VAT) — เก็บ `vat_rate` ต่อ event
- ทุก order ที่จ่ายแล้วได้ **ใบเสร็จรับเงิน/ใบกำกับภาษีอย่างย่อ** อัตโนมัติ
- ผู้ซื้อขอ **ใบกำกับภาษีเต็มรูป** ได้ตอน checkout หรือภายหลังจากหน้า "บัตรของฉัน" (ภายในเดือนเดียวกัน)
- เลขที่เอกสารเรียงต่อเนื่องต่อ organization (ผู้ขายคือ organizer ส่วนเราเป็นตัวแทนรับเงิน) — ต้องยืนยันรูปแบบกับฝ่ายบัญชี/ภาษีก่อนเปิดใช้จริง

### เงินไหลผ่านระบบ = ฐานของ Phase 3

เงินค่าบัตรเข้าบัญชีของเรา (ผ่าน gateway) ก่อน แล้วค่อยโอนให้ organizer เป็นรอบ (`payouts`)
ตรงนี้คือสิ่งที่ Phase 3 ต้องใช้: เห็นยอดขายบัตรจริงแบบ real-time เพื่อพิจารณาสินเชื่อ และ**หักชำระคืนเงินกู้จากยอดโอนได้อัตโนมัติ**

---

## 5. โค้ดส่วนลดและ add-on

**โค้ดส่วนลด** (`promo_codes`): ลดเป็น % หรือจำนวนเงิน, จำกัดประเภทบัตรที่ใช้ได้, จำกัดจำนวนครั้งรวม/ต่อ email, ช่วงเวลาใช้งาน, จำนวนบัตรขั้นต่ำ
และใช้เป็น **โค้ดปลดล็อกบัตรซ่อน** ได้ (เช่น บัตร press/partner ที่ `is_public = false` จะโผล่เมื่อใส่โค้ด)

**Add-on** (`products`): สินค้าหรือสิทธิ์ที่ไม่ใช่บัตรเข้างาน เช่น เสื้อ, ที่จอดรถ, ชุดอาหาร, บัตร VR เพิ่ม
- มีสต็อกของตัวเอง, จำกัดว่าต้องซื้อคู่กับบัตรประเภทไหน
- รับของหน้างาน: staff สแกน QR ของ order ในโหมด "รับของ" → บันทึกการรับ (`redemptions`)

---

## 6. ยกเลิก / คืนเงิน

- นโยบายต่องาน (`events.settings.refund_policy`): `none` | `until_days_before` (N วันก่อนวันของรอบ) | `manual` (organizer อนุมัติเอง)
- คืนเงินได้ **รายใบ** (partial) หรือทั้ง order
- บัตรที่คืนเงิน → `attendees.status = cancelled`, เพิ่ม `qr_version`, ปล่อยที่นั่งคืน (ลด `taken`) → เครื่องสแกนได้ delta ใน sync รอบถัดไป
- **เปลี่ยนวัน/รอบ** (Phase 2): ย้ายบัตรไปรอบอื่นที่ยังว่าง ถ้าราคาเท่ากันไม่ต้องจ่ายเพิ่ม
- **โอนบัตรให้คนอื่น / เปลี่ยนชื่อ** (Phase 2): ออก QR ใหม่ (`qr_version + 1`)

---

## 7. ผลต่อเช็คอินหน้างาน

- snapshot ที่เครื่องสแกนโหลด: **เฉพาะบัตรของวันนี้** (รอบของวันนี้) — งานที่ขายยาวหลายเดือนจะไม่ต้องโหลดบัตรทั้งหมดลงเครื่อง
- ผลการสแกนเพิ่ม:
  - `wrong_slot` — บัตรเป็นของวัน/รอบอื่น (ตั้ง grace period ได้ เช่น เข้าก่อนรอบ 15 นาที / หลังรอบ 30 นาที)
  - `unpaid` — ไม่ควรเกิด (สร้าง attendee หลังจ่ายแล้วเท่านั้น) แต่เก็บไว้กันกรณี order ถูก void ภายหลัง
- ticket type ที่มี `entry_check` (เช่น "แสดงบัตรประชาชนไทย", "เด็กสูงไม่เกิน 140 ซม.", "อายุ 60 ปีขึ้นไป แสดงบัตร") →
  เครื่องสแกนขึ้นกล่องเตือนเต็มจอให้ staff ตรวจก่อนกด **รับเข้า** หรือ **ไม่ผ่าน** (ไม่ผ่าน = ให้ไปซื้อ/อัปเกรดบัตรที่หน้างาน)
- บัตร combo: เข้าได้ทุก checkpoint ที่ผูกไว้ แต่ละ checkpoint นับการใช้แยกกัน (เช่น Rail Cinema เข้าได้ 1 ครั้ง)
- ขายบัตรหน้างาน (box office) = walk-in + จ่ายเงิน (เงินสด / PromptPay QR บนจอ) ผ่าน flow order เดียวกัน

---

## 8. Data model ที่เพิ่ม / เปลี่ยน

ใช้หลักการเดียวกับ ARCHITECTURE.md (UUIDv7, `event_id` ทุกตาราง, `i18n` = jsonb หลายภาษา, เงินเก็บเป็น**สตางค์** `int`)

### 8.1 รอบ / ความจุ

**`slot_rules`** — กฎสร้างรอบอัตโนมัติ (organizer ตั้งครั้งเดียว ระบบสร้าง `time_slots` ให้)

| column | type | หมายเหตุ |
|---|---|---|
| id | uuid | |
| event_id | uuid | |
| valid_from, valid_to | date | ช่วงวันที่ขาย |
| weekdays | int[] | วันที่เปิด เช่น `{1,2,4,5,6,7}` (ปิดวันพุธ = ไม่มี 3) |
| open_time, last_entry_time | time | เช่น 10:00 / 18:30 |
| interval_minutes | int | null = 1 รอบต่อวัน (ใช้ได้ทั้งวัน) |
| capacity_per_slot | int | |
| closed_dates | date[] | วันหยุดพิเศษ |

**`time_slots`** — รอบจริงที่ขาย (งานประชุม 1 วัน = 1 แถว)

| column | type | หมายเหตุ |
|---|---|---|
| id | uuid | |
| event_id | uuid | |
| starts_at, ends_at | timestamptz | |
| capacity | int | null = ไม่จำกัด (ใช้ความจุชั้นอื่น) |
| taken | int | จองไว้ + ขายแล้ว |
| status | enum | `open` \| `closed` \| `cancelled` |
| rule_id | uuid | null ถ้าสร้างเอง |

Index: `(event_id, starts_at)`

**`slot_ticket_quotas`** — `(slot_id, ticket_type_id)` unique, `quota`, `taken` — ใช้เมื่อต้องจำกัดประเภทบัตรรายรอบ

### 8.2 เพิ่ม column ใน `ticket_types`

| column | type | หมายเหตุ |
|---|---|---|
| price_satang | int | **ใช้จริงใน Phase 1** (0 = ฟรี) |
| compare_at_satang | int | ราคาก่อนลด (แสดงขีดฆ่า) — null ได้ |
| description | i18n | เงื่อนไขที่ผู้ซื้อเห็น เช่น "เด็กสูงไม่เกิน 140 ซม. ต้องมีผู้ปกครอง" |
| entry_check | i18n | ข้อความที่เครื่องสแกนเตือน staff ให้ตรวจ — null = ไม่ต้องตรวจ |
| holder_info | enum | `buyer_only` \| `name_only` \| `full` |
| counts_toward_capacity | bool | false สำหรับบัตรที่ไม่กินที่ (เช่น ทารก) |
| min_per_order, max_per_order | int | |
| sales_starts_at, sales_ends_at | timestamptz | ช่วงขาย (เช่น early bird) |
| requires_ticket_type_ids | uuid[] | ซื้อได้ต่อเมื่อมีบัตรประเภทนี้ใน order (เช่น บัตรเด็กต้องมีบัตรผู้ใหญ่) |
| checkpoint_ids | uuid[] | โซนที่เข้าได้ (บัตร combo) — null = ทุก entrance |
| one_per_person | bool | 1 email ได้บัตรประเภทนี้ได้ใบเดียว (เช่น บัตรฟรีงานประชุม) |

`quota` และ `issued_count` เดิม → เปลี่ยนชื่อ `issued_count` เป็น `taken` ให้ความหมายตรงกับตารางอื่น

### 8.3 คำสั่งซื้อ

**`orders`** — 1 การซื้อ (ผู้ซื้อ 1 คน, บัตรหลายใบได้)

| column | type | หมายเหตุ |
|---|---|---|
| id | uuid | |
| event_id | uuid | |
| order_code | text | รหัสอ่านได้ เช่น `OR-8F3K-2PQA` — unique ต่อ event |
| access_token_hash | text | token ในลิงก์ "บัตรของฉัน" (เก็บ hash) |
| status | enum | `pending_payment` \| `confirmed` \| `expired` \| `cancelled` \| `partially_refunded` \| `refunded` |
| expires_at | timestamptz | หมดเวลาจองที่นั่ง |
| buyer_first_name, buyer_last_name | text | |
| buyer_email | citext | |
| buyer_phone | text | ไม่บังคับ |
| buyer_nationality | char(2) | |
| locale | text | |
| subtotal_satang | int | ก่อนส่วนลด |
| discount_satang | int | |
| fee_satang | int | ค่าธรรมเนียมที่ผู้ซื้อจ่าย (fee_mode = pass_on) |
| total_satang | int | ยอดที่ต้องจ่าย |
| vat_satang | int | VAT ที่รวมอยู่ใน total |
| platform_fee_satang, gateway_fee_satang | int | ต้นทุนที่หักก่อนโอนให้ organizer |
| promo_code_id | uuid | null ได้ |
| tax_invoice_requested | bool | |
| tax_invoice_info | jsonb | ชื่อ, เลขผู้เสียภาษี, สาขา, ที่อยู่ |
| channel | enum | `online` \| `box_office` \| `organizer` |
| confirmed_at | timestamptz | |
| ip, user_agent | text | |

Index: `(event_id, status)`, `(status, expires_at)` (ให้ worker หา order หมดเวลา), `(event_id, buyer_email)`

**`order_items`**

| column | type | หมายเหตุ |
|---|---|---|
| id | uuid | |
| order_id | uuid | |
| kind | enum | `ticket` \| `addon` |
| ticket_type_id | uuid | ถ้า kind = ticket |
| product_id | uuid | ถ้า kind = addon |
| slot_id | uuid | null ถ้างานไม่มีรอบ |
| quantity | int | |
| unit_price_satang | int | snapshot ราคาตอนซื้อ |
| discount_satang | int | |
| name_snapshot | i18n | ชื่อสินค้าตอนซื้อ (organizer เปลี่ยนชื่อภายหลังได้โดยใบเสร็จไม่เพี้ยน) |

### 8.4 เปลี่ยน `attendees` = "บัตร 1 ใบ"

เดิม 1 แถว = 1 คน = 1 บัตร ยังคงเดิม แต่บัตรเกิดจาก order:

| column ใหม่ | type | หมายเหตุ |
|---|---|---|
| order_id | uuid | null สำหรับ import / organizer ออกบัตรให้ |
| order_item_id | uuid | |
| slot_id | uuid | รอบที่บัตรใช้ได้ |
| holder_status | enum | `assigned` \| `unassigned` (รอเจ้าของบัตรกรอกข้อมูล) |

- attendee ถูกสร้าง**หลังจ่ายเงินสำเร็จ**เท่านั้น (order `confirmed`) — ระหว่างรอจ่าย ข้อมูลผู้ถือบัตรเก็บอยู่ใน `orders` / ร่างใน jsonb ชั่วคราว
- unique `(event_id, email)` เดิม **ต้องเอาออก** เพราะคนเดียวซื้อหลายใบ/หลายรอบได้ → ใช้ unique เฉพาะ ticket type ที่ตั้ง `one_per_person` (ทำเป็น partial unique index)
- `status` เพิ่ม `refunded`

### 8.5 การเงิน

**`payments`**

| column | type | หมายเหตุ |
|---|---|---|
| id | uuid | |
| order_id | uuid | |
| provider | text | เช่น `omise`, `2c2p` |
| provider_charge_id | text | unique |
| method | enum | `card` \| `promptpay` \| `mobile_banking` \| `alipay` \| `wechat_pay` \| `cash` |
| amount_satang | int | |
| status | enum | `pending` \| `succeeded` \| `failed` \| `expired` |
| raw | jsonb | response ล่าสุดจาก gateway (ไม่เก็บเลขบัตร) |
| paid_at | timestamptz | |

**`refunds`** — `id, order_id, payment_id, attendee_ids uuid[], amount_satang, reason, status (pending|succeeded|failed), provider_refund_id, requested_by, approved_by`

**`payment_events`** — webhook ที่ได้รับทุกครั้ง (`provider, event_id unique, payload, received_at, processed_at`) ใช้ debug และกันประมวลผลซ้ำ

**`invoices`** — `id, org_id, order_id, kind (receipt|abbreviated_tax|full_tax|credit_note), number (unique ต่อ org+kind), issued_at, file_key`

**`payouts`** — ยอดโอนให้ organizer เป็นรอบ: `id, org_id, event_id, period_start, period_end, gross_satang, fees_satang, refunds_satang, loan_deduction_satang (Phase 3), net_satang, status, transferred_at`

### 8.6 ส่วนลด / add-on

**`promo_codes`** — `id, event_id, code (unique ต่อ event, ไม่สนตัวพิมพ์), discount_type (percent|amount), discount_value, ticket_type_ids uuid[], unlocks_ticket_type_ids uuid[], max_uses, max_uses_per_email, used_count, min_quantity, valid_from, valid_to`

**`products`** — `id, event_id, name i18n, description i18n, price_satang, stock, taken, requires_ticket_type_ids uuid[], max_per_order, image_url, sort_order`

**`redemptions`** — `id, order_item_id, quantity, device_id, staff_user_id, redeemed_at` (รับ add-on หน้างาน, id สร้างจากเครื่องได้เหมือน `checkins`)

---

## 9. API ที่เพิ่ม

| Endpoint | หน้าที่ |
|---|---|
| `GET /api/events/:slug/availability?month=2026-12` | วันที่เปิด/เต็ม สำหรับปฏิทิน (cache สั้นๆ ใน Redis) |
| `GET /api/events/:slug/slots?date=2026-12-01` | รอบของวัน + ที่เหลือ + ประเภทบัตรที่ขายได้ |
| `POST /api/orders` | สร้าง order + จองที่นั่ง → `{ orderId, expiresAt }` |
| `PATCH /api/orders/:id` | ใส่ข้อมูลผู้ซื้อ/ผู้ถือบัตร, ใส่โค้ดส่วนลด (คำนวณยอดใหม่) |
| `POST /api/orders/:id/pay` | สร้าง charge กับ gateway → redirect URL หรือ PromptPay QR |
| `GET /api/orders/:id/status` | หน้า "กำลังตรวจสอบการชำระเงิน" poll สถานะ |
| `POST /api/payments/webhook/:provider` | รับผลจาก gateway (ตรวจลายเซ็น, idempotent) |
| `POST /api/orders/:id/refunds` | organizer คืนเงิน (รายใบหรือทั้ง order) |

---

## 10. หน้าจอฝั่ง organizer ที่เพิ่ม

- ตั้งค่าบัตร: ราคา, เงื่อนไขสิทธิ์, ข้อความตรวจหน้างาน, ช่วงขาย, จำนวนต่อ order, combo checkpoint
- ตั้งรอบ: กฎเวลาเปิด-ปิด/วันหยุด + ดู/ปิดรอบรายวัน
- โค้ดส่วนลด, add-on
- รายการ order: ค้นหา, ส่งบัตรซ้ำ, คืนเงิน, ออกใบกำกับภาษีเต็มรูป
- dashboard ยอดขาย: รายได้รวม/สุทธิ, ขายต่อวัน, ต่อประเภทบัตร, ต่อรอบ (อัตราเต็ม), อัตราจ่ายสำเร็จ vs หมดเวลา
- payout: ยอดรอโอน, ประวัติการโอน

---

## 11. คำถามที่ต้องตัดสินใจ

1. **งาน ~8,000 คนที่เป็นเป้าหมายแรก ขายบัตรหรือฟรี?** ถ้าฟรีเกือบทั้งหมด อาจเลื่อน gateway ไปทีหลังได้โดยใช้ flow order ยอด 0 ไปก่อน
2. **เลือก payment gateway เจ้าไหน** — ต้องเทียบค่าธรรมเนียม, รอบ settlement, การรองรับ split/marketplace
3. **ใครเป็นผู้ขายในทางภาษี** — organizer ขายเอง (เราเป็นตัวแทนรับเงิน) หรือเราขายแล้วจ่ายต่อ → กระทบการออกใบกำกับภาษีและรายงานภาษี
4. **โมเดลรายได้**: ค่าธรรมเนียม % ต่อบัตรเท่าไร และ default เป็น `absorb` หรือ `pass_on`
5. ~~ต้องรองรับ **ที่นั่งแบบเลือกผัง (seat map)** แบบคอนเสิร์ตหรือไม่~~ → **ยังไม่ทำ** งานตอนนี้ไม่มีผังที่นั่ง นับเป็นจำนวนต่อรอบ/ประเภทบัตรเท่านั้น

ข้อ 1 และ 2 ตอบชั่วคราวแล้ว: งานมีทั้งบัตรฟรีและบัตรเสียเงิน (ราคา mock ใน §12) และใช้ **mock payment** ไปก่อน จนกว่าจะเลือก gateway จริง

---

## 12. ราคาบัตร mock (ใช้ใน prototype)

งานตัวอย่าง: **Bangkok Event Tech & Finance Expo 2026** — 21–22 พ.ย. 2569, QSNCC, ความจุรวม 8,000 คน
ข้อมูลทั้งหมดอยู่ใน `packages/core/src/mock-data.ts`

### บัตรเข้างาน

| บัตร | ราคา | โควตา | ต่อ order | รอบ | ข้อมูลผู้ถือ | หมายเหตุ |
|---|---|---|---|---|---|---|
| Expo Pass | **ฟรี** | ไม่จำกัด (รอบละ 5,000) | 1–5 | เลือกวัน: เสาร์ / อาทิตย์ | full | 1 email ได้ 1 ใบต่อวัน |
| Conference Pass 2 วัน | **฿2,500** (ปกติ ฿3,200) | 1,500 | 1–10 | ทั้งงาน | full | ราคา early bird |
| VIP Pass 2 วัน | **฿6,900** | 200 | 1–4 | ทั้งงาน | full | lounge, อาหารกลางวัน, networking party |
| Press Pass | **ฟรี** (ซ่อน) | 100 | 1–2 | ทั้งงาน | full | ต้องใช้โค้ด `PRESS2026` ถึงจะเห็น, staff ตรวจบัตรสื่อ |

### Workshop (เสียเงิน, ที่นั่งจำกัด, ต้องซื้อคู่บัตรเข้างาน)

| Workshop | ราคา | รอบ | ที่นั่ง |
|---|---|---|---|
| ใช้ AI จัดกลุ่ม lead ให้ sponsor | **฿1,200** | เสาร์ 10:00–12:00 ห้อง W1 | 40 |
| ทำ LINE OA สำหรับงานอีเว้นท์ | **฿890** | เสาร์ 14:00–16:00 ห้อง W2 | 30 |
| วางแผนกระแสเงินสดและทุนหมุนเวียนสำหรับผู้จัดงาน | **฿1,500** | อาทิตย์ 10:00–12:30 ห้อง W1 | 40 |
| Content & Live สำหรับงานอีเว้นท์ | **฿990** | อาทิตย์ 13:30–16:30 ห้อง W2 | 8 (ตั้งให้น้อยเพื่อโชว์สถานะ "ใกล้เต็ม") |

### Add-on

| สินค้า | ราคา | สต็อก | เงื่อนไข |
|---|---|---|---|
| ชุดอาหารกลางวัน (ต่อวัน) | ฿250 | 2,000 | ต้องมีบัตรเข้างาน |
| เสื้อยืดที่ระลึก | ฿390 | 300 | — |
| บัตรจอดรถ 2 วัน | ฿300 | 200 | ต้องมีบัตรเข้างาน |

### โค้ด

| โค้ด | ผล |
|---|---|
| `TEAM10` | ลด 10% บัตร Conference / VIP (200 สิทธิ์) |
| `WORKSHOP300` | ลด ฿300 ต่อ order ที่มี workshop (100 สิทธิ์) |
| `PRESS2026` | ปลดล็อก Press Pass (ไม่มีส่วนลด) |

ค่าธรรมเนียม: `absorb` (ผู้ซื้อจ่ายตามราคาป้าย), แพลตฟอร์ม 3%, ราคารวม VAT 7%, กันที่นั่ง 15 นาที

### Mock payment

- `MockPaymentProvider` (`packages/core/src/payments/mock.ts`) ใช้ interface `PaymentProvider` เดียวกับ gateway จริง
- กดจ่าย → ไปหน้า `/mock-pay/:chargeId` (แสดง PromptPay QR ปลอม / บัตรตัวอย่าง / รายชื่อธนาคาร) → กด **จำลอง: ชำระสำเร็จ** หรือ **ไม่สำเร็จ**
- ผลส่งกลับเป็น webhook ที่เซ็น HMAC-SHA256 แล้วผ่าน `handleWebhook` ตัวเดียวกับของจริง (ตรวจลายเซ็น, กันประมวลผลซ้ำ, จ่ายช้าแล้วจองใหม่หรือคืนเงิน)
- endpoint `POST /api/payments/webhook/mock` เปิดไว้ด้วย สำหรับทดสอบด้วย curl

### ส่วนที่ prototype ทำง่ายกว่าแบบในเอกสาร

- เก็บข้อมูลใน localStorage ของเบราว์เซอร์, ปล่อยที่นั่งที่หมดเวลาแบบ lazy (ตอนมีการเรียกใช้) แทน worker
- ผู้ซื้อกรอกข้อมูลผู้ถือบัตรทุกใบตอน checkout เลย (ยังไม่มีลิงก์ให้เจ้าของบัตรกรอกเอง)
- การส่งข้อมูลให้ sponsor อยู่ในเงื่อนไขที่ติ๊กยอมรับตอนเลือกบัตร (ข้อ 4) ไม่มี checkbox แยกในหน้ากรอกข้อมูล — ใช้กับบัตรของผู้ซื้อเองเท่านั้น บัตรของคนอื่นใน order ถือว่ายังไม่ได้ยินยอม (เจ้าของบัตรต้องยอมรับเอง)
- workshop / add-on ต้องมีบัตรเข้างานใน**order เดียวกัน** (ยังไม่เช็คบัตรที่เคยซื้อไว้ใน order ก่อน)
- ยังไม่มี: ส่ง email จริง, ใบกำกับภาษี PDF, หน้าคืนเงินของ organizer, payout (เช็คอิน / บูธ / sponsor / dashboard มีแล้ว — ดู README)
