// ข้อมูลตัวอย่างสำหรับหน้า dashboard / sponsor — ชื่อคนและบริษัททั้งหมดเป็นชื่อสมมติ
// สร้างผ่าน API จริงของ TicketingService / OnsiteService เพื่อให้ข้อมูลสอดคล้องกันทุกตาราง
import type { OnsiteService } from "./onsite";
import type { MockPaymentProvider } from "./payments/mock";
import type { TicketingService } from "./ticketing";
import type { InterestLevel, LeadRating, OrderLineInput } from "./types";

const TH_FIRST = ["สมชาย", "สุดา", "ธนพล", "กมลวรรณ", "ปิยะ", "วรรณา", "ณัฐวุฒิ", "อรอุมา", "ศักดิ์ชัย", "พิมพ์ชนก", "ภานุ", "จิราพร", "เอกชัย", "นภัสสร", "วีรยุทธ", "ชลธิชา", "กิตติ", "มณีรัตน์", "อนุชา", "ศิริพร"];
const TH_LAST = ["ใจดี", "ศรีสุข", "วงศ์ทอง", "บุญมา", "แสงอรุณ", "พงษ์ไพร", "รัตนกุล", "ทองดี", "สายสุวรรณ", "เจริญผล", "มั่นคง", "อินทร์แก้ว"];
const INTL: [string, string][] = [
  ["Emma", "Tanaka"], ["Liam", "Nguyen"], ["Mei", "Chen"], ["Arjun", "Patel"], ["Sofia", "Rossi"], ["Noah", "Kim"],
  ["Aisha", "Rahman"], ["Lucas", "Martin"], ["Hana", "Sato"], ["Ethan", "Lim"], ["Olivia", "Brown"], ["Daniel", "Schmidt"],
];
const COMPANIES = ["Siam Retail Co.", "Golden Grain Foods", "Krungthep Media", "Andaman Travel", "Mekong Trading", "Sukhumvit Partners", "Chao Phraya Events", "Lanna Creative", "Isan Agro", "Riverside Expo Co."];
const TITLES = ["Marketing Manager", "CEO", "Procurement Lead", "Event Producer", "Sales Director", "Founder", "Operations Manager", "Brand Executive"];

export interface SeedOptions {
  orders?: number;
  seed?: number;
}

// คืนจำนวน order ที่สร้างสำเร็จ — order ที่สร้างไม่ได้ (เช่น หมดช่วงขายแล้ว) ข้ามไป
export async function seedDemo(
  ticketing: TicketingService,
  onsite: OnsiteService,
  payments: MockPaymentProvider,
  opts: SeedOptions = {},
): Promise<number> {
  const r = rng(opts.seed ?? 20261121);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!;
  const slug = ticketing.catalog.event.slug;
  const [day1, day2] = onsite.eventDates();
  let made = 0;
  let n = 0;

  const person = () => {
    n++;
    const intl = r() < 0.25;
    const [firstName, lastName] = intl ? pick(INTL) : [pick(TH_FIRST), pick(TH_LAST)];
    return {
      firstName,
      lastName,
      email: `guest${String(n).padStart(4, "0")}@example.com`,
      company: pick(COMPANIES),
      jobTitle: pick(TITLES),
      nationality: intl ? pick(["JP", "VN", "CN", "IN", "SG", "MY", "GB", "DE"]) : "TH",
    };
  };

  const total = opts.orders ?? 180;
  for (let i = 0; i < total; i++) {
    const roll = r();
    const lines: OrderLineInput[] = [];
    let unlockCode: string | null = null;
    if (roll < 0.62) {
      lines.push({ kind: "ticket", ticketTypeId: "tt_expo", slotId: r() < 0.6 ? "slot_day1" : "slot_day2", quantity: 1 });
    } else if (roll < 0.9) {
      lines.push({ kind: "ticket", ticketTypeId: "tt_conf", quantity: 1 });
      if (r() < 0.35) lines.push({ kind: "ticket", ticketTypeId: pick(["tt_ws_ai", "tt_ws_line", "tt_ws_fin"]), quantity: 1 });
      if (r() < 0.3) lines.push({ kind: "addon", productId: "pr_lunch", quantity: 1 });
    } else if (roll < 0.97) {
      lines.push({ kind: "ticket", ticketTypeId: "tt_vip", quantity: 1 });
      if (r() < 0.4) lines.push({ kind: "ticket", ticketTypeId: "tt_ws_fin", quantity: 1 });
    } else {
      lines.push({ kind: "ticket", ticketTypeId: "tt_press", quantity: 1 });
      unlockCode = "PRESS2026";
    }
    try {
      const { order, accessToken } = ticketing.createOrder(slug, { acceptTerms: true, lines, unlockCode });
      const buyer = person();
      const holders = order.items
        .filter((it) => it.kind === "ticket")
        .map((it) => ({ orderItemId: it.id, index: 0, ...buyer }));
      const res = await ticketing.submitCheckout(order.id, accessToken, {
        buyer: { firstName: buyer.firstName, lastName: buyer.lastName, email: buyer.email, phone: null, nationality: buyer.nationality },
        holders,
        consents: { shareWithSponsors: r() < 0.68, organizerMarketing: r() < 0.4 },
        paymentMethod: pick(["promptpay", "card", "mobile_banking"] as const),
      });
      if (res.status === "redirect") {
        const view = ticketing.getOrder(order.id, accessToken);
        const hook = payments.simulate(view.payments[0]!.providerChargeId, "succeeded");
        await ticketing.handleWebhook(hook.headers, hook.body);
      }
      made++;
    } catch {
      // ข้าม order ที่สร้างไม่ได้
    }
  }

  // เช็คอินวันแรก: ประตู A/B ช่วง 08:30–13:30 ประมาณ 70% ของคนที่มีบัตรวันนั้น
  const attendees = [...ticketing.store.attendees.values()];
  const admission = new Set(onsite.admissionTicketTypeIds());
  const at = (date: string, minutesFrom0830: number) =>
    new Date(Date.parse(`${date}T08:30:00+07:00`) + minutesFrom0830 * 60_000).toISOString();
  let scanNo = 0;
  const scanId = () => `00000000-0000-4000-8000-${String(++scanNo).padStart(12, "0")}`;
  const checkedIn: typeof attendees = [];
  for (const a of attendees) {
    if (!admission.has(a.ticketTypeId)) continue;
    const snap = onsite.snapshotAttendee(a);
    if (snap.slotDate && snap.slotDate !== day1) continue;
    if (r() > 0.7) continue;
    // คนเยอะช่วงเปิดประตู แล้วค่อยๆ ลดลง
    const minute = Math.floor(Math.pow(r(), 1.8) * 300);
    const res = onsite.checkIn({
      id: scanId(),
      code: r() < 0.85 ? a.qrToken : a.ticketCode,
      checkpointId: r() < 0.6 ? "cp_gate_a" : "cp_gate_b",
      operatingDate: day1!,
      entryCheckConfirmed: true,
      deviceName: r() < 0.5 ? "Gate A - iPad 1" : "Gate B - iPad 2",
      scannedAt: at(day1!, minute),
    });
    if (res.result === "accepted") {
      checkedIn.push(a);
      // สแกนซ้ำบ้าง (already_in) ให้เห็นในสถิติ
      if (r() < 0.04) {
        onsite.checkIn({ id: scanId(), code: a.qrToken, checkpointId: "cp_gate_a", operatingDate: day1!, deviceName: "Gate A - iPad 1", scannedAt: at(day1!, minute + 20) });
      }
    }
  }
  for (let i = 0; i < 4; i++) {
    onsite.checkIn({ id: scanId(), code: `EV-XXXX-${1000 + i}`, checkpointId: "cp_gate_a", operatingDate: day1!, deviceName: "Gate A - iPad 1", scannedAt: at(day1!, 30 + i * 40) });
  }

  // workshop ของวันแรก
  for (const a of attendees) {
    if (a.ticketTypeId !== "tt_ws_ai" && a.ticketTypeId !== "tt_ws_line") continue;
    if (r() > 0.85) continue;
    onsite.checkIn({
      id: scanId(),
      code: a.qrToken,
      checkpointId: a.ticketTypeId === "tt_ws_ai" ? "cp_room_w1" : "cp_room_w2",
      operatingDate: day1!,
      deviceName: "Workshop door",
      scannedAt: at(day1!, a.ticketTypeId === "tt_ws_ai" ? 80 : 320),
    });
  }

  // สแกนบูธ: คนที่เข้างานแล้วเดินบูธ 0–4 บูธ (บูธใหญ่ได้คนมากกว่า)
  const booths = ticketing.catalog.booths;
  const weights = [5, 4, 3, 2.5, 2, 1.5];
  const ratings: (LeadRating | null)[] = ["hot", "warm", "warm", "cold", null, null];
  for (const a of checkedIn) {
    const visits = Math.floor(r() * 5);
    const seen = new Set<string>();
    for (let v = 0; v < visits; v++) {
      const booth = weightedPick(booths, weights, r);
      if (seen.has(booth.id)) continue;
      seen.add(booth.id);
      const time = at(day1!, 60 + Math.floor(r() * 420));
      if (r() < 0.55) {
        const res = onsite.staffScan({ id: scanId(), boothId: booth.id, code: a.rfidUid ?? a.qrToken, deviceName: `${booth.code} staff`, scannedAt: time });
        const rating = pick(ratings);
        if (res.lead && rating) onsite.updateLead(booth.id, res.lead.id, { rating, notes: rating === "hot" ? "ขอใบเสนอราคา" : "" });
      } else {
        const action: InterestLevel = r() < 0.35 ? "request_info" : r() < 0.6 ? "interested" : "visit";
        onsite.attendeeBoothAction(booth.qrSlug, a.id, action, time);
      }
    }
  }
  void day2;
  return made;
}

function weightedPick<T>(xs: T[], weights: number[], r: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < xs.length; i++) {
    x -= weights[i] ?? 1;
    if (x <= 0) return xs[i]!;
  }
  return xs[xs.length - 1]!;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
