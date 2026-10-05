// "server" ของ prototype ที่รันในเบราว์เซอร์ (GitHub Pages เป็น static hosting ไม่มี server)
// - business logic ทั้งหมดมาจาก @ev/core ชุดเดียวกับที่จะใช้บน server จริง
// - สถานะเก็บใน localStorage ใช้ร่วมกันทุกแท็บในเบราว์เซอร์เดียวกัน (แท็บอื่นแก้ → แท็บนี้อัปเดตทันที)
// - คนละเครื่อง / คนละเบราว์เซอร์ = ข้อมูลคนละชุด
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  createMockCatalog,
  exportQrKeys,
  generateQrKeys,
  importQrKeys,
  MockPaymentProvider,
  OnsiteService,
  restoreStore,
  seedDemo,
  serializeStore,
  TicketingService,
  type MockCharge,
} from "@ev/core";

export interface Backend {
  ticketing: TicketingService;
  onsite: OnsiteService;
  payments: MockPaymentProvider;
}

interface Saved {
  v: 1;
  store: string;
  keys: { secretKey: string; publicKey: string };
  charges: MockCharge[];
}

const STORAGE_KEY = "ev-prototype-state-v1";
// secret ของ mock gateway / cookie บูธ — prototype ฝั่งเบราว์เซอร์จึงไม่ใช่ความลับจริง
const MOCK_SECRET = "browser-prototype-mock-secret";
export const ATTENDEE_SECRET = "browser-prototype-attendee-secret";

let current: Backend | null = null;
let initializing: Promise<Backend> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function build(saved: Saved | null): Backend {
  const payments = new MockPaymentProvider({ secret: MOCK_SECRET, payPageBaseUrl: "/mock-pay" });
  if (saved) payments.importCharges(saved.charges);
  const ticketing = new TicketingService({
    catalog: createMockCatalog(),
    payments,
    baseUrl: "",
    store: saved ? restoreStore(saved.store) : undefined,
    qrKeys: saved ? importQrKeys(saved.keys) : generateQrKeys(),
  });
  return { ticketing, onsite: new OnsiteService(ticketing), payments };
}

function readSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Saved) : null;
    return parsed?.v === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function notify() {
  version++;
  listeners.forEach((l) => l());
}

export function persist() {
  if (!current) return;
  const saved: Saved = {
    v: 1,
    store: serializeStore(current.ticketing.store),
    keys: exportQrKeys(current.ticketing.qrKeys),
    charges: current.payments.exportCharges(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // localStorage เต็ม / ใช้ไม่ได้ — ข้อมูลยังอยู่ใน memory ของแท็บนี้
  }
  notify();
}

export function getBackend(): Promise<Backend> {
  if (current) return Promise.resolve(current);
  if (!initializing) {
    initializing = (async () => {
      const saved = readSaved();
      const b = build(saved);
      current = b;
      if (!saved) {
        await seedDemo(b.ticketing, b.onsite, b.payments);
        persist();
      }
      window.addEventListener("storage", (e) => {
        // แท็บอื่นเปลี่ยนข้อมูล → โหลดใหม่
        if (e.key !== STORAGE_KEY) return;
        current = build(readSaved());
        notify();
      });
      return b;
    })();
  }
  return initializing;
}

// ล้างข้อมูลทั้งหมดแล้วสร้างข้อมูลตัวอย่างใหม่
export async function resetDemo() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  const b = build(null);
  current = b;
  await seedDemo(b.ticketing, b.onsite, b.payments);
  persist();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

// hook: คืน backend เมื่อพร้อม และ re-render ทุกครั้งที่ข้อมูลเปลี่ยน (รวมจากแท็บอื่น)
export function useBackend(): Backend | null {
  const [ready, setReady] = useState(current !== null);
  useEffect(() => {
    if (!ready) void getBackend().then(() => setReady(true));
  }, [ready]);
  useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
  return ready ? current : null;
}

// สำหรับหน้าที่ต้องการให้ "เวลา" ขยับเอง (เช่น ปล่อยที่นั่งที่หมดเวลา) — re-render ทุก ms
export function useTick(ms: number) {
  const [, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}
