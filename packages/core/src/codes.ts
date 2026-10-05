// รหัสอ่านง่าย (ticket code / order code) และ QR token ที่เซ็นด้วย Ed25519 (@noble/ed25519 — ใช้ได้ทั้ง server และเบราว์เซอร์)
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { fromBase64url, randomBytes, sha256Hex, toBase64url, utf8 } from "./crypto";

ed.hashes.sha512 = sha512; // เปิดใช้ฟังก์ชัน sync

// Crockford base32 — ตัด I, L, O, U ออกกันอ่านผิดหน้างาน
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function readableCode(prefix: string): string {
  let s = "";
  for (const b of randomBytes(8)) s += ALPHABET[b & 31];
  return `${prefix}-${s.slice(0, 4)}-${s.slice(4, 8)}`;
}

export function newAccessToken(): string {
  return toBase64url(randomBytes(24));
}

export function hashToken(token: string): string {
  return sha256Hex(token);
}

export interface QrKeys {
  secretKey: Uint8Array;
  publicKey: Uint8Array;
}

// prototype: สร้างคู่กุญแจเอง — ของจริงต้องเก็บ private key ต่องานใน KMS
export function generateQrKeys(): QrKeys {
  const { secretKey, publicKey } = ed.keygen();
  return { secretKey, publicKey };
}

export function exportQrKeys(keys: QrKeys): { secretKey: string; publicKey: string } {
  return { secretKey: toBase64url(keys.secretKey), publicKey: toBase64url(keys.publicKey) };
}

export function importQrKeys(raw: { secretKey: string; publicKey: string }): QrKeys {
  return { secretKey: fromBase64url(raw.secretKey), publicKey: fromBase64url(raw.publicKey) };
}

function uuidToB64(id: string): string {
  const hex = id.replaceAll("-", "");
  return toBase64url(Uint8Array.from({ length: 16 }, (_, i) => parseInt(hex.slice(i * 2, i * 2 + 2), 16)));
}

// รูปแบบตาม ARCHITECTURE.md §3: EV1.<event_short>.<attendee_id>.<qr_version>.<signature>
export function signTicketQr(keys: QrKeys, eventShort: string, attendeeId: string, qrVersion: number): string {
  const payload = `EV1.${eventShort}.${uuidToB64(attendeeId)}.${qrVersion}`;
  return `${payload}.${toBase64url(ed.sign(utf8(payload), keys.secretKey))}`;
}

// เครื่องสแกนตรวจได้เองด้วย public key (ไม่ต้องต่อเน็ต)
export function verifyTicketQr(publicKey: Uint8Array, token: string): boolean {
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  try {
    return ed.verify(fromBase64url(token.slice(i + 1)), utf8(token.slice(0, i)), publicKey);
  } catch {
    return false;
  }
}
