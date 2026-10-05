// ฟังก์ชันเข้ารหัสที่ใช้ได้ทั้งใน Node และเบราว์เซอร์ (ไม่พึ่ง node:crypto) — prototype รันทั้งหมดในเบราว์เซอร์ได้
import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

const enc = new TextEncoder();

export function randomUUID(): string {
  return globalThis.crypto.randomUUID();
}

export function randomBytes(n: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(n));
}

export function sha256Hex(text: string): string {
  return bytesToHex(sha256(enc.encode(text)));
}

export function hmacSha256Hex(secret: string, text: string): string {
  return bytesToHex(hmac(sha256, enc.encode(secret), enc.encode(text)));
}

export function hmacSha256B64url(secret: string, text: string): string {
  return toBase64url(hmac(sha256, enc.encode(secret), enc.encode(text)));
}

// เทียบ string แบบใช้เวลาคงที่ (กัน timing attack ตอนตรวจลายเซ็น)
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function toBase64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function utf8(text: string): Uint8Array {
  return enc.encode(text);
}
