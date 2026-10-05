import { store, findByCode, evaluateCheckin, recordCheckin, offlineQueue, syncQueue, assignRfid, register, searchAttendees, ticketType, byId } from '../store.js';
import { verifyTicket, signTicket } from '../token.js';
import { startScanner, stopScanner } from '../qr.js';
import { rfidUid } from '../seed.js';
import { tx } from '../i18n.js';
import { esc, fmtTime, toast, $, NATIONS } from '../ui.js';

const RESULT = {
  accepted: ['ok', '✓', 'เข้างานได้'],
  already_in: ['warn', '!', 'เช็คอินไปแล้ว'],
  wrong_ticket_type: ['err', '✕', 'บัตรประเภทนี้เข้าจุดนี้ไม่ได้'],
  cancelled: ['err', '✕', 'บัตรถูกยกเลิก'],
  unknown: ['err', '?', 'ไม่พบบัตร'],
};

const pref = (k, d) => { try { return sessionStorage.getItem(k) || d; } catch { return d; } };
const setPref = (k, v) => { try { sessionStorage.setItem(k, v); } catch {} };

export default {
  render() {
    const s = store.get();
    const cp = pref('ev-cp', 'cp-a');
    return `
    <div class="page-head">
      <div><p class="eyebrow">GATE STAFF.-</p><h1>เช็คอินหน้างาน</h1><p class="sub">สแกน QR ด้วยกล้อง เครื่องยิงบาร์โค้ด หรือพิมพ์รหัสบัตร / ชื่อ</p></div>
      <div class="row">
        <label class="field"><span>จุดเช็คอิน</span><select class="select input" id="cp">${s.checkpoints.map((c) => `<option value="${c.id}" ${c.id === cp ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
        <label class="check" style="align-self:end;margin-bottom:12px"><input type="checkbox" id="offline" ${pref('ev-offline', '') ? 'checked' : ''}><span>จำลองเน็ตหลุด</span></label>
      </div>
    </div>
    <div id="offbar"></div>
    <div class="grid g2" style="margin-top:16px;align-items:start">
      <div class="stack">
        <div class="camera" id="cam"><div><p>กล้องปิดอยู่</p><button class="btn coral sm" id="camOn" style="margin-top:10px">เปิดกล้องสแกน QR</button></div></div>
        <form id="manual" class="card stack">
          <label class="field"><span>QR / รหัสบัตร / ชื่อ</span>
            <input class="input mono" id="code" autocomplete="off" placeholder="EV-XXXX-XXXX หรือชื่อผู้เข้างาน" autofocus></label>
          <div class="row"><button class="btn">ตรวจ</button><button type="button" class="btn ghost" id="sim">จำลองการสแกน</button></div>
          <p class="muted small">เครื่องยิงบาร์โค้ด USB/Bluetooth ใช้ได้เลย เพราะพิมพ์ลงช่องนี้แล้วกด Enter ให้เอง</p>
          <div id="matches" class="stack" style="gap:6px"></div>
        </form>
        <details class="card"><summary style="font-weight:600;cursor:pointer">+ ลงทะเบียน walk-in หน้างาน</summary>
          <form id="walkin" class="stack" style="margin-top:14px">
            <div class="grid g2">
              <label class="field"><span>ชื่อ *</span><input class="input" name="firstName" required></label>
              <label class="field"><span>นามสกุล *</span><input class="input" name="lastName" required></label>
            </div>
            <label class="field"><span>อีเมล</span><input class="input" type="email" name="email"></label>
            <div class="grid g2">
              <label class="field"><span>บริษัท</span><input class="input" name="company"></label>
              <label class="field"><span>สัญชาติ</span><select class="select input" name="nationality">${Object.entries(NATIONS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
            </div>
            <label class="field"><span>ประเภทบัตร</span><select class="select input" name="ticketTypeId">${s.ticketTypes.map((tt) => `<option value="${tt.id}">${esc(tx(tt.name))}</option>`).join('')}</select></label>
            <label class="check"><input type="checkbox" name="share"><span>ผู้เข้างานยินยอมให้แชร์ข้อมูลกับ sponsor ที่สแกน</span></label>
            <button class="btn teal">ลงทะเบียนและเช็คอิน</button>
          </form>
        </details>
      </div>
      <div class="stack result-col">
        <div id="result" class="scan-result idle"><div class="scan-icon">·</div><div><div class="big">พร้อมสแกน</div><div>ผลการสแกนจะแสดงที่นี่</div></div></div>
        <div id="detail"></div>
        <div class="card"><h2>สแกนล่าสุด</h2><div id="recent"></div></div>
      </div>
    </div>
    <div class="badge-print" id="badgePrint"></div>`;
  },

  mount(root) {
    const cpSel = $('#cp', root);
    const offlineBox = $('#offline', root);
    const codeIn = $('#code', root);
    const isOffline = () => offlineBox.checked;
    const device = () => `${byId('checkpoints', cpSel.value).name} · เครื่อง 1`;

    function showResult(result, a, note = '') {
      const [cls, icon, label] = RESULT[result];
      const extra = result === 'already_in' && a?.firstCheckedInAt ? ` เมื่อ ${fmtTime(a.firstCheckedInAt)}` : '';
      $('#result', root).className = `scan-result ${cls}`;
      $('#result', root).innerHTML = `<div class="scan-icon">${icon}</div><div><div class="big">${label}${extra}</div>
        ${a ? `<div class="who"><b>${esc(a.firstName)} ${esc(a.lastName)}</b> · ${esc(a.company || '-')} · ${esc(tx(ticketType(a.ticketTypeId).name))}</div>` : ''}
        ${note ? `<div>${esc(note)}</div>` : ''}</div>`;
      renderDetail(result === 'accepted' || result === 'already_in' ? a : null);
    }

    function renderDetail(a) {
      const box = $('#detail', root);
      if (!a) { box.innerHTML = ''; return; }
      box.innerHTML = `
        <div class="card stack">
          <div class="row"><h2 style="margin:0">${esc(a.firstName)} ${esc(a.lastName)}</h2><span class="spacer"></span>
            <button class="btn ghost sm" id="print">พิมพ์ badge</button></div>
          <form id="rfidForm" class="rfid-pad stack">
            <p style="font-weight:600">${a.rfidUid ? `สายรัดข้อมือ RFID: <span class="mono">${esc(a.rfidUid)}</span>` : 'ผูกสายรัดข้อมือ RFID'}</p>
            <input class="input" id="rfid" placeholder="แตะสายรัดที่เครื่องอ่าน" autocomplete="off">
            <div class="row" style="justify-content:center"><button class="btn teal sm">${a.rfidUid ? 'เปลี่ยนสายรัด' : 'ผูกสายรัด'}</button>
              <button type="button" class="btn ghost sm" id="rfidSim">จำลองแตะสายรัด</button></div>
            <p class="muted small">เครื่องอ่าน RFID แบบ USB พิมพ์รหัสลงช่องนี้แล้วกด Enter ให้เอง</p>
          </form>
        </div>`;
      const rf = $('#rfid', box);
      if (!a.rfidUid) rf.focus();
      $('#rfidSim', box).addEventListener('click', () => { rf.value = rfidUid(); $('#rfidForm', box).requestSubmit(); });
      $('#rfidForm', box).addEventListener('submit', (e) => {
        e.preventDefault();
        if (!rf.value.trim()) return;
        const res = assignRfid(a.id, rf.value);
        if (res.error) toast(res.error, 'err'); else { toast('ผูกสายรัดข้อมือแล้ว', 'ok'); renderDetail(byId('attendees', a.id)); codeIn.focus(); }
      });
      $('#print', box).addEventListener('click', () => printBadge(a));
    }

    function printBadge(a) {
      const tt = ticketType(a.ticketTypeId);
      const el = $('#badgePrint', root);
      el.innerHTML = `<div class="name">${esc(a.firstName)}<br>${esc(a.lastName)}</div><div>${esc(a.company)}</div>
        <div class="type" style="background:${tt.color}">${esc(tx(tt.name))}</div><div id="bq" style="margin-top:4mm;width:30mm"></div>`;
      signTicket(a).then(async (tok) => {
        const { qrSvg } = await import('../qr.js');
        $('#bq', el).innerHTML = qrSvg(tok, { size: 110 });
        window.print();
      });
    }

    async function handle(raw) {
      const text = raw.trim();
      $('#matches', root).innerHTML = '';
      if (!text) return;
      let a = null;
      if (text.startsWith('EV1.')) {
        const v = await verifyTicket(text);
        if (!v.ok) {
          recordCheckin({ attendeeId: null, checkpointId: cpSel.value, device: device(), result: 'unknown', rawCode: text }, { offline: isOffline() });
          return showResult('unknown', null, v.reason === 'signature' ? 'ลายเซ็นไม่ถูกต้อง: QR ปลอมหรือถูกแก้ไข' : 'QR นี้ไม่ใช่ของงานนี้');
        }
        a = findByCode(v.code);
        if (a && v.version < a.qrVersion) return showResult('unknown', a, 'บัตรนี้ถูกออกใหม่แล้ว QR เก่าใช้ไม่ได้');
      } else if (/^EV-\w{4}-\w{4}$/i.test(text)) {
        a = findByCode(text);
      } else {
        const found = searchAttendees(text, 8);
        $('#matches', root).innerHTML = found.length
          ? found.map((x) => `<button type="button" class="btn ghost sm" style="justify-content:flex-start" data-code="${x.ticketCode}">${esc(x.firstName)} ${esc(x.lastName)} · ${esc(x.company || '')} · <span class="mono">${x.ticketCode}</span></button>`).join('')
          : '<p class="muted">ไม่พบชื่อนี้</p>';
        $('#matches', root).querySelectorAll('[data-code]').forEach((b) => b.addEventListener('click', () => handle(b.dataset.code)));
        return;
      }
      const result = evaluateCheckin(a, cpSel.value, offlineQueue());
      recordCheckin({ attendeeId: a?.id ?? null, checkpointId: cpSel.value, device: device(), result, rawCode: a ? undefined : text }, { offline: isOffline() });
      showResult(result, a ? byId('attendees', a.id) : null, isOffline() ? 'บันทึกในเครื่องแล้ว รอ sync' : '');
      codeIn.value = '';
    }

    function renderOffline() {
      const q = offlineQueue();
      $('#offbar', root).innerHTML = isOffline() || q.length ? `
        <div class="offline-bar">${isOffline() ? 'โหมดออฟไลน์: ตรวจ QR และรายชื่อในเครื่อง' : 'กลับมาออนไลน์แล้ว'} · รอส่ง ${q.length} รายการ
          <span class="spacer"></span>${!isOffline() && q.length ? '<button class="btn sm" id="sync">Sync ตอนนี้</button>' : ''}</div>` : '';
      const btn = $('#sync', root);
      if (btn) btn.addEventListener('click', () => {
        const r = syncQueue();
        toast(`ส่ง ${r.sent} รายการ (ส่งซ้ำทดสอบแล้ว) บันทึกจริง ${r.applied} ไม่มีข้อมูลซ้ำ`, 'ok');
      });
    }

    function renderRecent() {
      const s = store.get();
      const pending = offlineQueue().map((c) => ({ ...c, pending: true }));
      const rows = s.checkins.concat(pending).sort((x, y) => y.scannedAt - x.scannedAt).slice(0, 8);
      $('#recent', root).innerHTML = `<div class="table-wrap" style="border:0"><table><tbody>${rows.map((c) => {
        const a = c.attendeeId ? byId('attendees', c.attendeeId) : null;
        const [cls, , label] = RESULT[c.result];
        return `<tr><td class="mono">${fmtTime(c.scannedAt)}</td><td>${a ? `${esc(a.firstName)} ${esc(a.lastName)}` : `<span class="muted">${esc(c.rawCode || '-')}</span>`}</td>
          <td><span class="badge ${cls === 'ok' ? 'ok' : cls === 'err' ? 'err' : ''}">${label}</span>${c.pending ? ' <span class="badge">รอ sync</span>' : ''}</td></tr>`;
      }).join('')}</tbody></table></div>`;
    }

    cpSel.addEventListener('change', () => setPref('ev-cp', cpSel.value));
    offlineBox.addEventListener('change', () => { setPref('ev-offline', offlineBox.checked ? '1' : ''); renderOffline(); });
    $('#manual', root).addEventListener('submit', (e) => { e.preventDefault(); handle(codeIn.value); });
    $('#sim', root).addEventListener('click', async () => {
      const s = store.get();
      const pool = s.attendees.filter((a) => !a.firstCheckedInAt && a.status === 'registered');
      const a = pool[Math.floor(Math.random() * pool.length)] || s.attendees[0];
      handle(await signTicket(a));
    });
    $('#camOn', root).addEventListener('click', async () => {
      const cam = $('#cam', root);
      cam.innerHTML = '<div id="camView" style="width:100%;height:100%"></div>';
      try { await startScanner('camView', (txt) => handle(txt)); }
      catch (err) { cam.innerHTML = `<div><p>เปิดกล้องไม่ได้: ${esc(err.message || err)}</p><p class="small">ใช้ช่องพิมพ์ด้านล่าง หรือปุ่ม "จำลองการสแกน" แทนได้</p></div>`; }
    });
    $('#walkin', root).addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      if (!f.get('firstName') || !f.get('lastName')) return toast('กรอกชื่อและนามสกุล', 'err');
      const res = register({ firstName: f.get('firstName'), lastName: f.get('lastName'), email: f.get('email'), company: f.get('company'), nationality: f.get('nationality'), ticketTypeId: f.get('ticketTypeId'), share: !!f.get('share') }, { source: 'walk_in', channel: 'walk_in' });
      if (res.error) return toast(res.error === 'duplicate_email' ? 'อีเมลนี้ลงทะเบียนแล้ว' : res.error, 'err');
      e.target.reset();
      handle(res.attendee.ticketCode);
    });

    renderOffline();
    renderRecent();
    const unsub = store.subscribe(() => { renderOffline(); renderRecent(); });
    return () => { unsub(); stopScanner(); };
  },
};
