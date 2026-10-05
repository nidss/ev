// business logic หน้างาน: เช็คอิน, สายรัด RFID, สแกนบูธ / lead, sponsor portal, dashboard ผู้จัด
// ใช้ store และ catalog ชุดเดียวกับ TicketingService
import { constantTimeEqual, hmacSha256B64url, randomUUID, toBase64url } from "./crypto";
import {
  acceptedKey,
  evaluateCheckin,
  findAttendee,
  parseScan,
  type Evaluation,
  type SnapshotAttendee,
  type SnapshotCheckpoint,
} from "./checkin-rules";
import { verifyTicketQr } from "./codes";
import { TicketingError } from "./errors";
import type { TicketingService } from "./ticketing";
import type {
  Attendee,
  Booth,
  Checkin,
  InterestLevel,
  Lead,
  LeadExport,
  LeadRating,
  Sponsor,
} from "./types";

const INTEREST_RANK: Record<InterestLevel, number> = { visit: 0, interested: 1, request_info: 2 };
const RFID = /^([0-9A-F]{2}:){3,9}[0-9A-F]{2}$/;

export interface CheckinInput {
  id: string; // uuid ที่เครื่องสแกนสร้าง
  code: string;
  checkpointId: string;
  operatingDate: string;
  entryCheckConfirmed?: boolean | null;
  deviceName: string;
  scannedAt?: string;
  offline?: boolean;
}

export interface CheckinOutcome {
  result: Evaluation;
  checkin: Checkin | null; // null เมื่อยังไม่บันทึก (needs_entry_check)
  attendee: SnapshotAttendee | null;
  duplicate: boolean; // id นี้เคยบันทึกแล้ว (ส่งซ้ำจากการ sync)
}

export interface VisibleLead {
  lead: Lead;
  boothCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  jobTitle: string | null;
}

export class OnsiteService {
  constructor(private readonly ticketing: TicketingService) {}

  private get store() {
    return this.ticketing.store;
  }
  private get catalog() {
    return this.ticketing.catalog;
  }

  // ---------- ข้อมูลให้เครื่องสแกน ----------

  admissionTicketTypeIds(): string[] {
    return this.catalog.ticketTypes.filter((t) => t.kind !== "workshop").map((t) => t.id);
  }

  eventDates(): string[] {
    return this.ticketing.getEventView(this.catalog.event.slug).rounds.map((r) => r.date);
  }

  snapshotAttendee(a: Attendee): SnapshotAttendee {
    const tt = this.catalog.ticketTypes.find((t) => t.id === a.ticketTypeId)!;
    const slot = a.slotId ? this.catalog.slots.find((s) => s.id === a.slotId)! : null;
    return {
      id: a.id,
      ticketCode: a.ticketCode,
      rfidUid: a.rfidUid,
      qrVersion: a.qrVersion,
      firstName: a.firstName,
      lastName: a.lastName,
      company: a.company,
      ticketTypeId: a.ticketTypeId,
      ticketTypeName: tt.name,
      slotDate: slot ? localDate(slot.startsAt, this.catalog.event.timezone) : null,
      slotLabel: slot?.label ?? null,
      status: a.status,
      entryCheck: tt.entryCheck,
      firstCheckedInAt: a.firstCheckedInAt,
    };
  }

  checkpoints(): SnapshotCheckpoint[] {
    return this.catalog.checkpoints.map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      allowedTicketTypeIds: c.allowedTicketTypeIds,
    }));
  }

  // รายชื่อสำหรับโหมดออฟไลน์ + public key สำหรับตรวจลายเซ็น QR ในเครื่อง
  snapshot() {
    return {
      eventShort: this.catalog.event.shortCode,
      qrPublicKey: toBase64url(this.ticketing.qrKeys.publicKey),
      admissionTicketTypeIds: this.admissionTicketTypeIds(),
      checkpoints: this.checkpoints(),
      attendees: [...this.store.attendees.values()].map((a) => this.snapshotAttendee(a)),
      acceptedKeys: [...this.store.checkins.values()]
        .filter((c) => c.result === "accepted" && c.attendeeId)
        .map((c) => acceptedKey(c.attendeeId!, c.checkpointId, c.operatingDate)),
    };
  }

  // ---------- เช็คอิน ----------

  checkIn(input: CheckinInput): CheckinOutcome {
    const existing = this.store.checkins.get(input.id);
    if (existing) {
      const a = existing.attendeeId ? this.store.attendees.get(existing.attendeeId) : undefined;
      return { result: existing.result, checkin: existing, attendee: a ? this.snapshotAttendee(a) : null, duplicate: true };
    }
    const checkpoint = this.catalog.checkpoints.find((c) => c.id === input.checkpointId);
    if (!checkpoint) throw new TicketingError("not_found", "checkpoint not found");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.operatingDate)) throw new TicketingError("invalid_input", "bad operating date");

    const parsed = parseScan(input.code);
    const all = [...this.store.attendees.values()];
    const raw = parsed.kind === "garbage" ? null : this.findRaw(parsed, all);
    const snap = raw ? this.snapshotAttendee(raw) : null;
    const qrSignatureValid =
      parsed.kind === "qr"
        ? parsed.eventShort === this.catalog.event.shortCode && verifyTicketQr(this.ticketing.qrKeys.publicKey, parsed.token)
        : null;
    const key = raw ? acceptedKey(raw.id, checkpoint.id, input.operatingDate) : null;
    const acceptedBefore =
      key !== null &&
      [...this.store.checkins.values()].some(
        (c) => c.result === "accepted" && c.attendeeId && acceptedKey(c.attendeeId, c.checkpointId, c.operatingDate) === key,
      );

    const result = evaluateCheckin({
      parsed,
      attendee: snap,
      checkpoint,
      admissionTicketTypeIds: this.admissionTicketTypeIds(),
      operatingDate: input.operatingDate,
      qrSignatureValid,
      acceptedBefore,
      entryCheckConfirmed: input.entryCheckConfirmed ?? null,
    });
    if (result === "needs_entry_check") return { result, checkin: null, attendee: snap, duplicate: false };

    const nowIso = new Date().toISOString();
    const checkin: Checkin = {
      id: input.id,
      eventId: this.catalog.event.id,
      attendeeId: raw && result !== "unknown" ? raw.id : null,
      checkpointId: checkpoint.id,
      operatingDate: input.operatingDate,
      deviceName: input.deviceName.slice(0, 60) || "unknown",
      result,
      rawCode: raw ? null : input.code.slice(0, 200),
      scannedAt: input.scannedAt ?? nowIso,
      receivedAt: nowIso,
      offline: input.offline ?? false,
    };
    this.store.checkins.set(checkin.id, checkin);
    if (result === "accepted" && raw && (!raw.firstCheckedInAt || checkin.scannedAt < raw.firstCheckedInAt)) {
      raw.firstCheckedInAt = checkin.scannedAt;
    }
    return { result, checkin, attendee: raw ? this.snapshotAttendee(raw) : null, duplicate: false };
  }

  // รับคิวจากเครื่องที่ออฟไลน์ — ส่งซ้ำได้ ไม่เกิดข้อมูลซ้ำ (id ที่เครื่องสร้าง)
  syncCheckins(inputs: CheckinInput[]): CheckinOutcome[] {
    if (inputs.length > 500) throw new TicketingError("invalid_input", "max 500 scans per batch");
    return [...inputs]
      .sort((a, b) => (a.scannedAt ?? "").localeCompare(b.scannedAt ?? ""))
      .map((i) => this.checkIn({ ...i, offline: true }));
  }

  recentCheckins(operatingDate: string, limit = 15) {
    return [...this.store.checkins.values()]
      .filter((c) => c.operatingDate === operatingDate)
      // เรียงตามเวลาที่ server ได้รับ (คิวออฟไลน์ที่ sync ทีหลังจะขึ้นบนสุดตอนเข้ามา)
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
      .slice(0, limit)
      .map((c) => {
        const a = c.attendeeId ? this.store.attendees.get(c.attendeeId) : undefined;
        return { checkin: c, attendee: a ? this.snapshotAttendee(a) : null };
      });
  }

  search(query: string, limit = 20): SnapshotAttendee[] {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return [...this.store.attendees.values()]
      .filter((a) =>
        [a.firstName, a.lastName, `${a.firstName} ${a.lastName}`, a.company ?? "", a.email ?? "", a.ticketCode]
          .some((f) => f.toLowerCase().includes(q)),
      )
      .slice(0, limit)
      .map((a) => this.snapshotAttendee(a));
  }

  attendeeById(id: string): SnapshotAttendee | null {
    const a = this.store.attendees.get(id);
    return a ? this.snapshotAttendee(a) : null;
  }

  pairWristband(attendeeId: string, uidRaw: string): SnapshotAttendee {
    const a = this.store.attendees.get(attendeeId);
    if (!a) throw new TicketingError("not_found", "attendee not found");
    const uid = uidRaw.trim().toUpperCase().replace(/[\s-]/g, ":");
    if (!RFID.test(uid)) throw new TicketingError("invalid_input", "invalid RFID UID");
    const other = [...this.store.attendees.values()].find((x) => x.rfidUid === uid && x.id !== a.id);
    if (other) throw new TicketingError("duplicate_holder", "wristband already paired to another attendee");
    a.rfidUid = uid;
    return this.snapshotAttendee(a);
  }

  // ---------- บูธ / lead ----------

  boothBySlug(qrSlug: string): { booth: Booth; sponsor: Sponsor } {
    const booth = this.catalog.booths.find((b) => b.qrSlug === qrSlug);
    if (!booth) throw new TicketingError("not_found", "booth not found");
    return { booth, sponsor: this.sponsor(booth.sponsorId) };
  }

  boothById(boothId: string): { booth: Booth; sponsor: Sponsor } {
    const booth = this.catalog.booths.find((b) => b.id === boothId);
    if (!booth) throw new TicketingError("not_found", "booth not found");
    return { booth, sponsor: this.sponsor(booth.sponsorId) };
  }

  // ผู้เข้างานยืนยันตัวที่บูธด้วยรหัสบัตร + อีเมล (ครั้งเดียว แล้วเว็บจำไว้)
  identifyAttendee(ticketCode: string, email: string): SnapshotAttendee {
    const code = ticketCode.trim().toUpperCase();
    const a = [...this.store.attendees.values()].find(
      (x) => x.ticketCode === code && x.status === "registered" && x.email?.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!a) throw new TicketingError("not_found", "ticket code and email do not match");
    return this.snapshotAttendee(a);
  }

  // attendee กด "สนใจ" / "ขอข้อมูลเพิ่ม" หลังสแกน QR บูธด้วยมือถือตัวเอง
  attendeeBoothAction(qrSlug: string, attendeeId: string, action: InterestLevel, scannedAt?: string) {
    const { booth } = this.boothBySlug(qrSlug);
    const a = this.store.attendees.get(attendeeId);
    if (!a || a.status !== "registered") throw new TicketingError("forbidden", "unknown attendee");
    return this.recordBoothScan({
      id: randomUUID(),
      boothId: booth.id,
      attendee: a,
      source: "attendee_scanned_booth",
      action,
      deviceName: null,
      scannedAt,
    });
  }

  // staff บูธสแกน badge / แตะสายรัด
  staffScan(input: { id: string; boothId: string; code: string; deviceName: string; scannedAt?: string }) {
    const { booth } = this.boothById(input.boothId);
    const existing = this.store.boothScans.get(input.id);
    const parsed = parseScan(input.code);
    if (parsed.kind === "garbage") return { result: "unknown" as const, lead: null, attendee: null, consented: false };
    if (parsed.kind === "qr" && !verifyTicketQr(this.ticketing.qrKeys.publicKey, parsed.token)) {
      return { result: "invalid_qr" as const, lead: null, attendee: null, consented: false };
    }
    const a = existing
      ? this.store.attendees.get(existing.attendeeId)
      : this.findRaw(parsed, [...this.store.attendees.values()]);
    if (!a) return { result: "unknown" as const, lead: null, attendee: null, consented: false };
    if (a.status !== "registered") return { result: "cancelled" as const, lead: null, attendee: null, consented: false };
    const lead = this.recordBoothScan({
      id: input.id,
      boothId: booth.id,
      attendee: a,
      source: "staff_scanned_badge",
      action: "visit",
      deviceName: input.deviceName,
      scannedAt: input.scannedAt,
    });
    // staff เห็นชื่อได้เฉพาะคนที่ยินยอมแชร์ข้อมูลกับ sponsor — คนที่ไม่ยินยอมนับเป็น traffic เท่านั้น
    return {
      result: "recorded" as const,
      lead: a.shareWithSponsors ? lead : null,
      attendee: a.shareWithSponsors ? this.snapshotAttendee(a) : null,
      consented: a.shareWithSponsors,
    };
  }

  private recordBoothScan(input: {
    id: string;
    boothId: string;
    attendee: Attendee;
    source: "attendee_scanned_booth" | "staff_scanned_badge";
    action: InterestLevel;
    deviceName: string | null;
    scannedAt?: string;
  }): Lead {
    const booth = this.boothById(input.boothId).booth;
    const key = `${booth.id}|${input.attendee.id}`;
    if (this.store.boothScans.has(input.id)) return this.store.leads.get(key)!;
    const at = input.scannedAt ?? new Date().toISOString();
    this.store.boothScans.set(input.id, {
      id: input.id,
      eventId: this.catalog.event.id,
      boothId: booth.id,
      attendeeId: input.attendee.id,
      source: input.source,
      action: input.action,
      deviceName: input.deviceName,
      scannedAt: at,
    });
    const lead = this.store.leads.get(key);
    if (lead) {
      lead.scanCount++;
      if (at > lead.lastScannedAt) lead.lastScannedAt = at;
      if (at < lead.firstScannedAt) lead.firstScannedAt = at;
      if (INTEREST_RANK[input.action] > INTEREST_RANK[lead.interestLevel]) lead.interestLevel = input.action;
      return lead;
    }
    const created: Lead = {
      id: randomUUID(),
      eventId: this.catalog.event.id,
      sponsorId: booth.sponsorId,
      boothId: booth.id,
      attendeeId: input.attendee.id,
      firstScannedAt: at,
      lastScannedAt: at,
      scanCount: 1,
      interestLevel: input.action,
      rating: null,
      notes: "",
    };
    this.store.leads.set(key, created);
    return created;
  }

  updateLead(boothId: string, leadId: string, patch: { rating?: LeadRating | null; notes?: string }): Lead {
    const lead = [...this.store.leads.values()].find((l) => l.id === leadId && l.boothId === boothId);
    if (!lead) throw new TicketingError("not_found", "lead not found");
    const a = this.store.attendees.get(lead.attendeeId);
    if (!a?.shareWithSponsors) throw new TicketingError("forbidden", "attendee did not consent");
    if (patch.rating !== undefined) lead.rating = patch.rating;
    if (patch.notes !== undefined) lead.notes = patch.notes.slice(0, 1000);
    return lead;
  }

  // ---------- sponsor portal ----------

  // lead ที่ sponsor เห็นได้: ยินยอมแชร์ + ยังเป็นบัตรที่ใช้งานอยู่ (เทียบเท่า view sponsor_visible_leads)
  visibleLeads(sponsorId: string, boothId?: string): VisibleLead[] {
    return [...this.store.leads.values()]
      .filter((l) => l.sponsorId === sponsorId && (!boothId || l.boothId === boothId))
      .flatMap((lead) => {
        const a = this.store.attendees.get(lead.attendeeId);
        if (!a || !a.shareWithSponsors || a.status !== "registered") return [];
        return [
          {
            lead,
            boothCode: this.catalog.booths.find((b) => b.id === lead.boothId)!.code,
            firstName: a.firstName,
            lastName: a.lastName,
            email: a.email,
            company: a.company,
            jobTitle: a.jobTitle,
          },
        ];
      })
      .sort((x, y) => y.lead.lastScannedAt.localeCompare(x.lead.lastScannedAt));
  }

  sponsorView(sponsorId: string) {
    const sponsor = this.sponsor(sponsorId);
    const booths = this.catalog.booths.filter((b) => b.sponsorId === sponsorId);
    const boothIds = new Set(booths.map((b) => b.id));
    const scans = [...this.store.boothScans.values()].filter((s) => boothIds.has(s.boothId));
    const allLeads = [...this.store.leads.values()].filter((l) => l.sponsorId === sponsorId);
    const visible = this.visibleLeads(sponsorId);
    const count = (r: LeadRating) => visible.filter((v) => v.lead.rating === r).length;
    return {
      sponsor,
      booths,
      stats: {
        scans: scans.length,
        uniqueVisitors: allLeads.length,
        consentedLeads: visible.length,
        notConsented: allLeads.length - visible.length,
        hot: count("hot"),
        warm: count("warm"),
        cold: count("cold"),
        requestInfo: visible.filter((v) => v.lead.interestLevel === "request_info").length,
      },
      leads: visible,
      exports: this.store.leadExports.filter((e) => e.sponsorId === sponsorId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }

  // export CSV + บันทึกว่าใคร export ใครบ้าง เมื่อไร (หลักฐานการแชร์ข้อมูลตาม PDPA)
  exportLeads(sponsorId: string, exportedBy: string): { csv: string; record: LeadExport } {
    const rows = this.visibleLeads(sponsorId);
    const header = ["booth", "first_name", "last_name", "email", "company", "job_title", "interest", "rating", "notes", "scans", "first_scanned_at", "last_scanned_at"];
    const lines = rows.map((r) =>
      [
        r.boothCode,
        r.firstName,
        r.lastName,
        r.email ?? "",
        r.company ?? "",
        r.jobTitle ?? "",
        r.lead.interestLevel,
        r.lead.rating ?? "",
        r.lead.notes,
        String(r.lead.scanCount),
        r.lead.firstScannedAt,
        r.lead.lastScannedAt,
      ]
        .map(csvCell)
        .join(","),
    );
    const record: LeadExport = {
      id: randomUUID(),
      sponsorId,
      exportedBy: exportedBy.slice(0, 100) || "unknown",
      attendeeIds: rows.map((r) => r.lead.attendeeId),
      createdAt: new Date().toISOString(),
    };
    this.store.leadExports.push(record);
    // BOM ให้ Excel เปิดภาษาไทยถูก
    return { csv: "﻿" + [header.join(","), ...lines].join("\r\n"), record };
  }

  // ---------- dashboard ผู้จัด ----------

  dashboard(operatingDate: string) {
    const { catalog, store } = this;
    const tz = catalog.event.timezone;
    const attendees = [...store.attendees.values()];
    const registered = attendees.filter((a) => a.status === "registered");
    const orders = [...store.orders.values()];
    const confirmed = orders.filter((o) => o.status === "confirmed");
    const entranceIds = new Set(catalog.checkpoints.filter((c) => c.kind === "entrance").map((c) => c.id));
    const todays = [...store.checkins.values()].filter((c) => c.operatingDate === operatingDate);
    const acceptedEntrance = todays.filter((c) => c.result === "accepted" && entranceIds.has(c.checkpointId));
    const inToday = new Set(acceptedEntrance.map((c) => c.attendeeId!));
    const admission = new Set(this.admissionTicketTypeIds());
    const expectedToday = registered.filter((a) => {
      if (!admission.has(a.ticketTypeId)) return false;
      const s = this.snapshotAttendee(a);
      return s.slotDate === null || s.slotDate === operatingDate;
    });

    // เช็คอินต่อช่วง 30 นาที (เวลาท้องถิ่นของงาน) 08:00–18:00
    const buckets = Array.from({ length: 20 }, (_, i) => ({
      label: `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
      count: 0,
    }));
    for (const c of acceptedEntrance) {
      const [h, m] = localTime(c.scannedAt, tz);
      const idx = (h - 8) * 2 + (m >= 30 ? 1 : 0);
      if (idx >= 0 && idx < buckets.length) buckets[idx]!.count++;
    }

    const byTicketType = catalog.ticketTypes.map((t) => {
      const sold = registered.filter((a) => a.ticketTypeId === t.id);
      return {
        ticketType: t,
        sold: sold.length,
        quota: t.quota,
        checkedInToday: sold.filter((a) => inToday.has(a.id)).length,
        revenueSatang: confirmed
          .flatMap((o) => o.items)
          .filter((i) => i.ticketTypeId === t.id)
          .reduce((sum, i) => sum + i.unitPriceSatang * i.quantity - i.discountSatang, 0),
      };
    });

    const workshops = catalog.ticketTypes
      .filter((t) => t.kind === "workshop")
      .map((t) => {
        const slot = catalog.slots.find((s) => s.id === t.slotIds![0])!;
        const sold = registered.filter((a) => a.ticketTypeId === t.id);
        const attended = new Set(
          todays.filter((c) => c.result === "accepted" && sold.some((a) => a.id === c.attendeeId)).map((c) => c.attendeeId),
        );
        return {
          ticketType: t,
          slot,
          date: localDate(slot.startsAt, tz),
          sold: sold.length,
          capacity: slot.capacity,
          attended: attended.size,
        };
      });

    const booths = catalog.booths
      .map((b) => {
        const scans = [...store.boothScans.values()].filter((s) => s.boothId === b.id);
        const leads = [...store.leads.values()].filter((l) => l.boothId === b.id);
        return {
          booth: b,
          sponsor: this.sponsor(b.sponsorId),
          scans: scans.length,
          uniqueVisitors: leads.length,
          consentedLeads: leads.filter((l) => store.attendees.get(l.attendeeId)?.shareWithSponsors).length,
        };
      })
      .sort((a, b) => b.uniqueVisitors - a.uniqueVisitors);

    const byCheckpoint = catalog.checkpoints.map((cp) => ({
      checkpoint: cp,
      accepted: todays.filter((c) => c.checkpointId === cp.id && c.result === "accepted").length,
      rejected: todays.filter((c) => c.checkpointId === cp.id && c.result !== "accepted" && c.result !== "already_in").length,
    }));

    return {
      operatingDate,
      totals: {
        registered: registered.length,
        expectedToday: expectedToday.length,
        checkedInToday: inToday.size,
        revenueSatang: confirmed.reduce((s, o) => s + o.totalSatang, 0),
        vatSatang: confirmed.reduce((s, o) => s + o.vatSatang, 0),
        ordersConfirmed: confirmed.length,
        ordersPending: orders.filter((o) => o.status === "pending_payment").length,
        consentRate: registered.length ? registered.filter((a) => a.shareWithSponsors).length / registered.length : 0,
        offlineSynced: todays.filter((c) => c.offline).length,
        rejectedToday: todays.filter((c) => !["accepted", "already_in"].includes(c.result)).length,
      },
      checkinsByHalfHour: buckets,
      byTicketType,
      workshops,
      booths,
      byCheckpoint,
    };
  }

  attendeeList(query: string, limit = 100) {
    const q = query.trim().toLowerCase();
    return [...this.store.attendees.values()]
      .filter(
        (a) =>
          !q ||
          [a.firstName, a.lastName, a.company ?? "", a.email ?? "", a.ticketCode].some((f) => f.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((a) => ({ ...this.snapshotAttendee(a), email: a.email, shareWithSponsors: a.shareWithSponsors }));
  }

  // ---------- helper ----------

  private findRaw(parsed: ReturnType<typeof parseScan>, all: Attendee[]): Attendee | null {
    const snap = findAttendee(
      parsed,
      all.map((a) => ({ id: a.id, ticketCode: a.ticketCode, rfidUid: a.rfidUid }) as SnapshotAttendee),
    );
    return snap ? (this.store.attendees.get(snap.id) ?? null) : null;
  }

  private sponsor(id: string): Sponsor {
    const s = this.catalog.sponsors.find((x) => x.id === id);
    if (!s) throw new TicketingError("not_found", "sponsor not found");
    return s;
  }
}

// cookie ยืนยันตัว attendee ที่บูธ: "<attendeeId>.<hmac>"
export function signAttendeeCookie(secret: string, attendeeId: string): string {
  return `${attendeeId}.${hmacSha256B64url(secret, attendeeId)}`;
}

export function verifyAttendeeCookie(secret: string, value: string | undefined): string | null {
  if (!value) return null;
  const i = value.lastIndexOf(".");
  if (i < 0) return null;
  const id = value.slice(0, i);
  return constantTimeEqual(signAttendeeCookie(secret, id), value) ? id : null;
}

function csvCell(v: string): string {
  // กัน CSV injection: ค่าที่ขึ้นต้นด้วย = + - @ ให้ Excel อ่านเป็นข้อความ
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function localDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}

function localTime(iso: string, timeZone: string): [number, number] {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(new Date(iso))
    .split(":");
  return [Number(parts[0]), Number(parts[1])];
}
