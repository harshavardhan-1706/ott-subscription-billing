/* StreamBill - small shared UI helpers (namespace SB): formatting, modals, confirm dialog, toasts, mobile nav. */
const SB = (() => {
  const fmtINR = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const fmtDate = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const daysUntil = s => Math.round((new Date(s + 'T00:00:00') - new Date(new Date().toDateString())) / 864e5);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icons = () => { if (window.lucide) window.lucide.createIcons(); };

  const toast = msg => {
    let box = document.querySelector('.sb-toasts');
    if (!box) { box = document.createElement('div'); box.className = 'sb-toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'sb-toast'; t.textContent = msg; box.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, 2800);
  };

  const stack = [];
  const focusable = el => [...el.querySelectorAll('button:not([disabled]),select,input,a[href]')].filter(n => n.offsetParent !== null);
  const openModal = el => {
    el._opener = document.activeElement; el.hidden = false; void el.offsetWidth; el.classList.add('is-open');
    stack.push(el); const f = focusable(el.querySelector('.sb-dialog')); (el.querySelector('[data-autofocus]') || f[0]).focus();
  };
  const closeModal = el => {
    if (!el.classList.contains('is-open')) return;
    el.classList.remove('is-open'); const i = stack.indexOf(el); if (i > -1) stack.splice(i, 1);
    setTimeout(() => { if (!el.classList.contains('is-open')) el.hidden = true; }, 230);
    if (el._opener && document.contains(el._opener)) el._opener.focus();
    if (el._onClose) el._onClose();
  };
  document.addEventListener('keydown', e => {
    const top = stack[stack.length - 1]; if (!top) return;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(top); }
    if (e.key === 'Tab') {
      const f = focusable(top); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  document.addEventListener('click', e => {
    if (e.target.classList && e.target.classList.contains('sb-modal')) closeModal(e.target);
    const c = e.target.closest('[data-close-modal]'); if (c) closeModal(c.closest('.sb-modal'));
  });

  /* Promise-based confirmation: resolves true on confirm, false on cancel / Esc / backdrop. */
  const confirm = ({ title, bodyHTML, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) => new Promise(resolve => {
    let el = document.getElementById('sbConfirmModal');
    if (!el) {
      el = document.createElement('div'); el.id = 'sbConfirmModal'; el.className = 'sb-modal'; el.hidden = true;
      el.innerHTML = '<div class="sb-dialog" role="alertdialog" aria-modal="true" aria-labelledby="sbConfirmTitle"><h2 id="sbConfirmTitle"></h2><div class="sb-confirm-body"></div><div class="md-actions"><button type="button" class="sb-btn" data-act="no"></button><button type="button" class="sb-btn" data-act="yes" data-autofocus></button></div></div>';
      document.body.appendChild(el);
    }
    el.querySelector('h2').textContent = title; el.querySelector('.sb-confirm-body').innerHTML = bodyHTML;
    const no = el.querySelector('[data-act=no]'), yes = el.querySelector('[data-act=yes]');
    no.textContent = cancelLabel; yes.textContent = confirmLabel; yes.className = 'sb-btn ' + (danger ? 'sb-btn-danger' : 'sb-btn-primary');
    let done = false; const finish = v => { if (done) return; done = true; el._onClose = null; resolve(v); };
    yes.onclick = () => { finish(true); closeModal(el); }; no.onclick = () => closeModal(el);
    el._onClose = () => finish(false); openModal(el);
  });

  const initShell = () => {
    const btn = document.getElementById('sbMenuBtn'), scrim = document.getElementById('sbScrim');
    const set = open => { document.body.classList.toggle('sb-nav-open', open); if (btn) btn.setAttribute('aria-expanded', open); };
    if (btn) btn.addEventListener('click', () => set(!document.body.classList.contains('sb-nav-open')));
    if (scrim) scrim.addEventListener('click', () => set(false));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
    icons();
  };
  document.addEventListener('DOMContentLoaded', initShell);
  return { fmtINR, fmtDate, daysUntil, esc, icons, toast, openModal, closeModal, confirm };
})();
