/* StreamBill - Pricing page logic. Cards are built once; the Monthly/Yearly toggle only updates their text. */
(async () => {
  const $ = s => document.querySelector(s);
  const { plans, features } = await DataService.getPricingPlans();
  let current = await DataService.getCurrentPlan();
  let cycle = (await DataService.getPrefs()).pricingCycle === 'yearly' ? 'yearly' : 'monthly';
  const grid = $('#pricingGrid');

  const price = (p, c) => c === 'yearly' ? p.yearlyPrice : p.monthlyPrice;
  const monthlyEq = (p, c) => c === 'yearly' ? p.yearlyPrice / 12 : p.monthlyPrice;
  const saving = p => p.monthlyPrice * 12 - p.yearlyPrice;
  const planById = id => plans.find(p => p.id === id);
  const cycleName = c => c === 'yearly' ? 'Yearly' : 'Monthly';
  const mark = (v, label) => v ? `<span class="mark yes" aria-hidden="true">✓</span><span>${SB.esc(typeof v === 'string' ? v : label)}</span>`
    : `<span class="mark" aria-hidden="true">—</span><span><span class="sb-sr">Not included: </span>${SB.esc(label)}</span>`;

  grid.innerHTML = plans.map(p => `<article class="sb-card pricing-card ${p.popular ? 'is-popular' : ''}" data-plan="${p.id}">
    ${p.popular ? '<span class="pc-badge">Most popular</span>' : ''}
    <h3>${SB.esc(p.name)}</h3><p class="pc-desc">${SB.esc(p.description)}</p>
    <div class="pc-price-row"><span class="pc-price"></span><span class="pc-per"></span></div><p class="pc-note"></p>
    <ul class="pc-features">${features.map(f => `<li class="${p.features[f.key] ? '' : 'off'}">${mark(p.features[f.key], f.label)}</li>`).join('')}</ul>
    <button type="button" class="sb-btn ${p.popular ? 'sb-btn-primary' : ''} sb-btn-block" data-choose="${p.id}"></button></article>`).join('');

  $('#compareTable').innerHTML = `<thead><tr><th scope="col">Feature</th>${plans.map(p => `<th scope="col" data-col="${p.id}">${SB.esc(p.name)}</th>`).join('')}</tr></thead>
    <tbody>${features.map(f => `<tr><th scope="row">${f.label}</th>${plans.map(p => { const v = p.features[f.key];
      return `<td data-col="${p.id}">${v ? `<span class="yes" aria-hidden="true">✓</span>${typeof v === 'string' ? ' ' + SB.esc(v) : ''}<span class="sb-sr">${typeof v === 'string' ? '' : 'Included'}</span>` : '<span class="no" aria-hidden="true">—</span><span class="sb-sr">Not included</span>'}</td>`; }).join('')}</tr>`).join('')}</tbody>`;

  const bump = el => { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); };

  function update(animate) {
    $('#pricingToggle').dataset.cycle = cycle;
    document.querySelectorAll('#pricingToggle button').forEach(b => b.setAttribute('aria-pressed', b.dataset.cycle === cycle));
    const cur = planById(current.planId);
    $('#pricingCurrent').textContent = cur ? `Your current plan: ${cur.name} · ${cycleName(current.cycle)}` : 'You have no active StreamBill plan';
    plans.forEach((p, i) => {
      const card = grid.querySelector(`[data-plan="${p.id}"]`), pr = card.querySelector('.pc-price'), note = card.querySelector('.pc-note');
      pr.textContent = SB.fmtINR(price(p, cycle)); card.querySelector('.pc-per').textContent = cycle === 'yearly' ? '/year' : '/month';
      note.textContent = cycle === 'yearly' ? `${SB.fmtINR(monthlyEq(p, 'yearly'))}/month · Save ${SB.fmtINR(saving(p))} a year` : `Save ${SB.fmtINR(saving(p))} a year with yearly billing`;
      if (animate) { bump(pr); bump(note); }
      const btn = card.querySelector('[data-choose]'), isCur = cur && cur.id === p.id && current.cycle === cycle;
      const curIdx = cur ? plans.indexOf(cur) : -1;
      btn.textContent = isCur ? 'Current plan' : !cur ? 'Choose plan' : cur.id === p.id ? `Switch to ${cycle}` : i > curIdx ? 'Upgrade' : 'Downgrade';
      btn.disabled = !!isCur; btn.setAttribute('aria-label', isCur ? `${p.name} is your current plan` : `${btn.textContent}: ${p.name}, ${cycleName(cycle)}`);
    });
    document.querySelectorAll('[data-col]').forEach(c => c.classList.toggle('is-current', !!cur && c.dataset.col === cur.id));
  }

  $('#pricingToggle').addEventListener('click', e => {
    const b = e.target.closest('button[data-cycle]'); if (!b || b.dataset.cycle === cycle) return;
    cycle = b.dataset.cycle; DataService.setPrefs({ pricingCycle: cycle }); update(true);
  });

  grid.addEventListener('click', async e => {
    const b = e.target.closest('[data-choose]'); if (!b || b.disabled) return;
    const next = planById(b.dataset.choose), cur = planById(current.planId), nc = cycle;
    const diff = Math.round(monthlyEq(next, nc) - (cur ? monthlyEq(cur, current.cycle) : 0));
    const per = nc === 'yearly' ? '/year' : '/month';
    const diffTxt = !cur ? SB.fmtINR(price(next, nc)) + per : (diff === 0 ? 'No change' : (diff > 0 ? '+' : '−') + SB.fmtINR(Math.abs(diff)) + '/month');
    const ok = await SB.confirm({ title: 'Confirm plan change', confirmLabel: 'Confirm Change', cancelLabel: 'Cancel',
      bodyHTML: `<div class="change-flow"><div><small>Current plan</small><strong>${cur ? SB.esc(cur.name) : 'None'}</strong><span>${cur ? SB.fmtINR(price(cur, current.cycle)) + (current.cycle === 'yearly' ? '/year' : '/month') : '—'}</span></div>
        <span class="arrow" aria-hidden="true">→</span><div class="is-new"><small>New plan</small><strong>${SB.esc(next.name)}</strong><span>${SB.fmtINR(price(next, nc))}${per}</span></div></div>
        <dl class="md-grid"><div><dt>Price difference</dt><dd>${diffTxt}</dd></div><div><dt>Billing cycle</dt><dd>${cycleName(nc)}</dd></div></dl>
        <p style="color:var(--sb-muted);font-size:.85rem;margin:0">Demo only: no payment is taken.</p>` });
    if (!ok) return;
    current = await DataService.setCurrentPlan(next.id, nc); update(false);
    SB.toast(`Plan changed to ${next.name} (${cycleName(nc)})`);
  });

  update(false); SB.icons();
})();
