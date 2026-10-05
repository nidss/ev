// Demo seed data — all names and companies are fictional.

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TH_FIRST = ['สมชาย', 'สุดา', 'ธนพล', 'กมลวรรณ', 'ปิยะ', 'วรรณา', 'ณัฐวุฒิ', 'อรอุมา', 'ศักดิ์ชัย', 'พิมพ์ชนก', 'ภานุ', 'จิราพร', 'เอกชัย', 'นภัสสร', 'วีรยุทธ', 'ชลธิชา', 'กิตติ', 'มณีรัตน์', 'อนุชา', 'ศิริพร'];
const TH_LAST = ['ใจดี', 'ศรีสุข', 'วงศ์ทอง', 'บุญมา', 'แสงอรุณ', 'พงษ์ไพร', 'รัตนกุล', 'ทองดี', 'สายสุวรรณ', 'เจริญผล', 'มั่นคง', 'อินทร์แก้ว'];
const INTL = [
  ['Emma', 'Tanaka', 'JP'], ['Liam', 'Nguyen', 'VN'], ['Mei', 'Chen', 'CN'], ['Arjun', 'Patel', 'IN'],
  ['Sofia', 'Rossi', 'IT'], ['Noah', 'Kim', 'KR'], ['Aisha', 'Rahman', 'MY'], ['Lucas', 'Martin', 'FR'],
  ['Hana', 'Sato', 'JP'], ['Ethan', 'Lim', 'SG'], ['Olivia', 'Brown', 'GB'], ['Daniel', 'Schmidt', 'DE'],
  ['Maria', 'Santos', 'PH'], ['Jack', 'Wilson', 'AU'], ['Yuki', 'Mori', 'JP'], ['Grace', 'Wong', 'HK'],
];
const COMPANIES = ['Siam Retail Co.', 'Northstar Logistics', 'Bluewave Fintech', 'Golden Grain Foods', 'Krungthep Media', 'Lotus Health', 'Andaman Travel', 'Pixel Factory', 'Orbit Energy', 'Mekong Trading', 'Nimbus Cloud', 'Sukhumvit Partners'];
const TITLES = ['Marketing Manager', 'CEO', 'Procurement Lead', 'Product Owner', 'Sales Director', 'Engineer', 'Founder', 'Operations Manager', 'Analyst', 'Brand Executive'];
export const INTERESTS = [
  { value: 'fintech', label: { th: 'ฟินเทค', en: 'Fintech' } },
  { value: 'retail', label: { th: 'ค้าปลีก', en: 'Retail' } },
  { value: 'ai', label: { th: 'AI / ข้อมูล', en: 'AI / Data' } },
  { value: 'logistics', label: { th: 'โลจิสติกส์', en: 'Logistics' } },
  { value: 'marketing', label: { th: 'การตลาด', en: 'Marketing' } },
  { value: 'sustainability', label: { th: 'ความยั่งยืน', en: 'Sustainability' } },
];

const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function ticketCode(r = Math.random) {
  const part = () => Array.from({ length: 4 }, () => ALPH[Math.floor(r() * ALPH.length)]).join('');
  return `EV-${part()}-${part()}`;
}
export function uid(r = Math.random) {
  return 'id' + Date.now().toString(36) + Math.floor(r() * 1e9).toString(36);
}
export function rfidUid(r = Math.random) {
  return Array.from({ length: 4 }, () => Math.floor(r() * 256).toString(16).padStart(2, '0')).join(':').toUpperCase();
}

export function buildSeed() {
  const r = rng(20261002);
  const now = Date.now();
  const doorsOpen = now - 3 * 3600e3; // event started 3 hours ago

  const ticketTypes = [
    { id: 'tt-gen', code: 'GEN', name: { th: 'ทั่วไป', en: 'General' }, kind: 'general', quota: 7000, isPublic: true, color: '#1F6F7A' },
    { id: 'tt-vip', code: 'VIP', name: { th: 'VIP', en: 'VIP' }, kind: 'vip', quota: 500, isPublic: true, color: '#F26E5B' },
    { id: 'tt-press', code: 'PRESS', name: { th: 'สื่อมวลชน', en: 'Press' }, kind: 'press', quota: 200, isPublic: false, color: '#0F2E42' },
  ];
  const checkpoints = [
    { id: 'cp-a', name: 'ประตู A', kind: 'entrance', allowed: null },
    { id: 'cp-b', name: 'ประตู B', kind: 'entrance', allowed: null },
    { id: 'cp-vip', name: 'VIP Lounge', kind: 'vip_area', allowed: ['tt-vip', 'tt-press'] },
  ];
  const sponsorDefs = [
    ['Bluewave Fintech', 'platinum', 'ระบบชำระเงินสำหรับธุรกิจ SME', 'Payments for SMEs', 'fintech'],
    ['Nimbus Cloud', 'gold', 'คลาวด์และ AI สำหรับองค์กร', 'Cloud and AI for enterprises', 'ai'],
    ['Northstar Logistics', 'gold', 'ขนส่งและคลังสินค้าครบวงจร', 'End-to-end logistics', 'logistics'],
    ['Lotus Health', 'silver', 'ประกันสุขภาพกลุ่มสำหรับพนักงาน', 'Group health insurance', 'retail'],
    ['Orbit Energy', 'silver', 'โซลาร์รูฟท็อปสำหรับโรงงาน', 'Rooftop solar for factories', 'sustainability'],
    ['Pixel Factory', 'exhibitor', 'เอเจนซี่การตลาดดิจิทัล', 'Digital marketing agency', 'marketing'],
  ];
  const sponsors = [];
  const booths = [];
  sponsorDefs.forEach(([name, tier, th, en, topic], i) => {
    const id = `sp-${i + 1}`;
    sponsors.push({ id, name, tier, topic, description: { th, en }, website: `https://example.com/${name.split(' ')[0].toLowerCase()}`, leadPackage: tier === 'exhibitor' ? 'basic' : 'pro' });
    booths.push({ id: `bo-${i + 1}`, sponsorId: id, code: `B${String(i + 1).padStart(2, '0')}`, slug: `b${(i + 1) * 7919}x${Math.floor(r() * 1e6).toString(36)}` });
  });

  const attendees = [];
  const checkins = [];
  const boothScans = [];
  const leads = {};
  const N = 160;
  for (let i = 0; i < N; i++) {
    const thai = r() < 0.7;
    let first, last, nat;
    if (thai) { first = TH_FIRST[Math.floor(r() * TH_FIRST.length)]; last = TH_LAST[Math.floor(r() * TH_LAST.length)]; nat = 'TH'; }
    else { [first, last, nat] = INTL[Math.floor(r() * INTL.length)]; }
    const tt = r() < 0.82 ? 'tt-gen' : r() < 0.8 ? 'tt-vip' : 'tt-press';
    const company = COMPANIES[Math.floor(r() * COMPANIES.length)];
    const share = r() < 0.72;
    const interests = INTERESTS.filter(() => r() < 0.3).map((x) => x.value);
    const created = doorsOpen - Math.floor(r() * 20 * 86400e3);
    const source = r() < 0.12 ? 'import' : 'online';
    const a = {
      id: `at-${i + 1}`, ticketTypeId: tt, ticketCode: ticketCode(r), qrVersion: 1,
      firstName: first, lastName: last,
      email: `${thai ? 'guest' + (i + 1) : first.toLowerCase() + '.' + last.toLowerCase()}@example.com`,
      phone: thai ? `+66 8${Math.floor(r() * 1e8).toString().padStart(8, '0')}` : '',
      nationality: nat, idDocType: thai ? 'thai_id' : 'passport',
      company, jobTitle: TITLES[Math.floor(r() * TITLES.length)], interests,
      locale: thai ? 'th' : 'en', source, status: 'registered',
      consents: { terms: true, share, marketing: r() < 0.4 },
      consentLog: [{ purpose: 'share_with_scanned_sponsors', granted: share, at: created, channel: source === 'import' ? 'import' : 'web_form' }],
      firstCheckedInAt: null, rfidUid: null, createdAt: created,
    };
    attendees.push(a);
    if (r() < 0.62) {
      const t = doorsOpen + Math.floor(Math.pow(r(), 1.8) * 2.8 * 3600e3);
      a.firstCheckedInAt = t;
      a.rfidUid = rfidUid(r);
      checkins.push({ id: uid(r), attendeeId: a.id, checkpointId: r() < 0.6 ? 'cp-a' : 'cp-b', device: 'Gate A - iPad 1', result: 'accepted', scannedAt: t });
      // booth visits
      booths.forEach((b) => {
        const sp = sponsors.find((s) => s.id === b.sponsorId);
        const affinity = a.interests.includes(sp.topic) ? 0.65 : 0.18;
        if (r() < affinity) {
          const st = t + Math.floor(r() * 2 * 3600e3);
          if (st > now) return;
          const roll = r();
          const source = roll < 0.4 ? 'attendee_qr' : roll < 0.7 ? 'staff_badge' : 'staff_rfid';
          const action = source === 'attendee_qr' ? (r() < 0.5 ? 'interested' : r() < 0.5 ? 'request_info' : 'visit') : 'visit';
          boothScans.push({ id: uid(r), boothId: b.id, attendeeId: a.id, source, action, scannedAt: st });
          const key = `${b.id}|${a.id}`;
          if (!leads[key] && source !== 'attendee_qr' && r() < 0.6) {
            leads[key] = { rating: ['hot', 'warm', 'cold'][Math.floor(r() * 3)], notes: '', tags: [] };
          }
        }
      });
    }
  }
  // a few rejected scans for realism
  checkins.push({ id: uid(r), attendeeId: attendees[0].id, checkpointId: 'cp-a', device: 'Gate A - iPad 1', result: 'already_in', scannedAt: now - 3600e3 });
  checkins.push({ id: uid(r), attendeeId: null, checkpointId: 'cp-b', device: 'Gate B - iPad 2', result: 'unknown', rawCode: 'XYZ-123', scannedAt: now - 1800e3 });

  return {
    version: 1,
    event: {
      id: 'ev-1', slug: 'bkk-expo-2026', short: 'BKX26',
      name: { th: 'Bangkok Business Expo 2026', en: 'Bangkok Business Expo 2026' },
      venue: 'ศูนย์ประชุมแห่งชาติ (ตัวอย่าง)', startsAt: doorsOpen, endsAt: doorsOpen + 9 * 3600e3,
      capacity: 8000, locales: ['th', 'en'], status: 'live', walkIn: true,
      secret: Array.from({ length: 32 }, () => Math.floor(r() * 16).toString(16)).join(''),
    },
    ticketTypes, checkpoints, sponsors, booths, attendees, checkins, boothScans, leads,
    exports: [], audit: [],
  };
}
