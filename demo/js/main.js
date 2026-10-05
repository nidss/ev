import { store } from './store.js';
import { stopScanner } from './qr.js';
import { setLang } from './i18n.js';
import { $, esc } from './ui.js';
import home from './views/home.js';
import register from './views/register.js';
import ticket from './views/ticket.js';
import boothPage from './views/boothPage.js';
import checkin from './views/checkin.js';
import booth from './views/booth.js';
import sponsor from './views/sponsor.js';
import org from './views/org.js';

// [pattern, view, nav key]
const ROUTES = [
  [/^\/$/, home, 'home'],
  [/^\/register$/, register, 'register'],
  [/^\/t\/([\w-]+)$/, ticket, 'register'],
  [/^\/b\/([\w-]+)$/, boothPage, 'register'],
  [/^\/checkin$/, checkin, 'checkin'],
  [/^\/booth$/, booth, 'booth'],
  [/^\/sponsor$/, sponsor, 'sponsor'],
  [/^\/org(?:\/(\w+))?$/, org, 'org'],
];

const NAV = [
  ['home', '#/', 'ภาพรวม'],
  ['register', '#/register', 'ผู้เข้างาน'],
  ['checkin', '#/checkin', 'เช็คอิน'],
  ['booth', '#/booth', 'บูธ'],
  ['sponsor', '#/sponsor', 'Sponsor'],
  ['org', '#/org', 'ผู้จัดงาน'],
];

let cleanup = null;

async function route() {
  const path = location.hash.replace(/^#/, '').split('?')[0] || '/';
  const match = ROUTES.map(([re, view, nav]) => [path.match(re), view, nav]).find(([m]) => m);
  const [m, view, nav] = match || [[], home, 'home'];
  if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
  await stopScanner();

  const ev = store.get().event;
  $('#topbar').innerHTML = `
    <a class="brand" href="#/"><span class="logo">EV</span><span class="brand-text">${esc(ev.name.th)}</span></a>
    <nav class="nav">${NAV.map(([k, href, label]) => `<a href="${href}" class="${k === nav ? 'on' : ''}">${label}</a>`).join('')}</nav>
    <span class="demo-pill" title="ข้อมูลทั้งหมดเป็นข้อมูลตัวอย่าง เก็บในเบราว์เซอร์นี้เท่านั้น">DEMO</span>`;

  const root = $('#app');
  root.innerHTML = view.render(...m.slice(1));
  root.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  cleanup = view.mount ? view.mount(root, ...m.slice(1)) : null;
}

// Language buttons live inside attendee views; handle them once here.
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-lang]');
  if (b) { setLang(b.dataset.lang); route(); }
});

window.addEventListener('hashchange', route);
route();
