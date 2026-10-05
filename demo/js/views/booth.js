import { store, findByCode, findByRfid, recordBoothScan, rateLead, leadsForBooths, visibleToSponsor, sponsorOf, byId } from '../store.js';
import { verifyTicket, signTicket } from '../token.js';
import { startScanner, stopScanner } from '../qr.js';
import { esc, fmtTime, toast, $ } from '../ui.js';

const pref = (k, d) => { try { return sessionStorage.getItem(k) || d; } catch { return d; } };
const setPref = (k, v) => { try { sessionStorage.setItem(k, v); } catch {} };
const RATING = { hot: 'Hot', warm: 'Warm', cold: 'Cold' };
const SOURCE = { attendee_qr: 'ผู้เข้างานสแกน QR บูธ', staff_badge: 'สแกน badge', staff_rfid: 'แตะ RFID' };
const LEVEL = { visit: 'เยี่ยมชม', interested: 'สนใจ', request_info: 'ขอข้อมูลเพิ่ม' };

export default {
  render() {
    const s = store.get();
    const boothId = pref('ev-booth', s.booths[0].id);
    const mode = pref('ev-booth-mode', 'rfid');
    return `
    <div class="page-head">
      <div><p class="eyebrow">BOOTH STAFF.-</p><h1>เก็บ lead ที่บูธ</h1><p class="sub">แตะสายรัดข้อมือ RFID หรือสแกน badge ของผู้เข้างาน แล้วให้คะแนนทันที</p></div>
      <label class="field"><span>บูธของคุณ</span><select class="select input" id="booth">${s.booths.map((b) => `<option value="${b.id}" ${b.id === boothId ? 'selected' : ''}>${esc(b.code)} · ${esc(sponsorOf(b).name)}</option>`).join('')}</select></label>
    </div>
    <div class="grid g2" style="align-items:start">
      <div class="stack">
        <div class="seg" role="tablist"><button data-mode="rfid" class="${mode === 'rfid' ? 'on' : ''}">แตะ RFID</button><button data-mode="badge" class="${mode === 'badge' ? 'on' : ''}">สแกน badge (QR)</button></div>
        <div id="pad"></div>
        <div id="current"></div>
      </div>
      <div class="card"><div class="row"><h2 style="margin:0">Lead ของบูธนี้</h2><span class="spacer"></span><span id="count" class="badge dark"></span></div>
        <p class="muted small" style="margin:6px 0 12px">คนที่ไม่ได้ยินยอมแชร์ข้อมูลจะแสดงเป็น "ผู้เยี่ยมชม" และนับเป็น traffic เท่านั้น</p>
        <div id="list"></div></div>
    </div>`;
  },

  mount(root) {
    const boothSel = $('#booth', root);
    let mode = pref('ev-booth-mode', 'rfid');

    function renderPad() {
      const pad = $('#pad', root);
      if (mode === 'rfid') {
        pad.innerHTML = `<form id="rf" class="rfid-pad stack">
          <p style="font-weight:600;font-size:18px">แตะสายรัดข้อมือที่เครื่องอ่าน</p>
          <input class="input" id="uid" placeholder="RFID UID เช่น 04:A2:1F:9C" autocomplete="off" autofocus>
          <div class="row" style="justify-content:center"><button class="btn teal">บันทึก</button><button type="button" class="btn ghost" id="sim">จำลองการแตะ</button></div>
          <p class="muted small">เครื่องอ่าน RFID แบบ USB จะพิมพ์รหัสลงช่องนี้แล้วกด Enter ให้เอง</p></form>`;
        const uidIn = $('#uid', pad);
        uidIn.focus();
        $('#rf', pad).addEventListener('submit', (e) => {
          e.preventDefault();
          const a = findByRfid(uidIn.value);
          uidIn.value = '';
          if (!a) return toast('สายรัดนี้ยังไม่ได้ผูกกับผู้เข้างาน', 'err');
          capture(a, 'staff_rfid');
        });
        $('#sim', pad).addEventListener('click', () => {
          const pool = store.get().attendees.filter((a) => a.rfidUid);
          if (!pool.length) return toast('ยังไม่มีใครได้รับสายรัด ลองเช็คอินที่ประตูก่อน', 'err');
          uidIn.value = pool[Math.floor(Math.random() * pool.length)].rfidUid;
          $('#rf', pad).requestSubmit();
        });
      } else {
        pad.innerHTML = `<div class="camera" id="cam"><div><p>กล้องปิดอยู่</p><button class="btn coral sm" id="camOn" style="margin-top:10px">เปิดกล้อง</button></div></div>
          <form id="qf" class="card row"><input class="input mono" id="q" placeholder="QR หรือรหัสบัตร EV-XXXX-XXXX" style="flex:1;min-width:200px" autocomplete="off">
          <button class="btn">ตรวจ</button><button type="button" class="btn ghost" id="sim">จำลองการสแกน</button></form>`;
        $('#qf', pad).addEventListener('submit', (e) => { e.preventDefault(); handleQr($('#q', pad).value); $('#q', pad).value = ''; });
        $('#sim', pad).addEventListener('click', async () => {
          const pool = store.get().attendees.filter((a) => a.firstCheckedInAt);
          handleQr(await signTicket(pool[Math.floor(Math.random() * pool.length)]));
        });
        $('#camOn', pad).addEventListener('click', async () => {
          const cam = $('#cam', pad);
          cam.innerHTML = '<div id="camView" style="width:100%;height:100%"></div>';
          try { await startScanner('camView', handleQr); } catch (err) { cam.innerHTML = `<p>เปิดกล้องไม่ได้: ${esc(err.message || err)}</p>`; }
        });
      }
    }

    async function handleQr(raw) {
      const text = raw.trim();
      let a = null;
      if (text.startsWith('EV1.')) {
        const v = await verifyTicket(text);
        if (!v.ok) return toast('QR ไม่ถูกต้อง', 'err');
        a = findByCode(v.code);
      } else a = findByCode(text);
      if (!a) return toast('ไม่พบบัตรนี้', 'err');
      capture(a, 'staff_badge');
    }

    function capture(a, source) {
      recordBoothScan(boothSel.value, a.id, source);
      showCurrent(a.id);
    }

    function showCurrent(attendeeId) {
      const lead = leadsForBooths([boothSel.value]).find((l) => l.attendeeId === attendeeId);
      const a = lead.attendee;
      const shown = visibleToSponsor(lead);
      $('#current', root).innerHTML = `
        <form class="card stack" id="rate">
          <div class="row"><div><p class="muted small">บันทึกแล้ว · ${fmtTime(lead.last)}</p>
            <h2 style="margin:4px 0 0">${shown ? `${esc(a.firstName)} ${esc(a.lastName)}` : 'ผู้เยี่ยมชม'}</h2>
            <p class="muted">${shown ? `${esc(a.jobTitle)} · ${esc(a.company)}` : 'ไม่ได้ยินยอมแชร์ข้อมูล sponsor จะเห็นเป็นตัวเลขเท่านั้น'}</p></div></div>
          <div class="seg" id="ratingSeg">${Object.entries(RATING).map(([k, v]) => `<button type="button" data-r="${k}" class="${lead.rating === k ? 'on' : ''}">${v}</button>`).join('')}</div>
          <label class="field"><span>โน้ต</span><textarea class="input" name="notes" rows="2" placeholder="เช่น สนใจ package องค์กร นัดเดโมสัปดาห์หน้า">${esc(lead.notes || '')}</textarea></label>
          <button class="btn coral">บันทึก lead</button>
        </form>`;
      let rating = lead.rating || null;
      $('#ratingSeg', root).querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
        rating = b.dataset.r;
        $('#ratingSeg', root).querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      }));
      $('#rate', root).addEventListener('submit', (e) => {
        e.preventDefault();
        rateLead(boothSel.value, attendeeId, { rating, notes: e.target.notes.value });
        toast('บันทึก lead แล้ว', 'ok');
        $('#current', root).innerHTML = '';
        $('#uid', root)?.focus();
      });
    }

    function renderList() {
      const leads = leadsForBooths([boothSel.value]);
      $('#count', root).textContent = `${leads.length} คน`;
      $('#list', root).innerHTML = leads.length ? `<div class="table-wrap"><table><thead><tr><th>เวลา</th><th>ผู้เข้างาน</th><th>ช่องทาง</th><th>คะแนน</th></tr></thead><tbody>
        ${leads.slice(0, 40).map((l) => `<tr data-id="${l.attendeeId}" style="cursor:pointer"><td class="mono">${fmtTime(l.last)}</td>
          <td>${visibleToSponsor(l) ? `${esc(l.attendee.firstName)} ${esc(l.attendee.lastName)}<br><span class="muted small">${esc(l.attendee.company)}</span>` : '<span class="muted">ผู้เยี่ยมชม</span>'}</td>
          <td class="small">${[...l.sources].map((x) => SOURCE[x]).join(', ')}<br><span class="muted">${LEVEL[l.level]}</span></td>
          <td>${l.rating ? `<span class="badge ${l.rating}">${RATING[l.rating]}</span>` : '<span class="muted">-</span>'}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="muted">ยังไม่มี lead</p>';
      $('#list', root).querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', () => showCurrent(tr.dataset.id)));
    }

    boothSel.addEventListener('change', () => { setPref('ev-booth', boothSel.value); $('#current', root).innerHTML = ''; renderList(); });
    root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', async () => {
      mode = b.dataset.mode; setPref('ev-booth-mode', mode);
      root.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('on', x === b));
      await stopScanner();
      renderPad();
    }));
    renderPad();
    renderList();
    const unsub = store.subscribe(renderList);
    return () => { unsub(); stopScanner(); };
  },
};
