import { store } from '../store.js';
import { fmtNum, toast } from '../ui.js';

const TILES = [
  ['ATTENDEE.-', 'ผู้เข้างาน', 'ลงทะเบียนหลายภาษา ให้ consent ตาม PDPA แล้วได้ e-ticket QR', '#/register', 'ลองลงทะเบียน'],
  ['GATE STAFF.-', 'เช็คอินหน้างาน', 'สแกน QR หรือค้นชื่อ ผูกสายรัดข้อมือ RFID รับ walk-in และพิมพ์ badge จำลองเน็ตหลุดได้', '#/checkin', 'เปิดหน้าสแกน'],
  ['BOOTH STAFF.-', 'สแกนที่บูธ', 'สแกน badge หรือแตะสายรัด RFID ให้คะแนน hot / warm / cold พร้อมโน้ต', '#/booth', 'เปิดหน้าบูธ'],
  ['SPONSOR.-', 'Sponsor portal', 'ดู lead เฉพาะคนที่ยินยอม export CSV และดูสถิติบูธ', '#/sponsor', 'เปิด portal'],
  ['ORGANIZER.-', 'ผู้จัดงาน', 'Dashboard real-time รายชื่อ import CSV ตั้งค่างาน และ QR บูธ', '#/org', 'เปิด dashboard'],
];

export default {
  render() {
    const s = store.get();
    const inside = s.attendees.filter((a) => a.firstCheckedInAt).length;
    return `
    <section class="hero">
      <div>
        <p class="eyebrow" style="color:#5FB8C2">EVENT PLATFORM · DEMO</p>
        <h1>REGISTER.<br>CHECK IN.<br><span>CAPTURE LEADS.-</span></h1>
        <p>ตัวอย่างระบบจัดงานที่ใช้ได้จริงในเบราว์เซอร์ ข้อมูลทั้งหมดเป็นข้อมูลสมมติและเก็บในเบราว์เซอร์นี้เท่านั้น
           เปิดหลายแท็บพร้อมกันได้ เช่น แท็บหนึ่งเป็นประตู อีกแท็บเป็น dashboard ตัวเลขจะอัปเดตตามกัน</p>
      </div>
      <div class="steps">
        <div class="step"><b>01</b> ลงทะเบียน → ได้บัตร QR</div>
        <div class="step"><b>02</b> เช็คอิน → รับสายรัดข้อมือ RFID</div>
        <div class="step"><b>03</b> สแกน / แตะที่บูธ → เป็น lead</div>
        <div class="step"><b>04</b> Sponsor เห็น lead ที่ยินยอมแล้ว</div>
      </div>
    </section>

    <div class="grid g3" style="margin-top:20px">
      <div class="card kpi"><div class="num">${fmtNum(s.attendees.length)}</div><div class="lbl">ลงทะเบียน (ข้อมูลตัวอย่าง)</div></div>
      <div class="card kpi dark"><div class="num">${fmtNum(inside)}</div><div class="lbl">เข้างานแล้ว</div></div>
      <div class="card kpi coral"><div class="num">${fmtNum(s.boothScans.length)}</div><div class="lbl">การสแกนที่บูธ</div></div>
    </div>

    <h2 style="margin:36px 0 14px;font-size:22px">เลือกบทบาทเพื่อลองใช้</h2>
    <div class="grid g3">
      ${TILES.map(([tag, title, body, href, cta]) => `
        <a class="tile" href="${href}"><span class="tag">${tag}</span><h3>${title}</h3><p>${body}</p><span class="go">${cta} →</span></a>`).join('')}
      <div class="tile" style="background:var(--teal-soft)">
        <span class="tag">RESET.-</span><h3>เริ่ม demo ใหม่</h3>
        <p>ล้างข้อมูลที่ลองทำไว้ แล้วโหลดข้อมูลตัวอย่างชุดเดิมกลับมา</p>
        <button class="btn ghost sm" id="reset" style="margin-top:auto;align-self:start">รีเซ็ตข้อมูล</button>
      </div>
    </div>

    <p class="muted small" style="margin-top:28px">โค้ดและเอกสารออกแบบระบบ: <a href="https://github.com/nidss/ev">github.com/nidss/ev</a>
      · ระบบจริงจะใช้ server + ฐานข้อมูลตาม <a href="https://github.com/nidss/ev/blob/main/docs/ARCHITECTURE.md">ARCHITECTURE.md</a></p>`;
  },
  mount(root) {
    root.querySelector('#reset').addEventListener('click', () => {
      if (!confirm('ล้างข้อมูลที่ลองทำไว้ทั้งหมดในเบราว์เซอร์นี้?')) return;
      store.reset();
      try { localStorage.removeItem('ev-demo-me'); } catch {}
      toast('รีเซ็ตข้อมูลแล้ว', 'ok');
      location.hash = '#/';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  },
};
