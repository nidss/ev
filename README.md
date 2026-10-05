# EV — Event Management Platform

ระบบจัดงานสำหรับงานคนจำนวนมาก (ไทย + ต่างชาติ): ลงทะเบียน เช็คอินหน้างาน และเก็บ lead ให้ sponsor ด้วย QR และสายรัดข้อมือ RFID
โดยแชร์ข้อมูลเฉพาะคนที่ยินยอมตาม PDPA

## แอปลงทะเบียน + ซื้อบัตร (`apps/web`, `packages/core`)

แอป Next.js ที่มี server จริง ใช้ราคาบัตร mock (มีทั้งบัตรฟรี บัตรเสียเงิน workshop และ add-on) และ payment gateway จำลอง (ไม่มีเงินจริง)
งานนี้ไม่มีผังที่นั่ง — ความจุนับเป็นจำนวนต่อรอบ/ประเภทบัตร รายละเอียดราคาและข้อจำกัดดู [docs/TICKETING.md §12](docs/TICKETING.md#12-ราคาบัตร-mock-ใช้ใน-prototype)

```
apps/web/          Next.js 16 (App Router) — หน้างาน, checkout, หน้าบัตร, mock gateway, API
packages/core/     business logic: ราคา, จองที่นั่ง, order, webhook, mock payment, QR (+ unit test)
```

ต้องมี Node 22+ และ pnpm 10

```bash
pnpm install
pnpm dev            # http://localhost:3000 → เปิดหน้างานตัวอย่างให้อัตโนมัติ
pnpm test           # unit test ของ packages/core
pnpm typecheck
```

ข้อมูลเก็บใน memory — restart server แล้วข้อมูล order/บัตรจะหายหมด

ขั้นตอนซื้อ (แนว ThaiTicketMajor / Zipevent): หน้างาน → ① ยอมรับเงื่อนไข → ② เลือกรอบ (วัน) → ③ เลือกบัตร → ④ กรอกข้อมูล → ⑤ ตรวจสอบและชำระเงิน

ลองใช้:

1. กด **ซื้อบัตร** → ยอมรับเงื่อนไข → เลือกวันเสาร์ → **Expo Pass (ฟรี)** → กรอกข้อมูล → ยืนยัน → ได้ e-ticket QR ทันที
2. กด **ซื้อบัตร** ของรอบวันอาทิตย์ → **Conference Pass + Workshop การเงิน + เสื้อ** → ขั้นชำระเงินใส่โค้ด `WORKSHOP300` → PromptPay → หน้า mock gateway กด "จำลอง: ชำระสำเร็จ"
3. กด "จำลอง: ชำระไม่สำเร็จ" → กลับไปจ่ายใหม่ได้ก่อนหมดเวลา 15 นาที (ข้อมูลที่กรอกไว้ยังอยู่)
4. ขั้นเลือกบัตร ใส่โค้ด `PRESS2026` ในช่อง "มีโค้ดจากผู้จัด?" → บัตร Press Pass (ซ่อน) จะโผล่ขึ้นมา
5. ปุ่มมุมขวาบนสลับภาษา ไทย / English

| ตัวแปร | ค่าเริ่มต้น | ใช้ทำอะไร |
|---|---|---|
| `MOCK_PAYMENT_SECRET` | `dev-mock-secret` | secret สำหรับเซ็น webhook ของ mock gateway |
| `APP_BASE_URL` | (ว่าง = ลิงก์ relative) | URL ที่ gateway จริงใช้พาผู้ซื้อกลับมา |

## เอกสาร

- [docs/FEATURES.md](docs/FEATURES.md) — feature และ phase ของ product
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — tech stack และ data model ของระบบจริง (Next.js + PostgreSQL + Redis)
- [docs/TICKETING.md](docs/TICKETING.md) — ระบบซื้อบัตร: order, รอบ, การจองที่นั่ง, การชำระเงิน, ราคา mock
