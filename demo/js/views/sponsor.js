import { store, leadsForBooths, visibleToSponsor, logExport, byId } from '../store.js';
import { INTERESTS } from '../seed.js';
import { tx } from '../i18n.js';
import { esc, fmtNum, fmtDateTime, pct, bars, download, toCsv, $ } from '../ui.js';

const pref = (k, d) => { try { return sessionStorage.getItem(k) || d; } catch { return d; } };
const RATING = { hot: 'Hot', warm: 'Warm', cold: 'Cold' };
const LEVEL = { visit: 'เยี่ยมชม', interested: 'สนใจ', request_info: 'ขอข้อมูลเพิ่ม' };
const interestLabel = (v) => tx(INTERESTS.find((i) => i.value === v)?.label) || v;

export default {
  render() {
    const s = store.get();
    const sid = pref('ev-sponsor', s.sponsors[0].id);
    return `
    <div class="page-head">
      <div><p class="eyebrow">SPONSOR PORTAL.-</p><h1>Lead ของบูธคุณ</h1><p class="sub">เห็นตัวบุคคลเฉพาะคนที่ยินยอมแชร์ข้อมูล ตาม PDPA</p></div>
      <label class="field"><span>เข้าสู่ระบบในนาม (demo)</span><select class="select input" id="sp">${s.sponsors.map((x) => `<option value="${x.id}" ${x.id === sid ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
    </div>
    <div id="body"></div>`;
  },
  mount(root) {
    const sel = $('#sp', root);
    let filter = 'all';

    function render() {
      const s = store.get();
      const sp = byId('sponsors', sel.value);
      const boothIds = s.booths.filter((b) => b.sponsorId === sp.id).map((b) => b.id);
      const scans = s.boothScans.filter((x) => boothIds.includes(x.boothId));
      const leads = leadsForBooths(boothIds);
      const visible = leads.filter(visibleToSponsor);
      const hidden = leads.length - visible.length;
      const shown = visible.filter((l) => filter === 'all' || l.rating === filter || (filter === 'requested' && l.level !== 'visit'));
      const ratingCounts = ['hot', 'warm', 'cold'].map((r) => ({ label: RATING[r], value: visible.filter((l) => l.rating === r).length, color: r === 'hot' ? 'var(--coral)' : r === 'warm' ? '#E9A23B' : 'var(--teal)' }));
      const viaCounts = [['staff_rfid', 'แตะ RFID'], ['staff_badge', 'สแกน badge'], ['attendee_qr', 'ผู้เข้างานสแกน QR']].map(([k, label]) => ({ label, value: scans.filter((x) => x.source === k).length }));
      const exports = s.exports.filter((x) => x.sponsorId === sp.id);

      $('#body', root).innerHTML = `
        <div class="grid g4">
          <div class="card kpi"><div class="num">${fmtNum(scans.length)}</div><div class="lbl">การสแกนทั้งหมด</div></div>
          <div class="card kpi"><div class="num">${fmtNum(leads.length)}</div><div class="lbl">ผู้เยี่ยมชมไม่ซ้ำ</div></div>
          <div class="card kpi dark"><div class="num">${fmtNum(visible.length)}</div><div class="lbl">Lead ที่ยินยอม (${pct(visible.length, leads.length)}%)</div></div>
          <div class="card kpi coral"><div class="num">${fmtNum(visible.filter((l) => l.level !== 'visit').length)}</div><div class="lbl">กด "สนใจ" / ขอข้อมูล</div></div>
        </div>
        <div class="grid g2" style="margin-top:16px">
          <div class="card"><h2>คะแนนจาก staff บูธ</h2>${bars(ratingCounts)}</div>
          <div class="card"><h2>ช่องทางที่เก็บ lead</h2>${bars(viaCounts)}</div>
        </div>
        <div class="card" style="margin-top:16px">
          <div class="row"><h2 style="margin:0">รายชื่อ lead</h2><span class="spacer"></span>
            <div class="seg" id="filters">${[['all', 'ทั้งหมด'], ['hot', 'Hot'], ['warm', 'Warm'], ['requested', 'ขอข้อมูล']].map(([k, v]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${v}</button>`).join('')}</div>
            <button class="btn coral sm" id="export">Export CSV (${shown.length})</button></div>
          ${hidden ? `<p class="muted small" style="margin:10px 0">อีก ${fmtNum(hidden)} คนไม่ได้ยินยอมแชร์ข้อมูล จึงนับเป็น traffic ของบูธเท่านั้น</p>` : ''}
          <div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>ชื่อ</th><th>บริษัท / ตำแหน่ง</th><th>อีเมล</th><th>ความสนใจ</th><th>ระดับ</th><th>คะแนน</th><th>โน้ต</th><th>ล่าสุด</th></tr></thead><tbody>
            ${shown.map((l) => `<tr><td>${esc(l.attendee.firstName)} ${esc(l.attendee.lastName)}</td><td>${esc(l.attendee.company)}<br><span class="muted small">${esc(l.attendee.jobTitle)}</span></td>
              <td class="small">${esc(l.attendee.email)}</td><td class="small">${l.attendee.interests.map(interestLabel).join(', ') || '-'}</td>
              <td>${LEVEL[l.level]}</td><td>${l.rating ? `<span class="badge ${l.rating}">${RATING[l.rating]}</span>` : '-'}</td>
              <td class="small">${esc(l.notes || '')}</td><td class="small">${fmtDateTime(l.last)}</td></tr>`).join('') || '<tr><td colspan="8" class="muted">ไม่มี lead ในตัวกรองนี้</td></tr>'}
          </tbody></table></div>
          <p class="muted small" style="margin-top:10px">ทุกการ export ถูกบันทึกเป็นหลักฐานการแชร์ข้อมูลตาม PDPA · export แล้ว ${exports.length} ครั้ง</p>
        </div>`;

      $('#filters', root).querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.f; render(); }));
      $('#export', root).addEventListener('click', () => {
        const rows = [['first_name', 'last_name', 'company', 'job_title', 'email', 'interests', 'interest_level', 'rating', 'notes', 'scan_count', 'last_scanned']]
          .concat(shown.map((l) => [l.attendee.firstName, l.attendee.lastName, l.attendee.company, l.attendee.jobTitle, l.attendee.email, l.attendee.interests.join('|'), l.level, l.rating || '', l.notes || '', l.scanCount, new Date(l.last).toISOString()]));
        logExport(sp.id, shown.map((l) => l.attendeeId));
        download(`leads-${sp.name.replace(/\W+/g, '-').toLowerCase()}.csv`, toCsv(rows));
      });
    }

    sel.addEventListener('change', () => { try { sessionStorage.setItem('ev-sponsor', sel.value); } catch {} render(); });
    render();
    return store.subscribe(render);
  },
};
