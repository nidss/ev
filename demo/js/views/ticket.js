import { store, findByCode, setShareConsent, ticketType, sponsorOf, byId } from '../store.js';
import { signTicket } from '../token.js';
import { qrSvg } from '../qr.js';
import { t, tx, getLang, langToggle } from '../i18n.js';
import { esc, fmtTime, toast, $ } from '../ui.js';

export default {
  render(code) {
    const a = findByCode(code);
    if (!a) return `<div class="narrow card"><h1>${t('notFound')}</h1><p class="sub">${esc(code)}</p></div>`;
    const s = store.get();
    const tt = ticketType(a.ticketTypeId);
    const visited = [...new Set(s.boothScans.filter((x) => x.attendeeId === a.id).map((x) => x.boothId))].map((id) => byId('booths', id));
    return `
    <div class="narrow stack">
      <div class="row"><h1 style="font-size:28px">${t('yourTicket')}</h1><span class="spacer"></span>${langToggle()}</div>
      <article class="ticket">
        <div class="ticket-top">
          <div><p class="eyebrow" style="color:var(--coral)">${esc(s.event.name[getLang()])}</p><h2>${esc(a.firstName)} ${esc(a.lastName)}</h2><p style="color:#B8C9D3">${esc(a.company)}</p></div>
          <span class="badge" style="background:${tt.color};color:#fff">${esc(tx(tt.name))}</span>
        </div>
        <div class="ticket-qr"><div id="qr" style="width:240px;height:240px"></div><div class="code">${esc(a.ticketCode)}</div></div>
        <div class="ticket-bottom">
          <p>${t('showAtGate')}</p>
          <p>${a.firstCheckedInAt ? `<span class="badge ok">${t('checkedIn')} ${fmtTime(a.firstCheckedInAt)}</span>` : `<span class="badge">${t('notCheckedIn')}</span>`}
             ${a.rfidUid ? ` <span class="badge dark" style="background:var(--teal)">${t('wristband')} · ${esc(a.rfidUid)}</span>` : ''}</p>
        </div>
      </article>
      <div class="row">
        <button class="btn ghost sm" data-fake="wallet">${t('addWallet')}</button>
        <button class="btn ghost sm" data-fake="line">${t('sendLine')}</button>
      </div>
      <section class="card">
        <h2>${t('privacy')}</h2>
        <p class="sub" style="margin:0 0 12px">${a.consents.share ? t('shareOn') : t('shareOff')}</p>
        <button class="btn sm ${a.consents.share ? 'ghost' : 'teal'}" id="consent">${a.consents.share ? t('turnOff') : t('turnOn')}</button>
      </section>
      ${visited.length ? `<section class="card"><h2>${t('boothsVisited')}</h2><div class="stack" style="gap:8px">${visited.map((b) => `<a href="#/b/${b.slug}">${esc(b.code)} · ${esc(sponsorOf(b).name)}</a>`).join('')}</div></section>` : ''}
    </div>`;
  },
  mount(root, code) {
    const a = findByCode(code);
    if (!a) return;
    try { localStorage.setItem('ev-demo-me', a.ticketCode); } catch {}
    signTicket(a).then((tok) => { $('#qr', root).innerHTML = qrSvg(tok, { size: 240 }); $('#qr', root).title = tok; });
    $('#consent', root).addEventListener('click', () => {
      setShareConsent(a.id, !a.consents.share);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    root.querySelectorAll('[data-fake]').forEach((b) => b.addEventListener('click', () => toast(getLang() === 'th' ? 'ระบบจริงจะส่งบัตรผ่านช่องทางนี้' : 'The real system sends the ticket here')));
  },
};
