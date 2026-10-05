# EV — Event registration & ticketing

แพลตฟอร์มจัดการงานอีเว้นท์ (ลงทะเบียน, ซื้อบัตร, เช็คอิน, เก็บ lead ให้ sponsor) — แผนและสถาปัตยกรรมอยู่ใน [`docs/`](./docs)

ตอนนี้มี **prototype หน้าลงทะเบียน + ซื้อบัตร** ที่ใช้ราคาบัตร mock และ payment gateway จำลอง (ไม่มีเงินจริง)
รายละเอียดราคาและข้อจำกัดดู [docs/TICKETING.md §12](./docs/TICKETING.md#12-ราคาบัตร-mock-ใช้ใน-prototype)

## โครงสร้าง

```
apps/web/          Next.js 16 (App Router) — หน้างาน, checkout, หน้าบัตร, mock gateway, API
packages/core/     business logic: ราคา, จองที่นั่ง, order, webhook, mock payment, QR (+ unit test)
docs/              FEATURES / ARCHITECTURE / TICKETING
```

## รัน

ต้องมี Node 22+ และ pnpm 10

```bash
pnpm install
pnpm dev            # http://localhost:3000 → เปิดหน้างานตัวอย่างให้อัตโนมัติ
pnpm test           # unit test ของ packages/core
pnpm typecheck
```

ข้อมูลเก็บใน memory — restart server แล้วข้อมูล order/บัตรจะหายหมด

## ลองใช้

1. เลือก **Expo Pass (ฟรี)** → ลงทะเบียน → ได้ e-ticket QR ทันที (ไม่ผ่าน gateway)
2. เลือก **Conference Pass + Workshop + เสื้อ** → ใส่โค้ด `WORKSHOP300` → จ่ายด้วย PromptPay → หน้า mock gateway กด "จำลอง: ชำระสำเร็จ"
3. กด "จำลอง: ชำระไม่สำเร็จ" → กลับไปจ่ายใหม่ได้ก่อนหมดเวลา 15 นาที
4. ใส่โค้ด `PRESS2026` ในช่อง "มีโค้ดจากผู้จัด?" → บัตร Press Pass (ซ่อน) จะโผล่ขึ้นมา
5. ปุ่มมุมขวาบนสลับภาษา ไทย / English

| ตัวแปร | ค่าเริ่มต้น | ใช้ทำอะไร |
|---|---|---|
| `MOCK_PAYMENT_SECRET` | `dev-mock-secret` | secret สำหรับเซ็น webhook ของ mock gateway |
| `APP_BASE_URL` | (ว่าง = ลิงก์ relative) | URL ที่ gateway จริงใช้พาผู้ซื้อกลับมา |
