// State lives in localStorage so several tabs (gate, booth, dashboard) share it,
// the way devices share one server in the real system.
import { buildSeed, ticketCode, uid } from './seed.js';

const KEY = 'ev-demo-v1';
const QUEUE_KEY = 'ev-demo-offline-queue';
const listeners = new Set();
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through to seed */ }
  const s = buildSeed();
  persist(s);
  return s;
}
function persist(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: memory only */ }
}
function emit() { listeners.forEach((fn) => fn(state)); }
function commit() { persist(state); emit(); }

window.addEventListener('storage', (e) => {
  if (e.key === KEY && e.newValue) { state = JSON.parse(e.newValue); emit(); }
  if (e.key === QUEUE_KEY) emit();
});

export const store = {
  get: () => state,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  reset() { state = buildSeed(); try { localStorage.removeItem(QUEUE_KEY); } catch {} commit(); },
};

// ---------- lookups ----------
export const byId = (list, id) => state[list].find((x) => x.id === id);
export const ticketType = (id) => byId('ticketTypes', id);
export const findByCode = (code) => state.attendees.find((a) => a.ticketCode === code.trim().toUpperCase());
export const findByRfid = (u) => state.attendees.find((a) => a.rfidUid && a.rfidUid === u.trim().toUpperCase());
export const boothBySlug = (slug) => state.booths.find((b) => b.slug === slug);
export const sponsorOf = (booth) => byId('sponsors', booth.sponsorId);

export function searchAttendees(q, limit = 20) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return state.attendees.filter((a) =>
    `${a.firstName} ${a.lastName} ${a.email} ${a.ticketCode} ${a.company}`.toLowerCase().includes(s)).slice(0, limit);
}

// ---------- registration ----------
export function issuedCount(ttId) { return state.attendees.filter((a) => a.ticketTypeId === ttId && a.status === 'registered').length; }

export function register(input, { source = 'online', channel = 'web_form' } = {}) {
  const email = (input.email || '').trim().toLowerCase();
  if (email && state.attendees.some((a) => a.email === email)) return { error: 'duplicate_email' };
  const tt = ticketType(input.ticketTypeId);
  if (!tt) return { error: 'no_ticket_type' };
  if (tt.quota && issuedCount(tt.id) >= tt.quota) return { error: 'sold_out' };
  let code;
  do { code = ticketCode(); } while (findByCode(code));
  const now = Date.now();
  const a = {
    id: uid(), ticketTypeId: tt.id, ticketCode: code, qrVersion: 1,
    firstName: input.firstName.trim(), lastName: input.lastName.trim(), email,
    phone: (input.phone || '').trim(), nationality: input.nationality || 'TH', idDocType: input.idDocType || null,
    company: (input.company || '').trim(), jobTitle: (input.jobTitle || '').trim(), interests: input.interests || [],
    locale: input.locale || 'th', source, status: 'registered',
    consents: { terms: true, share: !!input.share, marketing: !!input.marketing },
    consentLog: [{ purpose: 'share_with_scanned_sponsors', granted: !!input.share, at: now, channel }],
    firstCheckedInAt: null, rfidUid: null, createdAt: now,
  };
  state.attendees.push(a);
  commit();
  return { attendee: a };
}

export function setShareConsent(attendeeId, granted) {
  const a = byId('attendees', attendeeId);
  a.consents.share = granted;
  a.consentLog.push({ purpose: 'share_with_scanned_sponsors', granted, at: Date.now(), channel: 'self_service' });
  commit();
}

export function reissueTicket(attendeeId) {
  const a = byId('attendees', attendeeId);
  a.qrVersion += 1;
  audit('attendee.reissue', a.id);
  commit();
}

export function importRows(rows, ttId) {
  const report = { created: 0, errors: [] };
  rows.forEach((row, i) => {
    if (!row.first_name || !row.last_name) { report.errors.push({ row: i + 2, message: 'ไม่มีชื่อหรือนามสกุล' }); return; }
    const tt = state.ticketTypes.find((t) => t.code === (row.ticket || '').toUpperCase())?.id || ttId;
    const res = register({ firstName: row.first_name, lastName: row.last_name, email: row.email, company: row.company, jobTitle: row.job_title, nationality: (row.nationality || 'TH').toUpperCase(), ticketTypeId: tt, share: false }, { source: 'import', channel: 'import' });
    if (res.error) report.errors.push({ row: i + 2, message: res.error === 'duplicate_email' ? 'email ซ้ำ' : res.error });
    else report.created += 1;
  });
  return report;
}

// ---------- check-in ----------
export function evaluateCheckin(a, checkpointId, pending = []) {
  if (!a) return 'unknown';
  if (a.status === 'cancelled') return 'cancelled';
  const cp = byId('checkpoints', checkpointId);
  if (cp.allowed && !cp.allowed.includes(a.ticketTypeId)) return 'wrong_ticket_type';
  const inAlready = cp.kind === 'entrance'
    ? a.firstCheckedInAt || pending.some((p) => p.attendeeId === a.id && p.result === 'accepted')
    : state.checkins.concat(pending).some((c) => c.attendeeId === a.id && c.checkpointId === checkpointId && c.result === 'accepted');
  return inAlready ? 'already_in' : 'accepted';
}

function applyCheckin(c) {
  if (state.checkins.some((x) => x.id === c.id)) return false; // idempotent: same id = same scan
  state.checkins.push({ ...c, receivedAt: Date.now() });
  if (c.result === 'accepted' && c.attendeeId) {
    const a = byId('attendees', c.attendeeId);
    if (a && !a.firstCheckedInAt) a.firstCheckedInAt = c.scannedAt;
  }
  return true;
}

export function recordCheckin(c, { offline = false } = {}) {
  const rec = { id: uid(), scannedAt: Date.now(), ...c };
  if (offline) { const q = offlineQueue(); q.push(rec); saveQueue(q); emit(); return rec; }
  applyCheckin(rec); commit(); return rec;
}

export function offlineQueue() { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; } }
function saveQueue(q) { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {} }

export function syncQueue() {
  const q = offlineQueue();
  let applied = 0;
  // send twice on purpose: a flaky network often resends, and the server must not double count
  q.concat(q).forEach((c) => { if (applyCheckin(c)) applied += 1; });
  saveQueue([]);
  commit();
  return { sent: q.length, applied };
}

export function assignRfid(attendeeId, rfid) {
  const u = rfid.trim().toUpperCase();
  const other = findByRfid(u);
  if (other && other.id !== attendeeId) return { error: `สายรัดนี้ผูกกับ ${other.firstName} ${other.lastName} อยู่แล้ว` };
  byId('attendees', attendeeId).rfidUid = u;
  commit();
  return { ok: true };
}

// ---------- booth & leads ----------
export function recordBoothScan(boothId, attendeeId, source, action = 'visit') {
  state.boothScans.push({ id: uid(), boothId, attendeeId, source, action, scannedAt: Date.now() });
  commit();
}

export function rateLead(boothId, attendeeId, patch) {
  const key = `${boothId}|${attendeeId}`;
  state.leads[key] = { rating: null, notes: '', tags: [], ...state.leads[key], ...patch };
  commit();
}

const LEVEL = { visit: 0, interested: 1, request_info: 2 };
export function leadsForBooths(boothIds) {
  const map = new Map();
  state.boothScans.filter((s) => boothIds.includes(s.boothId)).forEach((s) => {
    const key = `${s.boothId}|${s.attendeeId}`;
    const l = map.get(key) || { key, boothId: s.boothId, attendeeId: s.attendeeId, scanCount: 0, first: s.scannedAt, last: s.scannedAt, level: 'visit', sources: new Set() };
    l.scanCount += 1;
    l.first = Math.min(l.first, s.scannedAt);
    l.last = Math.max(l.last, s.scannedAt);
    if (LEVEL[s.action] > LEVEL[l.level]) l.level = s.action;
    l.sources.add(s.source);
    map.set(key, l);
  });
  return [...map.values()].map((l) => ({ ...l, ...(state.leads[l.key] || {}), attendee: byId('attendees', l.attendeeId) }))
    .sort((a, b) => b.last - a.last);
}

// The only gate between attendee data and a sponsor: consent to share, and not anonymized.
export const visibleToSponsor = (lead) => lead.attendee && lead.attendee.consents.share && !lead.attendee.anonymizedAt;

export function logExport(sponsorId, attendeeIds) {
  state.exports.push({ id: uid(), sponsorId, attendeeIds, at: Date.now() });
  audit('lead.export', sponsorId);
  commit();
}

export function updateEvent(patch) { Object.assign(state.event, patch); audit('event.update', state.event.id); commit(); }
export function updateTicketType(id, patch) { Object.assign(ticketType(id), patch); commit(); }

function audit(action, entityId) { state.audit.push({ action, entityId, at: Date.now() }); }
