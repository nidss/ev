import { describe, expect, it } from "vitest";
import {
  createMockCatalog,
  evaluateCheckin,
  MockPaymentProvider,
  OnsiteService,
  parseScan,
  seedDemo,
  signAttendeeCookie,
  TicketingService,
  verifyAttendeeCookie,
  type Attendee,
} from "../src";

const SLUG = "bangkok-event-tech-2026";
const DAY1 = "2026-11-21";
const DAY2 = "2026-11-22";

function setup() {
  const payments = new MockPaymentProvider({ secret: "s", payPageBaseUrl: "/mock-pay" });
  const ticketing = new TicketingService({
    catalog: createMockCatalog(),
    payments,
    baseUrl: "",
    now: () => new Date("2026-10-05T10:00:00+07:00"),
  });
  const onsite = new OnsiteService(ticketing);
  let n = 0;
  async function buy(ticketTypeId: string, opts: { slotId?: string; share?: boolean; unlock?: string } = {}): Promise<Attendee> {
    n++;
    const { order, accessToken } = ticketing.createOrder(SLUG, {
      acceptTerms: true,
      unlockCode: opts.unlock ?? null,
      lines: [
        ...(ticketTypeId.startsWith("tt_ws") ? [{ kind: "ticket" as const, ticketTypeId: "tt_conf", quantity: 1 }] : []),
        { kind: "ticket", ticketTypeId, slotId: opts.slotId ?? null, quantity: 1 },
      ],
    });
    const email = `p${n}@example.com`;
    const res = await ticketing.submitCheckout(order.id, accessToken, {
      buyer: { firstName: "P", lastName: `${n}`, email, phone: null, nationality: "TH" },
      holders: order.items.map((it) => ({ orderItemId: it.id, index: 0, firstName: "P", lastName: `${n}`, email, company: "Acme" })),
      consents: { shareWithSponsors: opts.share ?? true, organizerMarketing: false },
      paymentMethod: "card",
    });
    if (res.status === "redirect") {
      const v = ticketing.getOrder(order.id, accessToken);
      const hook = payments.simulate(v.payments[0]!.providerChargeId, "succeeded");
      await ticketing.handleWebhook(hook.headers, hook.body);
    }
    return [...ticketing.store.attendees.values()].find(
      (a) => a.orderId === order.id && a.ticketTypeId === ticketTypeId,
    )!;
  }
  let scan = 0;
  const id = () => `00000000-0000-4000-8000-${String(++scan).padStart(12, "0")}`;
  return { ticketing, onsite, buy, id };
}

describe("parseScan", () => {
  it("recognises QR tokens, ticket codes and RFID UIDs", () => {
    expect(parseScan("ev-ab12-cd34")).toEqual({ kind: "ticket_code", code: "EV-AB12-CD34" });
    expect(parseScan("04 a1 b2 c3")).toEqual({ kind: "rfid", uid: "04:A1:B2:C3" });
    expect(parseScan("hello").kind).toBe("garbage");
    expect(parseScan("EV1.BET26.notbase64.1.sig").kind).toBe("garbage");
  });
});

describe("check-in", () => {
  it("accepts once per checkpoint per day, then reports already_in; idempotent by scan id", async () => {
    const { onsite, buy, id } = setup();
    const a = await buy("tt_conf");
    const input = { id: id(), code: a.qrToken, checkpointId: "cp_gate_a", operatingDate: DAY1, deviceName: "t" };
    expect(onsite.checkIn(input).result).toBe("accepted");
    const again = onsite.checkIn(input);
    expect(again.duplicate).toBe(true);
    expect(onsite.checkIn({ ...input, id: id() }).result).toBe("already_in");
    // บัตร 2 วัน เข้าได้อีกครั้งวันที่สอง
    expect(onsite.checkIn({ ...input, id: id(), operatingDate: DAY2 }).result).toBe("accepted");
    expect(a.firstCheckedInAt).not.toBeNull();
  });

  it("rejects tampered QR, wrong day, wrong checkpoint and unknown codes", async () => {
    const { onsite, buy, id } = setup();
    const expo = await buy("tt_expo", { slotId: "slot_day1" });
    const base = { checkpointId: "cp_gate_a", operatingDate: DAY1, deviceName: "t" };
    const tampered = expo.qrToken.slice(0, -3) + (expo.qrToken.endsWith("AAA") ? "BBB" : "AAA");
    expect(onsite.checkIn({ ...base, id: id(), code: tampered }).result).toBe("invalid_qr");
    expect(onsite.checkIn({ ...base, id: id(), code: expo.qrToken, operatingDate: DAY2 }).result).toBe("wrong_day");
    expect(onsite.checkIn({ ...base, id: id(), code: expo.qrToken, checkpointId: "cp_vip" }).result).toBe("wrong_checkpoint");
    expect(onsite.checkIn({ ...base, id: id(), code: "EV-ZZZZ-ZZZZ" }).result).toBe("unknown");
    expect(onsite.checkIn({ ...base, id: id(), code: expo.ticketCode.toLowerCase() }).result).toBe("accepted");
  });

  it("asks staff to verify press passes before recording", async () => {
    const { onsite, buy, id } = setup();
    const press = await buy("tt_press", { unlock: "PRESS2026" });
    const base = { code: press.qrToken, checkpointId: "cp_gate_a", operatingDate: DAY1, deviceName: "t" };
    const first = onsite.checkIn({ ...base, id: id() });
    expect(first.result).toBe("needs_entry_check");
    expect(first.checkin).toBeNull();
    expect(onsite.checkIn({ ...base, id: id(), entryCheckConfirmed: false }).result).toBe("entry_check_failed");
    expect(onsite.checkIn({ ...base, id: id(), entryCheckConfirmed: true }).result).toBe("accepted");
  });

  it("checks workshop tickets at the right room", async () => {
    const { onsite, buy, id } = setup();
    const ws = await buy("tt_ws_fin"); // ห้อง W1 วันอาทิตย์
    const base = { code: ws.qrToken, deviceName: "t" };
    expect(onsite.checkIn({ ...base, id: id(), checkpointId: "cp_room_w2", operatingDate: DAY2 }).result).toBe("wrong_checkpoint");
    expect(onsite.checkIn({ ...base, id: id(), checkpointId: "cp_room_w1", operatingDate: DAY1 }).result).toBe("wrong_day");
    expect(onsite.checkIn({ ...base, id: id(), checkpointId: "cp_room_w1", operatingDate: DAY2 }).result).toBe("accepted");
  });

  it("syncs an offline queue twice without duplicates and pairs RFID wristbands", async () => {
    const { onsite, buy, id } = setup();
    const a = await buy("tt_vip");
    const b = await buy("tt_conf");
    const queue = [a, b].map((x, i) => ({
      id: id(),
      code: x.qrToken,
      checkpointId: "cp_gate_b",
      operatingDate: DAY1,
      deviceName: "offline",
      scannedAt: `2026-11-21T02:0${i}:00.000Z`,
    }));
    expect(onsite.syncCheckins(queue).map((r) => r.result)).toEqual(["accepted", "accepted"]);
    expect(onsite.syncCheckins(queue).every((r) => r.duplicate)).toBe(true);
    expect(onsite.recentCheckins(DAY1)).toHaveLength(2);

    onsite.pairWristband(a.id, "04 a1 b2 c3");
    expect(onsite.checkIn({ id: id(), code: "04:A1:B2:C3", checkpointId: "cp_vip", operatingDate: DAY1, deviceName: "t" }).result).toBe(
      "accepted",
    );
    expect(() => onsite.pairWristband(b.id, "04:A1:B2:C3")).toThrow(/already paired/);
  });

  it("offline rules give the same answer as the server", async () => {
    const { onsite, buy } = setup();
    const a = await buy("tt_expo", { slotId: "slot_day2" });
    const snap = onsite.snapshot();
    const local = evaluateCheckin({
      parsed: parseScan(a.qrToken),
      attendee: snap.attendees.find((x) => x.id === a.id)!,
      checkpoint: snap.checkpoints.find((c) => c.id === "cp_gate_a")!,
      admissionTicketTypeIds: snap.admissionTicketTypeIds,
      operatingDate: DAY1,
      qrSignatureValid: true,
      acceptedBefore: false,
      entryCheckConfirmed: null,
    });
    expect(local).toBe("wrong_day");
  });
});

describe("booth leads and sponsor portal", () => {
  it("records traffic for everyone but shows only consenting attendees to the sponsor", async () => {
    const { onsite, buy, id } = setup();
    const yes = await buy("tt_conf", { share: true });
    const no = await buy("tt_conf", { share: false });
    const seen = onsite.staffScan({ id: id(), boothId: "bo_1", code: yes.qrToken, deviceName: "B01" });
    expect(seen.consented).toBe(true);
    const hidden = onsite.staffScan({ id: id(), boothId: "bo_1", code: no.qrToken, deviceName: "B01" });
    expect(hidden).toMatchObject({ result: "recorded", consented: false, attendee: null, lead: null });

    onsite.attendeeBoothAction("k7q2mx9a", yes.id, "request_info");
    onsite.attendeeBoothAction("k7q2mx9a", yes.id, "visit"); // ไม่ลดระดับความสนใจ
    onsite.updateLead("bo_1", seen.lead!.id, { rating: "hot", notes: "=HYPERLINK(\"x\")" });

    const view = onsite.sponsorView("sp_1");
    expect(view.stats).toMatchObject({ uniqueVisitors: 2, consentedLeads: 1, notConsented: 1, hot: 1, requestInfo: 1 });
    expect(view.leads[0]!.lead.scanCount).toBe(3);

    const { csv, record } = onsite.exportLeads("sp_1", "sponsor admin");
    expect(record.attendeeIds).toEqual([yes.id]);
    expect(csv).toContain("'=HYPERLINK"); // กัน CSV injection
    expect(csv).not.toContain(no.email!);
    expect(onsite.sponsorView("sp_1").exports).toHaveLength(1);
  });

  it("identifies attendees at a booth by ticket code + email and signs the cookie", async () => {
    const { onsite, buy } = setup();
    const a = await buy("tt_conf");
    expect(onsite.identifyAttendee(a.ticketCode.toLowerCase(), a.email!.toUpperCase()).id).toBe(a.id);
    expect(() => onsite.identifyAttendee(a.ticketCode, "other@example.com")).toThrow();
    const cookie = signAttendeeCookie("secret", a.id);
    expect(verifyAttendeeCookie("secret", cookie)).toBe(a.id);
    expect(verifyAttendeeCookie("secret", cookie.slice(0, -2) + "xx")).toBeNull();
  });
});

describe("dashboard + seed", () => {
  it("seeds consistent demo data and summarises it", async () => {
    const { ticketing, onsite } = setup();
    const payments = (ticketing as unknown as { payments: MockPaymentProvider }).payments;
    const made = await seedDemo(ticketing, onsite, payments, { orders: 120 });
    expect(made).toBeGreaterThan(100);
    const d = onsite.dashboard(DAY1);
    expect(d.totals.registered).toBeGreaterThan(100);
    expect(d.totals.checkedInToday).toBeGreaterThan(30);
    expect(d.totals.checkedInToday).toBeLessThanOrEqual(d.totals.expectedToday);
    expect(d.checkinsByHalfHour.reduce((s, b) => s + b.count, 0)).toBe(
      d.byCheckpoint.filter((c) => c.checkpoint.kind === "entrance").reduce((s, c) => s + c.accepted, 0),
    );
    expect(d.totals.revenueSatang).toBeGreaterThan(0);
    expect(d.booths[0]!.uniqueVisitors).toBeGreaterThan(0);
  });
});

describe("persistence", () => {
  it("round-trips the store and keys through JSON", async () => {
    const { serializeStore, restoreStore, exportQrKeys, importQrKeys, verifyTicketQr } = await import("../src");
    const { ticketing, onsite, buy, id } = setup();
    const a = await buy("tt_conf");
    onsite.checkIn({ id: id(), code: a.qrToken, checkpointId: "cp_gate_a", operatingDate: DAY1, deviceName: "t" });
    const store = restoreStore(serializeStore(ticketing.store));
    expect(store.attendees.get(a.id)?.ticketCode).toBe(a.ticketCode);
    expect(store.checkins.size).toBe(1);
    expect(store.processedWebhookEvents instanceof Set).toBe(true);
    expect(store.eventTaken).toBe(ticketing.store.eventTaken);
    const keys = importQrKeys(exportQrKeys(ticketing.qrKeys));
    expect(verifyTicketQr(keys.publicKey, a.qrToken)).toBe(true);
  });
});
