// Ticket QR payload: EV1.<event>.<ticketCode>.<qrVersion>.<signature>
// The real system signs with Ed25519 so scanners verify offline with a public key.
// This demo uses HMAC-SHA256 (WebCrypto) to show the same check: a forged or edited
// QR fails before any lookup happens.
import { store } from './store.js';

const enc = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function key() {
  return crypto.subtle.importKey('raw', enc.encode(store.get().event.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
async function sig(payload) {
  return b64url(await crypto.subtle.sign('HMAC', await key(), enc.encode(payload))).slice(0, 16);
}

export async function signTicket(a) {
  const payload = `EV1.${store.get().event.short}.${a.ticketCode}.${a.qrVersion}`;
  return `${payload}.${await sig(payload)}`;
}

// Returns { ok, code, version } or { ok:false, reason }
export async function verifyTicket(raw) {
  const text = raw.trim();
  const parts = text.split('.');
  if (parts.length !== 5 || parts[0] !== 'EV1') return { ok: false, reason: 'format' };
  const [, ev, code, v, s] = parts;
  if (ev !== store.get().event.short) return { ok: false, reason: 'other_event' };
  if (s !== await sig(parts.slice(0, 4).join('.'))) return { ok: false, reason: 'signature' };
  return { ok: true, code, version: Number(v) };
}
