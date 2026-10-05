// What an attendee sees after pointing their phone camera at a booth QR.
import { boothBySlug, sponsorOf, findByCode, recordBoothScan } from '../store.js';
import { t, tx, langToggle } from '../i18n.js';
import { esc, $ } from '../ui.js';

const me = () => { try { return findByCode(localStorage.getItem('ev-demo-me') || ''); } catch { return null; } };

export default {
  render(slug) {
    const b = boothBySlug(slug);
    if (!b) return `<div class="narrow card"><h1>Booth not found</h1></div>`;
    const sp = sponsorOf(b);
    const a = me();
    return `
    <div class="narrow stack">
      <div class="row"><span class="spacer"></span>${langToggle()}</div>
      <section class="booth-hero">
        <p class="tier">${esc(sp.tier.toUpperCase())} · BOOTH ${esc(b.code)}</p>
        <h1>${esc(sp.name)}</h1>
        <p>${esc(tx(sp.description))}</p>
        <p style="margin-top:12px"><a href="${esc(sp.website)}" target="_blank" rel="noopener" style="color:var(--navy);font-weight:600">${t('visitWebsite')} ↗</a></p>
      </section>
      ${a ? `
        <p class="muted">${esc(a.firstName)} ${esc(a.lastName)} · ${esc(a.ticketCode)}</p>
        <button class="btn coral block" data-act="interested">${t('interested')}</button>
        <button class="btn ghost block" data-act="request_info">${t('requestInfo')}</button>
        <p id="done" class="card" hidden></p>`
      : `
        <form id="who" class="card stack">
          <label class="field"><span>${t('whoAreYou')}</span><input class="input mono" name="code" placeholder="EV-XXXX-XXXX" autocomplete="off"></label>
          <p class="muted small">${t('whoAreYouHint')}</p>
          <p class="form-error" id="err" role="alert"></p>
          <button class="btn">${t('confirm')}</button>
        </form>`}
    </div>`;
  },
  mount(root, slug) {
    const b = boothBySlug(slug);
    if (!b) return;
    const who = $('#who', root);
    if (who) {
      who.addEventListener('submit', (e) => {
        e.preventDefault();
        const a = findByCode(who.code.value);
        if (!a) { $('#err', root).textContent = t('notFound'); return; }
        try { localStorage.setItem('ev-demo-me', a.ticketCode); } catch {}
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      return;
    }
    const a = me();
    root.querySelectorAll('[data-act]').forEach((btn) => btn.addEventListener('click', () => {
      recordBoothScan(b.id, a.id, 'attendee_qr', btn.dataset.act);
      const done = $('#done', root);
      done.hidden = false;
      done.textContent = a.consents.share ? t('thanks') : t('thanksNoShare');
      root.querySelectorAll('[data-act]').forEach((x) => { x.disabled = true; });
    }));
  },
};
