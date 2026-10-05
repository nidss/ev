// รหัสอ่านง่าย (ticket code / order code) และ QR token ที่เซ็นด้วย Ed25519
import { createHash, generateKeyPairSync, randomBytes, sign, verify, type KeyObject } from "node:crypto";

// Crockford base32 — ตัด I, L, O, U ออกกันอ่านผิดหน้างาน
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function readableCode(prefix: string): string {
  const bytes = randomBytes(8);
  let s = "";
  for (const b of bytes) s += ALPHABET[b & 31];
  return `${prefix}-${s.slice(0, 4)}-${s.slice(4, 8)}`;
}

export function newAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface QrKeys {
  privateKey: KeyObject;
  publicKey: KeyObject;
}

// prototype: สร้างคู่กุญแจใหม่ทุกครั้งที่ start — ของจริงต้องเก็บ private key ต่องานใน KMS
export function generateQrKeys(): QrKeys {
  return generateKeyPairSync("ed25519");
}

function uuidToB64(id: string): string {
  return Buffer.from(id.replaceAll("-", ""), "hex").toString("base64url");
}

// รูปแบบตาม ARCHITECTURE.md §3: EV1.<event_short>.<attendee_id>.<qr_version>.<signature>
export function signTicketQr(keys: QrKeys, eventShort: string, attendeeId: string, qrVersion: number): string {
  const payload = `EV1.${eventShort}.${uuidToB64(attendeeId)}.${qrVersion}`;
  const sig = sign(null, Buffer.from(payload), keys.privateKey).toString("base64url");
  return `${payload}.${sig}`;
}

export function verifyTicketQr(publicKey: KeyObject, token: string): boolean {
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const sig = Buffer.from(token.slice(i + 1), "base64url");
  return verify(null, Buffer.from(payload), publicKey, sig);
}
