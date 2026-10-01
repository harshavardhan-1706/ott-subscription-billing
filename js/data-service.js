/* StreamBill - DataService (mock/local). Every method returns a Promise so a real backend
   (fetch('/api/...')) can replace the bodies later without touching the UI code.
   All data is SAMPLE data for a college project - not real OTT account data. */
const DataService = (() => {
  const KEYS = { subs: 'streambill.subscriptions.v1', plan: 'streambill.currentPlan.v1', prefs: 'streambill.prefs.v1' };
  const YEARLY_MONTHS_CHARGED = 10; // platform plans: yearly = 10 x monthly

  const pricingData = {
    features: [
      { key: 'hd', label: 'HD Streaming' }, { key: 'fhd', label: 'Full HD Streaming' }, { key: '4k', label: '4K Streaming' },
      { key: 'devices', label: 'Multiple Devices' }, { key: 'adfree', label: 'Ad-free experience' },
      { key: 'offline', label: 'Offline downloads' }, { key: 'family', label: 'Family sharing' }, { key: 'support', label: 'Priority support' }
    ],
    plans: [
      { id: 'basic', name: 'Basic', description: 'Everything you need to start tracking and streaming.', monthlyPrice: 199, yearlyPrice: 1990, popular: false,
        features: { hd: true, fhd: false, '4k': false, devices: '1 device', adfree: false, offline: false, family: false, support: false } },
      { id: 'standard', name: 'Standard', description: 'Sharper picture and more screens for everyday viewing.', monthlyPrice: 399, yearlyPrice: 3990, popular: true,
        features: { hd: true, fhd: true, '4k': false, devices: '2 devices', adfree: true, offline: true, family: false, support: false } },
      { id: 'premium', name: 'Premium', description: 'The full experience for the whole household.', monthlyPrice: 699, yearlyPrice: 6990, popular: false,
        features: { hd: true, fhd: true, '4k': true, devices: '4 devices', adfree: true, offline: true, family: true, support: true } }
    ]
  };

  const platformPlans = {
    'Netflix': { color: '#7a0c14', plans: { Mobile: 149, Basic: 199, Standard: 499, Premium: 649 } },
    'Amazon Prime Video': { color: '#0f3a52', plans: { Lite: 125, Prime: 299 } },
    'JioHotstar': { color: '#2b1a52', plans: { Mobile: 149, Super: 299, Premium: 499 } },
    'SonyLIV': { color: '#1c2a4f', plans: { Mobile: 149, Premium: 399 } },
    'ZEE5': { color: '#4a1450', plans: { 'Premium HD': 99, 'Premium 4K': 149 } },
    'Apple TV+': { color: '#2a2a2e', plans: { Standard: 99 } },
    'YouTube Premium': { color: '#8f0f1d', plans: { Individual: 149, Family: 299, Student: 89 } }
  };

  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const daysFromNow = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const priceFor = (platform, plan, cycle) => {
    const m = (platformPlans[platform] || { plans: {} }).plans[plan] || 0;
    return cycle === 'Yearly' ? m * YEARLY_MONTHS_CHARGED : m;
  };
  const clone = v => JSON.parse(JSON.stringify(v));
  const read = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };

  const seed = () => [
    ['Netflix', 'Premium', 'Monthly', 5, 'Active', true], ['Amazon Prime Video', 'Prime', 'Monthly', 12, 'Active', true],
    ['JioHotstar', 'Super', 'Monthly', 3, 'Active', true], ['SonyLIV', 'Premium', 'Yearly', 95, 'Active', true],
    ['ZEE5', 'Premium HD', 'Monthly', 8, 'Active', false], ['Apple TV+', 'Standard', 'Monthly', null, 'Cancelled', false],
    ['YouTube Premium', 'Family', 'Monthly', 18, 'Active', true]
  ].map((r, i) => ({ id: i + 1, platform: r[0], plan: r[1], billingCycle: r[2], price: priceFor(r[0], r[1], r[2]),
    nextBilling: r[3] === null ? null : daysFromNow(r[3]), status: r[4], autoRenew: r[5], color: platformPlans[r[0]].color }));

  const load = () => { let s = read(KEYS.subs, null); if (!s) { s = seed(); write(KEYS.subs, s); } return s; };
  const mutate = (id, fn) => {
    const subs = load(); const sub = subs.find(x => x.id === Number(id));
    if (!sub) return Promise.reject(new Error('Subscription not found'));
    fn(sub); write(KEYS.subs, subs); return Promise.resolve(clone(sub));
  };
  const addCycle = cycle => { const d = new Date(); if (cycle === 'Yearly') d.setFullYear(d.getFullYear() + 1); else d.setMonth(d.getMonth() + 1); return iso(d); };

  return {
    priceFor, platformPlans,
    getSubscriptions: () => Promise.resolve(clone(load())),
    getPricingPlans: () => Promise.resolve(clone(pricingData)),
    updateSubscription: (id, changes) => mutate(id, s => Object.assign(s, changes)),
    cancelSubscription: id => mutate(id, s => { s.status = 'Cancelled'; s.autoRenew = false; s.nextBilling = null; }),
    reactivateSubscription: id => mutate(id, s => { s.status = 'Active'; s.autoRenew = true; s.nextBilling = addCycle(s.billingCycle); }),
    getCurrentPlan: () => Promise.resolve(read(KEYS.plan, { planId: 'standard', cycle: 'monthly' })),
    setCurrentPlan: (planId, cycle) => { write(KEYS.plan, { planId, cycle }); return Promise.resolve({ planId, cycle }); },
    getPrefs: () => Promise.resolve(read(KEYS.prefs, {})),
    setPrefs: p => { const n = Object.assign(read(KEYS.prefs, {}), p); write(KEYS.prefs, n); return Promise.resolve(n); },
    resetDemoData: () => { Object.values(KEYS).forEach(k => { try { localStorage.removeItem(k); } catch (e) {} }); return Promise.resolve(); }
  };
})();
if (typeof module !== 'undefined') module.exports = DataService;
