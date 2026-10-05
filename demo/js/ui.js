export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const fmtTime = (t) => new Date(t).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
export const fmtDateTime = (t) => new Date(t).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const fmtNum = (n) => Number(n).toLocaleString('en-US');
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export function toast(msg, kind = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2600);
}

export function download(filename, text, type = 'text/csv') {
  const blob = new Blob(['﻿' + text], { type: `${type};charset=utf-8` });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function toCsv(rows) {
  return rows.map((r) => r.map((v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
}

export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const split = (line) => {
    const out = []; let cur = ''; let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const head = split(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [head[i], v])));
}

// Horizontal bar list: [{label, value, color?}]
export function bars(items, { max } = {}) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return `<div class="bars">${items.map((i) => `
    <div class="bar-row"><span class="bar-label">${esc(i.label)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${(i.value / top) * 100}%;${i.color ? `background:${i.color}` : ''}"></span></span>
      <span class="bar-value">${esc(i.text ?? fmtNum(i.value))}</span></div>`).join('')}</div>`;
}

export const NATIONS = { TH: 'ไทย', JP: 'ญี่ปุ่น', VN: 'เวียดนาม', CN: 'จีน', IN: 'อินเดีย', IT: 'อิตาลี', KR: 'เกาหลีใต้', MY: 'มาเลเซีย', FR: 'ฝรั่งเศส', SG: 'สิงคโปร์', GB: 'สหราชอาณาจักร', DE: 'เยอรมนี', PH: 'ฟิลิปปินส์', AU: 'ออสเตรเลีย', HK: 'ฮ่องกง', US: 'สหรัฐอเมริกา', LA: 'ลาว', MM: 'เมียนมา', KH: 'กัมพูชา', ID: 'อินโดนีเซีย' };
