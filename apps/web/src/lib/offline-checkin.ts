// ส่วนของเครื่องสแกนที่ทำงานได้ตอนเน็ตหลุด: เก็บรายชื่อและคิวการสแกนไว้ในเครื่อง + ตรวจลายเซ็น QR ด้วย WebCrypto
import type { SnapshotAttendee, SnapshotCheckpoint } from "@ev/core/checkin-rules";

export interface Snapshot {
  eventShort: string;
  qrPublicKeySpki: string;
  admissionTicketTypeIds: string[];
  checkpoints: SnapshotCheckpoint[];
  attendees: SnapshotAttendee[];
  acceptedKeys: string[];
}

export interface QueuedScan {
  id: string;
  code: string;
  checkpointId: string;
  operatingDate: string;
  entryCheckConfirmed: boolean | null;
  deviceName: string;
  scannedAt: string;
  // ผลที่เครื่องตัดสินเองตอนออฟไลน์ (server จะตัดสินซ้ำตอน sync)
  localResult: string;
  attendeeName: string | null;
}

const QUEUE_KEY = "ev-checkin-queue";
const SNAPSHOT_KEY = "ev-checkin-snapshot";

// localStorage อาจใช้ไม่ได้ (private mode ฯลฯ) — ห่อ try/catch ทุกครั้ง
export function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export const loadQueue = () => load<QueuedScan[]>(QUEUE_KEY, []);
export const saveQueue = (q: QueuedScan[]) => save(QUEUE_KEY, q);
export const loadSnapshot = () => load<Snapshot | null>(SNAPSHOT_KEY, null);
export const saveSnapshot = (s: Snapshot) => save(SNAPSHOT_KEY, s);

let keyCache: { spki: string; key: CryptoKey } | null = null;

// คืน true/false ถ้าตรวจได้, null ถ้าเบราว์เซอร์ไม่รองรับ Ed25519
export async function verifyQrOffline(spkiB64: string, token: string): Promise<boolean | null> {
  try {
    if (!keyCache || keyCache.spki !== spkiB64) {
      const der = Uint8Array.from(atob(spkiB64), (c) => c.charCodeAt(0));
      const key = await crypto.subtle.importKey("spki", der, { name: "Ed25519" }, false, ["verify"]);
      keyCache = { spki: spkiB64, key };
    }
    const i = token.lastIndexOf(".");
    const sigB64 = token.slice(i + 1).replace(/-/g, "+").replace(/_/g, "/");
    const sig = Uint8Array.from(atob(sigB64 + "===".slice((sigB64.length + 3) % 4)), (c) => c.charCodeAt(0));
    return await crypto.subtle.verify({ name: "Ed25519" }, keyCache.key, sig, new TextEncoder().encode(token.slice(0, i)));
  } catch {
    return null;
  }
}
