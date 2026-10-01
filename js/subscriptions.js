/* StreamBill - Subscriptions page logic. Depends on DataService + SB. */
(() => {
  const $ = s => document.querySelector(s);
  const state = { subs: [], q: '', status: 'all', cycle: 'all', sort: 'name', changedId: null, manageId: null };
  const modal = $('#manageModal');

  const stats = subs => {
    const active = subs.filter(s => s.status === 'Active');
    return {
      total: subs.length, active: active.length,
      monthly: active.reduce((sum, s) => sum + (s.billingCycle === 'Yearly' ? s.price / 12 : s.price), 0),
      upcoming: active.filter(s => s.autoRenew && s.nextBilling && SB.daysUntil(s.nextBilling) >= 0 && SB.daysUntil(s.nextBilling) <= 14).length
    };
  };
  const per = s => s.billingCycle === 'Yearly' ? '/year' : '/month';
  const stClass = s => 'st-' + s.status.toLowerCase();

  function renderSummary() {
    const t = stats(state.subs);
    const items = [['tv', t.total, 'Total subscriptions'], ['check-circle-2', t.active, 'Active subscriptions'],
      ['indian-rupee', SB.fmtINR(t.monthly), 'Monthly subscription cost'], ['calendar-clock', t.upcoming, 'Upcoming renewals (14 days)']];
    $('#subscriptionSummary').innerHTML = items.map(i => `<article class="sb-card summary-card"><span class="sc-icon"><i data-lucide="${i[0]}" aria-hidden="true"></i></span><strong>${i[1]}</strong><span>${i[2]}</span></article>`).join('');
  }

  function visible() {
    const q = state.q.trim().toLowerCase();
    const list = state.subs.filter(s => (!q || (s.platform + ' ' + s.plan).toLowerCase().includes(q))
      && (state.status === 'all' || s.status === state.status) && (state.cycle === 'all' || s.billingCycle === state.cycle));
    const by = { name: (a, b) => a.platform.localeCompare(b.platform), 'price-desc': (a, b) => b.price - a.price, 'price-asc': (a, b) => a.price - b.price,
      date: (a, b) => (a.nextBilling || '9999').localeCompare(b.nextBilling || '9999') };
    return list.sort(by[state.sort]);
  }

  function cardHTML(s) {
    const active = s.status === 'Active';
    const switchOrBtn = active
      ? `<div class="sc-renew"><button type="button" class="sb-switch" role="switch" aria-checked="${s.autoRenew}" data-action="toggle" data-id="${s.id}" aria-label="Auto-renew for ${SB.esc(s.platform)}"></button>Auto-renew ${s.autoRenew ? 'ON' : 'OFF'}</div>`
      : `<div class="sc-renew">Auto-renew OFF</div>`;
    const second = active ? '' : `<button type="button" class="sb-btn sb-btn-primary" data-action="reactivate" data-id="${s.id}">Reactivate</button>`;
    return `<article class="sb-card subscription-card ${active ? '' : 'is-inactive'} ${state.changedId === s.id ? 'is-changed' : ''}" data-id="${s.id}">
      <div class="sc-top"><span class="sc-logo" style="--logo:${s.color}" aria-hidden="true">${SB.esc(s.platform[0])}</span>
        <div><h3>${SB.esc(s.platform)}</h3><p>${SB.esc(s.plan)} Plan</p></div><span class="sc-status ${stClass(s)}">${s.status}</span></div>
      <div class="sc-price"><strong>${SB.fmtINR(s.price)}</strong><span>${per(s)}</span></div>
      <dl class="sc-meta"><div><dt>${s.autoRenew ? 'Next billing' : (active ? 'Ends on' : 'Next billing')}</dt><dd>${active ? SB.fmtDate(s.nextBilling) : '—'}</dd></div>
        <div><dt>Billing cycle</dt><dd>${s.billingCycle}</dd></div></dl>
      <div class="sc-foot">${switchOrBtn}<div class="sc-actions">${second}<button type="button" class="sb-btn" data-action="manage" data-id="${s.id}" aria-label="Manage ${SB.esc(s.platform)} subscription">Manage</button></div></div></article>`;
  }

  function renderGrid() {
    const list = visible();
    $('#subscriptionGrid').innerHTML = list.length ? list.map(cardHTML).join('')
      : `<div class="sb-empty"><h3>No subscriptions match</h3><p>Try a different search or clear your filters.</p><button type="button" class="sb-btn" id="clearFilters">Clear filters</button></div>`;
    state.changedId = null;
  }

  function render() { renderSummary(); renderGrid(); SB.icons(); }
  const find = id => state.subs.find(s => s.id === Number(id));
  async function reload(changedId) { state.subs = await DataService.getSubscriptions(); state.changedId = changedId || null; render(); }

  /* ---- Manage modal ---- */
  function renderManage() {
    const s = find(state.manageId); if (!s) return;
    const active = s.status === 'Active';
    const logo = $('#manageLogo'); logo.textContent = s.platform[0]; logo.style.setProperty('--logo', s.color);
    $('#manageTitle').textContent = s.platform;
    const st = $('#manageStatus'); st.textContent = s.status; st.className = 'sc-status ' + stClass(s);
    const plans = DataService.platformPlans[s.platform].plans;
    $('#manageBody').innerHTML = `
      <dl class="md-grid"><div><dt>OTT platform</dt><dd>${SB.esc(s.platform)}</dd></div><div><dt>Current plan</dt><dd>${SB.esc(s.plan)}</dd></div>
        <div><dt>Current price</dt><dd>${SB.fmtINR(s.price)}${per(s)}</dd></div><div><dt>Billing cycle</dt><dd>${s.billingCycle}</dd></div>
        <div><dt>Next billing date</dt><dd>${active ? SB.fmtDate(s.nextBilling) : '—'}</dd></div></dl>
      <div class="md-row"><span id="mdRenewLabel">Auto-renew ${s.autoRenew ? 'ON' : 'OFF'}</span>
        <button type="button" class="sb-switch" role="switch" aria-checked="${s.autoRenew}" aria-labelledby="mdRenewLabel" data-md="toggle" ${active ? '' : 'disabled'}></button></div>
      <div class="md-plan-panel" id="mdPlanPanel" hidden>
        <label for="mdPlan">Plan</label><select id="mdPlan" class="sb-field">${Object.keys(plans).map(p => `<option ${p === s.plan ? 'selected' : ''}>${SB.esc(p)}</option>`).join('')}</select>
        <label for="mdCycle">Billing cycle</label><select id="mdCycle" class="sb-field">${['Monthly', 'Yearly'].map(c => `<option ${c === s.billingCycle ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <strong id="mdPreview"></strong>
        <button type="button" class="sb-btn sb-btn-primary" data-md="save-plan">Save plan</button></div>
      <div class="md-actions">${active
        ? '<button type="button" class="sb-btn" data-md="change" aria-expanded="false" aria-controls="mdPlanPanel">Change Plan</button><button type="button" class="sb-btn sb-btn-danger" data-md="cancel">Cancel Subscription</button>'
        : '<button type="button" class="sb-btn sb-btn-primary" data-md="reactivate">Reactivate Subscription</button>'}</div>`;
    SB.icons();
  }
  const preview = () => { const s = find(state.manageId), el = $('#mdPreview'); if (!el) return;
    el.textContent = 'New price: ' + SB.fmtINR(DataService.priceFor(s.platform, $('#mdPlan').value, $('#mdCycle').value)) + ($('#mdCycle').value === 'Yearly' ? '/year' : '/month'); };

  function openManage(id) { state.manageId = Number(id); renderManage(); SB.openModal(modal); }

  async function toggleRenew(id) {
    const s = find(id); await DataService.updateSubscription(id, { autoRenew: !s.autoRenew });
    await reload(Number(id)); if (modal.classList.contains('is-open')) renderManage();
    SB.toast(`Auto-renew turned ${s.autoRenew ? 'OFF' : 'ON'} for ${s.platform}`);
  }
  async function reactivate(id) {
    const s = find(id); await DataService.reactivateSubscription(id); await reload(Number(id));
    if (modal.classList.contains('is-open')) renderManage(); SB.toast(`${s.platform} reactivated`);
  }

  $('#subscriptionGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-action]'); if (b) { const a = b.dataset.action;
      if (a === 'manage') openManage(b.dataset.id); else if (a === 'toggle') toggleRenew(b.dataset.id); else if (a === 'reactivate') reactivate(b.dataset.id); return; }
    if (e.target.id === 'clearFilters') resetFilters();
  });

  modal.addEventListener('click', async e => {
    const b = e.target.closest('[data-md]'); if (!b) return; const s = find(state.manageId);
    if (b.dataset.md === 'toggle') toggleRenew(s.id);
    else if (b.dataset.md === 'reactivate') reactivate(s.id);
    else if (b.dataset.md === 'change') { const p = $('#mdPlanPanel'); p.hidden = !p.hidden; b.setAttribute('aria-expanded', !p.hidden); preview(); if (!p.hidden) $('#mdPlan').focus(); }
    else if (b.dataset.md === 'save-plan') {
      const plan = $('#mdPlan').value, cycle = $('#mdCycle').value;
      if (plan === s.plan && cycle === s.billingCycle) { SB.toast('That is already your current plan'); return; }
      const price = DataService.priceFor(s.platform, plan, cycle);
      await DataService.updateSubscription(s.id, { plan, billingCycle: cycle, price }); await reload(s.id); renderManage(); SB.toast(`${s.platform} plan updated to ${plan} (${cycle})`);
    } else if (b.dataset.md === 'cancel') {
      const ok = await SB.confirm({ title: `Cancel ${s.platform}?`, danger: true, confirmLabel: 'Yes, cancel subscription', cancelLabel: 'Keep subscription',
        bodyHTML: `<p>Your ${SB.esc(s.plan)} plan will be deactivated and auto-renew will be switched off. You can reactivate it later from this page.</p>` });
      if (!ok) return; await DataService.cancelSubscription(s.id); SB.closeModal(modal); await reload(s.id); SB.toast(`${s.platform} subscription cancelled`);
    }
  });
  modal.addEventListener('change', e => { if (e.target.id === 'mdPlan' || e.target.id === 'mdCycle') preview(); });

  /* ---- filters ---- */
  const persist = () => DataService.setPrefs({ subscriptions: { q: state.q, status: state.status, cycle: state.cycle, sort: state.sort } });
  function syncControls() { $('#subSearch').value = state.q; $('#subStatus').value = state.status; $('#subCycle').value = state.cycle; $('#subSort').value = state.sort; }
  function resetFilters() { Object.assign(state, { q: '', status: 'all', cycle: 'all', sort: 'name' }); syncControls(); persist(); renderGrid(); SB.icons(); }
  [['#subSearch', 'q', 'input'], ['#subStatus', 'status', 'change'], ['#subCycle', 'cycle', 'change'], ['#subSort', 'sort', 'change']].forEach(([sel, key, ev]) =>
    $(sel).addEventListener(ev, e => { state[key] = e.target.value; persist(); renderGrid(); SB.icons(); }));

  (async function init() {
    state.subs = await DataService.getSubscriptions();
    const statuses = [...new Set(['Active', 'Cancelled', ...state.subs.map(s => s.status)])];
    $('#subStatus').innerHTML = '<option value="all">All statuses</option>' + statuses.map(s => `<option>${s}</option>`).join('');
    const prefs = (await DataService.getPrefs()).subscriptions; if (prefs) Object.assign(state, prefs);
    syncControls(); render();
  })();
})();
