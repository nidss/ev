import { store, ticketType, sponsorOf, byId, leadsForBooths, visibleToSponsor, importRows, reissueTicket, updateEvent, updateTicketType, issuedCount } from '../store.js';
import { qrSvg } from '../qr.js';
import { tx } from '../i18n.js';
import { esc, fmtNum, fmtTime, pct, bars, download, toCsv, parseCsv, toast, NATIONS, $ } from '../ui.js';

const TABS = [['', 'Dashboard'], ['attendees', 'ผู้เข้างาน'], ['booths', 'Sponsor & บูธ'], ['settings', 'ตั้งค่างาน']];
const SOURCE = { online: 'ออนไลน์', import: 'Import', walk_in: 'Walk-in', organizer: 'ผู้จัด' };
const boothUrl = (b) => `${location.origin}${location.pathname}#/b/${b.slug}`;

function dashboard() {
  const s = store.get();
  const reg = s.attendees.filter((a) => a.status === 'registered');
  const inside = reg.filter((a) => a.firstCheckedInAt);
  const walkIns = reg.filter((a) => a.source === 'walk_in').length;
  const rfid = reg.filter((a) => a.rfidUid).length;
  const consent = reg.filter((a) => a.consents.share).length;

  // check-ins per 15 minutes since doors opened
  const start = s.event.startsAt;
  const slots = Math.max(1, Math.min(48, Math.ceil((Date.now() - start) / 900e3)));
  const buckets = Array(slots).fill(0);
  inside.forEach((a) => { const i = Math.floor((a.firstCheckedInAt - start) / 900e3); if (i >= 0 && i < slots) buckets[i] += 1; });
  const peak = Math.max(1, ...buckets);

  const byType = s.ticketTypes.map((tt) => {
    const r = reg.filter((a) => a.ticketTypeId === tt.id);
    const n = r.filter((a) => a.firstCheckedInAt).length;
    return { label: tx(tt.name), value: pct(n, r.length), text: `${n}/${r.length}`, color: tt.color };
  });
  const nat = {};
  reg.forEach((a) => { nat[a.nationality] = (nat[a.nationality] || 0) + 1; });
  const natItems = Object.entries(nat).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => ({ label: NATIONS[k] || k, value: v }));

  const boothRows = s.booths.map((b) => {
    const leads = leadsForBooths([b.id]);
    return { b, scans: s.boothScans.filter((x) => x.boothId === b.id).length, unique: leads.length, consented: leads.filter(visibleToSponsor).length, hot: leads.filter((l) => l.rating === 'hot').length };
  }).sort((x, y) => y.scans - x.scans);

  const feed = s.checkins.filter((c) => c.result === 'accepted').map((c) => ({ at: c.scannedAt, text: `เช็คอินที่ ${byId('checkpoints', c.checkpointId)?.name}`, a: c.attendeeId }))
    .concat(s.boothScans.map((x) => ({ at: x.scannedAt, text: `${x.source === 'staff_rfid' ? 'แตะ RFID' : 'สแกน'} ที่บูธ ${byId('booths', x.boothId)?.code}`, a: x.attendeeId })))
    .sort((x, y) => y.at - x.at).slice(0, 8);

  return `
    <div class="grid g4">
      <div class="card kpi"><div class="num">${fmtNum(reg.length)}</div><div class="lbl">ลงทะเบียน · ความจุ ${fmtNum(s.event.capacity)}</div></div>
      <div class="card kpi dark"><div class="num">${fmtNum(inside.length)}</div><div class="lbl">เข้างานแล้ว · ${pct(inside.length, reg.length)}% ของผู้ลงทะเบียน</div></div>
      <div class="card kpi coral"><div class="num">${fmtNum(s.boothScans.length)}</div><div class="lbl">การสแกน / แตะที่บูธ</div></div>
      <div class="card kpi"><div class="num">${pct(consent, reg.length)}%</div><div class="lbl">ยินยอมแชร์ข้อมูลกับ sponsor</div></div>
    </div>
    <div class="grid g3" style="margin-top:16px">
      <div class="card" style="grid-column:span 2"><h2>คนเข้างานต่อ 15 นาที</h2>
        <div class="spark" role="img" aria-label="กราฟจำนวนคนเช็คอินต่อ 15 นาที สูงสุด ${peak} คน">${buckets.map((v, i) => `<span style="height:${(v / peak) * 100}%" title="${fmtTime(start + i * 900e3)} · ${v} คน"></span>`).join('')}</div>
        <div class="spark-axis"><span>${fmtTime(start)}</span><span>สูงสุด ${peak} คน / 15 นาที</span><span>ตอนนี้</span></div></div>
      <div class="card"><h2>หน้างาน</h2>
        <div class="stack" style="gap:10px">
          <div class="row"><span>Walk-in</span><span class="spacer"></span><b>${fmtNum(walkIns)}</b></div>
          <div class="row"><span>แจกสายรัด RFID แล้ว</span><span class="spacer"></span><b>${fmtNum(rfid)}</b></div>
          <div class="row"><span>สแกนไม่ผ่าน</span><span class="spacer"></span><b>${fmtNum(s.checkins.filter((c) => c.result !== 'accepted').length)}</b></div>
          <div class="row"><span>ยังไม่มา</span><span class="spacer"></span><b>${fmtNum(reg.length - inside.length)}</b></div>
        </div></div>
    </div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h2>% เข้างานแล้ว ตามประเภทบัตร</h2>${bars(byType, { max: 100 })}</div>
      <div class="card"><h2>สัญชาติ (ผู้ลงทะเบียน)</h2>${bars(natItems)}</div>
    </div>
    <div class="grid g3" style="margin-top:16px">
      <div class="card" style="grid-column:span 2"><h2>Traffic ต่อบูธ</h2><p class="muted small" style="margin:-6px 0 10px">ใช้ตัวเลขนี้ขาย sponsor งานถัดไป</p>
        <div class="table-wrap"><table><thead><tr><th>บูธ</th><th>Sponsor</th><th class="num">สแกน</th><th class="num">ไม่ซ้ำ</th><th class="num">Lead ยินยอม</th><th class="num">Hot</th></tr></thead><tbody>
        ${boothRows.map((r) => `<tr><td>${esc(r.b.code)}</td><td>${esc(sponsorOf(r.b).name)}</td><td class="num">${r.scans}</td><td class="num">${r.unique}</td><td class="num">${r.consented}</td><td class="num">${r.hot}</td></tr>`).join('')}
        </tbody></table></div></div>
      <div class="card"><h2>ล่าสุด</h2><div class="stack" style="gap:8px">${feed.map((f) => {
        const a = byId('attendees', f.a);
        return `<div class="small"><span class="mono muted">${fmtTime(f.at)}</span> ${a ? esc(a.firstName) : ''} · ${esc(f.text)}</div>`;
      }).join('')}</div></div>
    </div>`;
}

function attendeesTab() {
  return `
    <div class="card stack">
      <div class="row"><input class="input" id="q" placeholder="ค้นหาชื่อ อีเมล บริษัท รหัสบัตร" style="flex:1;min-width:220px">
        <select class="select input" id="st" style="width:auto"><option value="">ทั้งหมด</option><option value="in">เข้างานแล้ว</option><option value="out">ยังไม่มา</option></select>
        <button class="btn ghost" id="exp">Export CSV</button></div>
      <div id="tbl"></div>
    </div>
    <details class="card" style="margin-top:16px"><summary style="font-weight:600;cursor:pointer">Import รายชื่อจาก CSV</summary>
      <div class="stack" style="margin-top:12px">
        <p class="muted small">คอลัมน์: first_name, last_name, email, company, job_title, nationality, ticket (GEN / VIP / PRESS) · ระบบจริงรับไฟล์ Excel (.xlsx) ด้วย</p>
        <textarea class="input mono" id="csv" rows="6">first_name,last_name,email,company,job_title,nationality,ticket
Somsak,Prasert,somsak@example.com,Demo Co.,Manager,TH,VIP
Anna,Lee,anna.lee@example.com,Seoul Labs,Researcher,KR,GEN
,Missing,missing@example.com,,,,GEN</textarea>
        <div class="row"><button class="btn" id="imp">Import</button></div>
        <div id="impReport"></div>
      </div></details>`;
}

function attendeeTable(q, st) {
  const s = store.get();
  const needle = q.trim().toLowerCase();
  const rows = s.attendees.filter((a) => (!needle || `${a.firstName} ${a.lastName} ${a.email} ${a.company} ${a.ticketCode}`.toLowerCase().includes(needle))
    && (!st || (st === 'in' ? a.firstCheckedInAt : !a.firstCheckedInAt))).sort((x, y) => y.createdAt - x.createdAt);
  return `<p class="muted small">${fmtNum(rows.length)} คน${rows.length > 100 ? ' · แสดง 100 คนล่าสุด' : ''}</p>
    <div class="table-wrap"><table><thead><tr><th>ชื่อ</th><th>บริษัท</th><th>บัตร</th><th>สัญชาติ</th><th>ช่องทาง</th><th>เข้างาน</th><th>RFID</th><th>Consent</th><th></th></tr></thead><tbody>
    ${rows.slice(0, 100).map((a) => `<tr><td>${esc(a.firstName)} ${esc(a.lastName)}<br><span class="muted small mono">${a.ticketCode}</span></td><td>${esc(a.company)}</td>
      <td><span class="badge" style="background:${ticketType(a.ticketTypeId).color};color:#fff">${esc(ticketType(a.ticketTypeId).code)}</span></td><td>${esc(a.nationality)}</td><td>${SOURCE[a.source] || a.source}</td>
      <td>${a.firstCheckedInAt ? fmtTime(a.firstCheckedInAt) : '<span class="muted">-</span>'}</td><td class="mono small">${esc(a.rfidUid || '-')}</td>
      <td>${a.consents.share ? '<span class="badge ok">แชร์ได้</span>' : '<span class="badge">ไม่แชร์</span>'}</td>
      <td><a href="#/t/${a.ticketCode}" class="small">บัตร</a> · <button class="btn ghost sm" data-reissue="${a.id}" style="min-height:28px;padding:2px 8px">ออกใหม่</button></td></tr>`).join('')}
    </tbody></table></div>`;
}

function boothsTab() {
  const s = store.get();
  return `<p class="sub" style="margin-bottom:16px">QR ประจำบูธเป็น URL ธรรมดา ผู้เข้างานใช้กล้องมือถือสแกนได้เลยไม่ต้องลงแอป ลองสแกนด้วยมือถือจากหน้าจอนี้ได้</p>
    <div class="grid g3">${s.booths.map((b) => {
      const sp = sponsorOf(b);
      return `<div class="card stack" style="align-items:center;text-align:center">
        <span class="badge dark">${esc(sp.tier.toUpperCase())} · ${esc(b.code)}</span>
        <h3 style="margin:0">${esc(sp.name)}</h3>
        ${qrSvg(boothUrl(b), { size: 180 })}
        <p class="muted small">${esc(tx(sp.description))}</p>
        <a class="btn ghost sm" href="#/b/${b.slug}">เปิดหน้าบูธ</a>
      </div>`;
    }).join('')}</div>`;
}

function settingsTab() {
  const s = store.get();
  return `<div class="grid g2" style="align-items:start">
    <form class="card stack" id="evForm"><h2>ข้อมูลงาน</h2>
      <label class="field"><span>ชื่องาน (ไทย)</span><input class="input" name="th" value="${esc(s.event.name.th)}"></label>
      <label class="field"><span>ชื่องาน (English)</span><input class="input" name="en" value="${esc(s.event.name.en)}"></label>
      <label class="field"><span>สถานที่</span><input class="input" name="venue" value="${esc(s.event.venue)}"></label>
      <label class="field"><span>ความจุ (คน)</span><input class="input" type="number" name="capacity" value="${s.event.capacity}"></label>
      <button class="btn">บันทึก</button></form>
    <div class="stack">
      <form class="card stack" id="ttForm"><h2>ประเภทบัตร</h2>
        <div class="table-wrap"><table><thead><tr><th>รหัส</th><th>ชื่อ</th><th class="num">ออกแล้ว</th><th>โควตา</th><th>เปิดขายทั่วไป</th></tr></thead><tbody>
        ${s.ticketTypes.map((tt) => `<tr><td>${esc(tt.code)}</td><td>${esc(tx(tt.name))}</td><td class="num">${issuedCount(tt.id)}</td>
          <td><input class="input" type="number" min="0" name="q-${tt.id}" value="${tt.quota ?? ''}" style="width:110px;min-height:36px;padding:6px 8px"></td>
          <td>${tt.isPublic ? 'ใช่' : 'ไม่ (import / ผู้จัดเท่านั้น)'}</td></tr>`).join('')}
        </tbody></table></div><button class="btn">บันทึกโควตา</button></form>
      <div class="card"><h2>จุดเช็คอิน</h2>${s.checkpoints.map((c) => `<p>${esc(c.name)} <span class="muted small">· ${c.allowed ? 'เฉพาะ ' + c.allowed.map((id) => ticketType(id).code).join(', ') : 'ทุกประเภทบัตร'}</span></p>`).join('')}</div>
    </div></div>`;
}

export default {
  render(tab = '') {
    return `
    <div class="page-head"><div><p class="eyebrow">ORGANIZER.-</p><h1>${esc(store.get().event.name.th)}</h1><p class="sub">${esc(store.get().event.venue)}</p></div></div>
    <div class="seg" style="margin-bottom:20px;flex-wrap:wrap">${TABS.map(([k, v]) => `<button data-tab="${k}" class="${k === (tab || '') ? 'on' : ''}">${v}</button>`).join('')}</div>
    <div id="tab"></div>`;
  },
  mount(root, tab = '') {
    root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { location.hash = b.dataset.tab ? `#/org/${b.dataset.tab}` : '#/org'; }));
    const box = $('#tab', root);

    if (!tab) {
      const draw = () => { box.innerHTML = dashboard(); };
      draw();
      return store.subscribe(draw);
    }
    if (tab === 'attendees') {
      box.innerHTML = attendeesTab();
      const q = $('#q', box); const st = $('#st', box);
      const draw = () => {
        $('#tbl', box).innerHTML = attendeeTable(q.value, st.value);
        box.querySelectorAll('[data-reissue]').forEach((b) => b.addEventListener('click', () => {
          if (!confirm('ออกบัตรใหม่? QR เดิมของคนนี้จะใช้ไม่ได้')) return;
          reissueTicket(b.dataset.reissue); toast('ออกบัตรใหม่แล้ว QR เดิมใช้ไม่ได้', 'ok');
        }));
      };
      q.addEventListener('input', draw); st.addEventListener('change', draw);
      $('#exp', box).addEventListener('click', () => {
        const s = store.get();
        download('attendees.csv', toCsv([['ticket_code', 'first_name', 'last_name', 'email', 'company', 'ticket', 'nationality', 'source', 'checked_in_at', 'rfid', 'share_consent']]
          .concat(s.attendees.map((a) => [a.ticketCode, a.firstName, a.lastName, a.email, a.company, ticketType(a.ticketTypeId).code, a.nationality, a.source, a.firstCheckedInAt ? new Date(a.firstCheckedInAt).toISOString() : '', a.rfidUid || '', a.consents.share]))));
      });
      $('#imp', box).addEventListener('click', () => {
        const rep = importRows(parseCsv($('#csv', box).value), 'tt-gen');
        $('#impReport', box).innerHTML = `<p><b>นำเข้าแล้ว ${rep.created} คน</b>${rep.errors.length ? ` · ข้าม ${rep.errors.length} แถว` : ''}</p>
          ${rep.errors.map((e) => `<p class="small" style="color:var(--err)">แถว ${e.row}: ${esc(e.message)}</p>`).join('')}`;
      });
      draw();
      return store.subscribe(draw);
    }
    if (tab === 'booths') { box.innerHTML = boothsTab(); return null; }
    if (tab === 'settings') {
      box.innerHTML = settingsTab();
      $('#evForm', box).addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        updateEvent({ name: { th: f.get('th'), en: f.get('en') }, venue: f.get('venue'), capacity: Number(f.get('capacity')) || null });
        toast('บันทึกแล้ว', 'ok');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      $('#ttForm', box).addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        store.get().ticketTypes.forEach((tt) => updateTicketType(tt.id, { quota: Number(f.get(`q-${tt.id}`)) || null }));
        toast('บันทึกโควตาแล้ว', 'ok');
      });
      return null;
    }
    return null;
  },
};
