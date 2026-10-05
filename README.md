# EV — Event Management Platform

ระบบจัดงานสำหรับงานคนจำนวนมาก (ไทย + ต่างชาติ): ลงทะเบียน เช็คอินหน้างาน และเก็บ lead ให้ sponsor ด้วย QR และสายรัดข้อมือ RFID
โดยแชร์ข้อมูลเฉพาะคนที่ยินยอมตาม PDPA

**Demo:** https://nidss.github.io/ev/

## Demo (`demo/`)

เว็บ prototype ที่คลิกได้ครบ flow ไม่มี server ข้อมูลทั้งหมดเป็นข้อมูลสมมติและเก็บใน `localStorage` ของเบราว์เซอร์ที่เปิด
เปิดหลายแท็บพร้อมกันได้ (เช่น แท็บประตู + แท็บ dashboard) ตัวเลขจะอัปเดตตามกัน

| บทบาท | หน้า | ทำอะไรได้ |
|---|---|---|
| ผู้เข้างาน | `#/register`, `#/t/<code>` | ลงทะเบียน TH/EN, PDPA consent, e-ticket QR, ถอนความยินยอม |
| ผู้เข้างานที่บูธ | `#/b/<slug>` | สแกน QR บูธด้วยกล้องมือถือ แล้วกด "สนใจ" / "ขอข้อมูลเพิ่ม" |
| Staff ประตู | `#/checkin` | สแกน QR (กล้อง / เครื่องยิงบาร์โค้ด / พิมพ์), ค้นชื่อ, ผูกสายรัด RFID, walk-in, พิมพ์ badge, จำลองเน็ตหลุดแล้ว sync |
| Staff บูธ | `#/booth` | แตะสายรัด RFID หรือสแกน badge, ให้คะแนน hot/warm/cold + โน้ต |
| Sponsor | `#/sponsor` | ดู lead เฉพาะคนที่ยินยอม, สถิติบูธ, export CSV (บันทึกทุกครั้งเป็นหลักฐาน PDPA) |
| ผู้จัดงาน | `#/org` | Dashboard real-time, รายชื่อ + import CSV, QR ประจำบูธ, ตั้งค่างานและโควตาบัตร |

สิ่งที่ demo แสดงให้เห็นจริง:

- **QR บัตรมีลายเซ็น** — QR ที่ปลอมหรือถูกแก้จะถูกปฏิเสธก่อนค้นรายชื่อ และออกบัตรใหม่แล้ว QR เก่าใช้ไม่ได้
  (demo ใช้ HMAC-SHA256 ผ่าน WebCrypto; ระบบจริงใช้ Ed25519 ให้เครื่องสแกนตรวจด้วย public key)
- **Offline check-in** — ติ๊ก "จำลองเน็ตหลุด" การสแกนจะเก็บในเครื่องก่อน แล้ว sync ทีหลัง โดยส่งซ้ำ 2 รอบเพื่อพิสูจน์ว่าไม่มีข้อมูลซ้ำ
- **RFID** — เครื่องอ่าน RFID / บาร์โค้ดแบบ USB ที่ทำงานเหมือนคีย์บอร์ดใช้กับช่องกรอกได้ทันที หรือกดปุ่ม "จำลอง"
- **PDPA** — sponsor เห็นตัวบุคคลเฉพาะคนที่ยินยอม คนที่ไม่ยินยอมนับเป็น traffic เท่านั้น

รันในเครื่อง: เปิดโฟลเดอร์ `demo/` ด้วย static server ใดก็ได้ เช่น `npx serve demo` หรือ `python -m http.server -d demo`
(ต้องเปิดผ่าน `http://localhost` หรือ HTTPS เพราะกล้องและ WebCrypto ใช้กับ `file://` ไม่ได้)

## เอกสาร

- [docs/FEATURES.md](docs/FEATURES.md) — feature และ phase ของ product
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — tech stack และ data model ของระบบจริง (Next.js + PostgreSQL + Redis)

## Deploy

Push เข้า `main` แล้ว GitHub Actions (`.github/workflows/pages.yml`) จะ deploy โฟลเดอร์ `demo/` ขึ้น GitHub Pages
ครั้งแรกต้องตั้ง **Settings → Pages → Source = GitHub Actions** หนึ่งครั้ง
