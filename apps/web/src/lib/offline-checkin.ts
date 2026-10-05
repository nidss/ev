// ส่วนของเครื่องสแกนที่ทำงานได้ตอนเน็ตหลุด: เก็บรายชื่อและคิวการสแกนไว้ในเครื่อง + ตรวจลายเซ็น QR ในเครื่อง
import { fromBase64url, verifyTicketQr } from "@ev/core";
import type { SnapshotAttendee, SnapshotCheckpoint } from "@ev/core/checkin-rules";

export interface Snapshot {
  eventShort: string;
  qrPublicKey: string;
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

// ตรวจลายเซ็น QR ในเครื่องด้วย public key ของงาน (ไม่ต้องต่อเน็ต)
export function verifyQrOffline(publicKeyB64url: string, token: string): boolean {
  return verifyTicketQr(fromBase64url(publicKeyB64url), token);
}
