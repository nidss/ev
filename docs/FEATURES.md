# Event Management Platform — Feature Plan

## Context
จากคลิปประชุม (2026-10-02): มีงาน event ~8,000 คน (ไทย+ต่างชาติ) → เสนอทำโปรแกรม event management ของเราเอง
เพื่อล็อกลูกค้าผู้จัดงาน ซึ่งเชื่อมกับธุรกิจปล่อยกู้ทุนหมุนเวียนให้ผู้จัด event ที่มีอยู่แล้ว
คุณค่าหลัก: (1) ลงทะเบียน/เช็คอินคนจำนวนมาก (2) QR ที่บูธ sponsor → ส่ง lead data ที่สนใจจริงให้ sponsor
แนวคิด: ยอมขาดทุนช่วงแรกได้ ให้ระบบดึงผู้จัดงานเข้ามา แล้วหารายได้ทีหลัง
โฟลเดอร์ `D:\event manament` ยังว่างอยู่ — งานนี้คือออกแบบ feature ยังไม่เขียนโค้ด

## ผู้ใช้ 4 กลุ่ม
1. **Organizer** (ผู้จัดงาน) — ลูกค้าหลัก / ผู้กู้
2. **Attendee** (ผู้เข้างาน) — ไทย + ต่างชาติ
3. **Sponsor / Exhibitor** (เจ้าของบูธ) — ผู้รับ lead
4. **Staff** (หน้างาน) — เช็คอิน, ดูแลบูธ
(+ Admin ฝั่งเรา)

## Feature — Phase 1: MVP (ให้งาน 8,000 คนรันได้)

### A. Event setup (Organizer)
- สร้างงาน: ชื่อ วันเวลา สถานที่ ผังงาน/แผนที่บูธ
- ประเภทบัตร (free / VIP / staff / press) + จำนวนจำกัด
- ฟอร์มลงทะเบียนปรับฟิลด์ได้ (ชื่อ, บริษัท, ตำแหน่ง, ความสนใจ, สัญชาติ)
- เพิ่ม sponsor/บูธ → ระบบออก QR ประจำบูธอัตโนมัติ

### B. Attendee registration
- หน้าลงทะเบียน **หลายภาษา** (TH/EN + ภาษาเพิ่มได้), รองรับ passport แทนบัตร ปชช.
- **PDPA consent** แยก checkbox: "ยินยอมให้แชร์ข้อมูลกับ sponsor ที่ฉันสแกน"
- ได้ **e-ticket QR ส่วนตัว** ทาง email / LINE / Add to Wallet
- import รายชื่อจาก Excel (กรณีเชิญแบบ list)

### C. Check-in หน้างาน (Staff)
- แอป/เว็บสแกน QR ผู้เข้างาน ใช้หลายจุดพร้อมกัน
- **ทำงาน offline ได้** แล้ว sync ทีหลัง (เน็ตหน้างานคนเยอะมักล่ม)
- walk-in ลงทะเบียนหน้างาน, พิมพ์ badge (มี QR) ได้
- dashboard จำนวนคนเข้า real-time

### D. Sponsor lead capture ⭐ (หัวใจของ product)
สองทางให้เลือก:
- **Attendee สแกน QR บูธ** (ด้วยมือถือตัวเอง) → แสดงหน้า sponsor + ปุ่ม "สนใจ / ขอข้อมูลเพิ่ม"
- **Staff บูธสแกน badge ผู้เข้างาน** (lead retrieval) → ใส่โน้ต/ให้คะแนน hot-warm-cold
- Sponsor portal: ดู lead ของบูธตัวเอง real-time, export CSV/Excel หลังงาน
- ส่ง lead ให้เฉพาะคนที่ consent แล้วเท่านั้น

### E. Organizer dashboard / report
- ยอดลงทะเบียน vs เข้างานจริง, แยกตามประเภทบัตร/สัญชาติ
- traffic ต่อบูธ (จำนวนสแกน) → ใช้ขาย sponsor งานหน้า
- post-event report ส่ง sponsor อัตโนมัติ

## Phase 2: เพิ่มมูลค่า / หารายได้
- **Gamification**: สแกนครบ N บูธ → ลุ้นรางวัล (ดันคนเดินบูธ = lead มากขึ้น)
- Agenda / session + ลงทะเบียนเข้า session, เช็คอินรายห้อง
- ขายบัตรออนไลน์ (payment gateway, PromptPay)
- LINE OA integration: แจ้งเตือน, ส่งบัตร, survey หลังงาน
- Survey / NPS หลังงาน
- Lead qualification ด้วย AI: สรุปความสนใจ, จัดกลุ่ม lead ให้ sponsor

## Phase 3: เชื่อมธุรกิจปล่อยกู้ (moat ของเรา)
- **Budget & expense tracking** ให้ organizer: รายการจ่ายซัพพลายเออร์, รายรับ sponsor/บัตร
- **ขอทุนหมุนเวียนในระบบ**: ข้อมูลงาน (sponsor สัญญา, ยอดขายบัตร, ประวัติงานเก่า) ใช้เป็นข้อมูลประกอบการพิจารณาสินเชื่อ
- จ่ายซัพพลายเออร์ผ่านระบบ + รับเงิน sponsor เข้าระบบ → หักชำระคืนอัตโนมัติ
- credit profile ของ organizer จากประวัติงานบนแพลตฟอร์ม

## โมเดลรายได้ (ตัวเลือก)
- ฟรีสำหรับ organizer ช่วงแรก (ตามแนวคิด "ยอมขาดทุน")
- เก็บ sponsor: ค่า lead package ต่อบูธ
- ค่าธรรมเนียมขายบัตร %
- ดอกเบี้ยจากทุนหมุนเวียน (รายได้หลักจริง)

## ข้อควรระวัง
- PDPA: consent ชัด, log การแชร์ข้อมูล, ลบข้อมูลตามกำหนด
- รับโหลด 8,000 คน: peak ช่วงเปิดประตู → check-in ต้องเร็ว + offline
- ต่างชาติ: หลายภาษา, ไม่บังคับเบอร์ไทย

## ขั้นถัดไป (หลังอนุมัติ)
- ยืนยันขอบเขต MVP กับ "ทิวา"/ผู้จัดงาน + วันงานจริง (กำหนด deadline)
- เลือก tech stack แล้วเริ่ม scaffold โปรเจกต์ใน `D:\event manament`

## Verification
- ทดสอบ flow ครบ: สร้างงาน → ลงทะเบียน → เช็คอิน → สแกนบูธ → sponsor export lead
- load test check-in/registration ที่ ~8,000 users, peak ~1,000 สแกน/นาที
- ทดสอบ offline check-in แล้ว sync ไม่มีข้อมูลซ้ำ
