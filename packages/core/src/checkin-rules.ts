// กฎการเช็คอินแบบไม่พึ่ง Node — ใช้ร่วมกันทั้ง server และเครื่องสแกนในโหมดออฟไลน์ (เบราว์เซอร์)
// ห้าม import node:crypto หรือโมดูลที่ใช้ Node ในไฟล์นี้
import type { CheckinResult, CheckpointKind, I18n } from "./types";

// ข้อมูลผู้เข้างานที่เครื่องสแกนโหลดไปเก็บ (เฉพาะที่จำเป็นต่อการเช็คอิน)
export interface SnapshotAttendee {
  id: string;
  ticketCode: string;
  rfidUid: string | null;
  qrVersion: number;
  firstName: string;
  lastName: string;
  company: string | null;
  ticketTypeId: string;
  ticketTypeName: I18n;
  slotDate: string | null; // null = ใช้ได้ทุกวันของงาน
  slotLabel: I18n | null;
  status: "registered" | "cancelled" | "refunded";
  entryCheck: I18n | null;
  firstCheckedInAt: string | null;
}

export interface SnapshotCheckpoint {
  id: string;
  name: I18n;
  kind: CheckpointKind;
  allowedTicketTypeIds: string[] | null;
}

export type ParsedCode =
  | { kind: "qr"; token: string; eventShort: string; attendeeId: string; qrVersion: number }
  | { kind: "ticket_code"; code: string }
  | { kind: "rfid"; uid: string }
  | { kind: "garbage"; raw: string };

const TICKET_CODE = /^EV-[0-9A-Z]{4}-[0-9A-Z]{4}$/;
const RFID = /^([0-9A-F]{2}:){3,9}[0-9A-F]{2}$/;

// แยกว่าสิ่งที่สแกน/พิมพ์มาคือ QR บัตร, รหัสบัตร หรือ UID สายรัด RFID
export function parseScan(raw: string): ParsedCode {
  const text = raw.trim();
  if (text.startsWith("EV1.")) {
    const parts = text.split(".");
    if (parts.length === 5) {
      const id = b64urlToUuid(parts[2]!);
      const version = Number(parts[3]);
      if (id && Number.isInteger(version)) {
        return { kind: "qr", token: text, eventShort: parts[1]!, attendeeId: id, qrVersion: version };
      }
    }
    return { kind: "garbage", raw: text };
  }
  const upper = text.toUpperCase();
  if (TICKET_CODE.test(upper)) return { kind: "ticket_code", code: upper };
  const hex = upper.replace(/[\s-]/g, ":");
  if (RFID.test(hex)) return { kind: "rfid", uid: hex };
  return { kind: "garbage", raw: text };
}

export function findAttendee(parsed: ParsedCode, attendees: Iterable<SnapshotAttendee>): SnapshotAttendee | null {
  for (const a of attendees) {
    if (parsed.kind === "qr" && a.id === parsed.attendeeId) return a;
    if (parsed.kind === "ticket_code" && a.ticketCode === parsed.code) return a;
    if (parsed.kind === "rfid" && a.rfidUid === parsed.uid) return a;
  }
  return null;
}

export type Evaluation = CheckinResult | "needs_entry_check";

// ตัดสินผลการสแกน 1 ครั้ง — "needs_entry_check" แปลว่ายังไม่บันทึก รอ staff ยืนยันว่าตรวจเอกสารแล้ว
export function evaluateCheckin(input: {
  parsed: ParsedCode;
  attendee: SnapshotAttendee | null;
  checkpoint: SnapshotCheckpoint;
  admissionTicketTypeIds: string[]; // บัตรเข้างาน (ใช้กับ checkpoint ที่ allowedTicketTypeIds = null)
  operatingDate: string;
  qrSignatureValid: boolean | null; // null = ตรวจไม่ได้ (เช่น เบราว์เซอร์ไม่รองรับ)
  acceptedBefore: boolean; // เคยผ่านจุดนี้แล้วในวันเดียวกัน
  entryCheckConfirmed: boolean | null;
}): Evaluation {
  const { parsed, attendee: a, checkpoint } = input;
  if (parsed.kind === "garbage") return "unknown";
  if (parsed.kind === "qr" && input.qrSignatureValid === false) return "invalid_qr";
  if (!a) return "unknown";
  if (parsed.kind === "qr" && parsed.qrVersion !== a.qrVersion) return "invalid_qr"; // บัตรถูกออกใหม่แล้ว
  if (a.status !== "registered") return "cancelled";
  const allowed = checkpoint.allowedTicketTypeIds ?? input.admissionTicketTypeIds;
  if (!allowed.includes(a.ticketTypeId)) return "wrong_checkpoint";
  if (a.slotDate && a.slotDate !== input.operatingDate) return "wrong_day";
  if (input.acceptedBefore) return "already_in";
  if (a.entryCheck && input.entryCheckConfirmed === null) return "needs_entry_check";
  if (input.entryCheckConfirmed === false) return "entry_check_failed";
  return "accepted";
}

export function acceptedKey(attendeeId: string, checkpointId: string, operatingDate: string): string {
  return `${attendeeId}|${checkpointId}|${operatingDate}`;
}

function b64urlToUuid(s: string): string | null {
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
    if (bin.length !== 16) return null;
    const hex = Array.from(bin, (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return null;
  }
}
