import { store, register, issuedCount } from '../store.js';
import { t, tx, getLang, langToggle } from '../i18n.js';
import { INTERESTS } from '../seed.js';
import { esc, NATIONS, $ } from '../ui.js';

export default {
  render() {
    const s = store.get();
    const lang = getLang();
    const types = s.ticketTypes.filter((tt) => tt.isPublic);
    return `
    <div class="narrow stack">
      <div class="row"><div><p class="eyebrow">${esc(s.event.name[lang])}</p><h1 style="font-size:30px">${t('registerTitle')}</h1></div><span class="spacer"></span>${langToggle()}</div>
      <form id="reg" class="card stack" novalidate>
        <div class="grid g2">
          <label class="field"><span>${t('firstName')} *</span><input class="input" name="firstName" required autocomplete="given-name"></label>
          <label class="field"><span>${t('lastName')} *</span><input class="input" name="lastName" required autocomplete="family-name"></label>
        </div>
        <label class="field"><span>${t('email')} *</span><input class="input" type="email" name="email" required autocomplete="email"></label>
        <label class="field"><span>${t('phone')}</span><input class="input" type="tel" name="phone" autocomplete="tel" placeholder="+66 ..."></label>
        <div class="grid g2">
          <label class="field"><span>${t('company')}</span><input class="input" name="company" autocomplete="organization"></label>
          <label class="field"><span>${t('jobTitle')}</span><input class="input" name="jobTitle" autocomplete="organization-title"></label>
        </div>
        <div class="grid g2">
          <label class="field"><span>${t('nationality')} *</span>
            <select class="select input" name="nationality">${Object.entries(NATIONS).map(([k, v]) => `<option value="${k}">${lang === 'th' ? v : k}</option>`).join('')}</select></label>
          <label class="field"><span>${t('idDoc')}</span>
            <select class="select input" name="idDocType"><option value="thai_id">${t('thaiId')}</option><option value="passport">${t('passport')}</option></select></label>
        </div>
        <label class="field"><span>${t('ticketType')} *</span>
          <select class="select input" name="ticketTypeId">${types.map((tt) => {
            const left = tt.quota ? tt.quota - issuedCount(tt.id) : null;
            return `<option value="${tt.id}" ${left === 0 ? 'disabled' : ''}>${esc(tx(tt.name))}${left !== null ? ` · ${left.toLocaleString()} left` : ''}</option>`;
          }).join('')}</select></label>
        <fieldset class="field" style="border:0;padding:0;margin:0"><legend style="font-weight:600;font-size:14px;margin-bottom:6px">${t('interests')}</legend>
          <div class="chips">${INTERESTS.map((i) => `<label class="chip"><input type="checkbox" name="interests" value="${i.value}"><span>${esc(tx(i.label))}</span></label>`).join('')}</div>
        </fieldset>
        <hr style="border:0;border-top:1px solid var(--line);width:100%">
        <label class="check"><input type="checkbox" name="terms" required><span>${t('consentTerms')} *</span></label>
        <label class="check"><input type="checkbox" name="share"><span>${t('consentShare')} <span class="muted">(${t('optional')})</span></span></label>
        <label class="check"><input type="checkbox" name="marketing"><span>${t('consentMarketing')} <span class="muted">(${t('optional')})</span></span></label>
        <p class="form-error" id="err" role="alert"></p>
        <button class="btn coral block" type="submit">${t('submit')}</button>
      </form>
    </div>`;
  },
  mount(root) {
    const form = $('#reg', root);
    form.nationality.addEventListener('change', () => { form.idDocType.value = form.nationality.value === 'TH' ? 'thai_id' : 'passport'; });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const err = $('#err', root);
      const email = String(f.get('email') || '').trim();
      if (!f.get('firstName') || !f.get('lastName') || !/^\S+@\S+\.\S+$/.test(email) || !f.get('terms')) { err.textContent = t('required'); return; }
      const res = register({
        firstName: f.get('firstName'), lastName: f.get('lastName'), email, phone: f.get('phone'),
        company: f.get('company'), jobTitle: f.get('jobTitle'), nationality: f.get('nationality'), idDocType: f.get('idDocType'),
        ticketTypeId: f.get('ticketTypeId'), interests: f.getAll('interests'),
        share: !!f.get('share'), marketing: !!f.get('marketing'), locale: getLang(),
      });
      if (res.error) { err.textContent = res.error === 'duplicate_email' ? t('dupEmail') : res.error === 'sold_out' ? t('soldOut') : res.error; return; }
      try { localStorage.setItem('ev-demo-me', res.attendee.ticketCode); } catch {}
      location.hash = `#/t/${res.attendee.ticketCode}`;
    });
  },
};
