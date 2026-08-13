const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  // Load 1 — network, SW installs
  await page.goto('http://localhost:8902/Mining-Maths-/', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const l1 = await page.evaluate(() => ({
    cats: document.querySelectorAll('#catGrid .cat').length,
    tiles: document.querySelectorAll('#tiles .t').length,
    sw: navigator.serviceWorker.controller ? 'controlled' : (navigator.serviceWorker ? 'registered?' : 'none')
  }));
  const reg = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    return r ? { scope: r.scope, state: (r.active||r.installing||r.waiting||{}).state } : null;
  });
  const cacheKeys = await page.evaluate(async () => {
    const names = await caches.keys();
    const out = {};
    for (const n of names) { const c = await caches.open(n); out[n] = (await c.keys()).map(r => r.url); }
    return out;
  });
  console.log('LOAD1:', JSON.stringify(l1), 'REG:', JSON.stringify(reg));
  console.log('CACHES:', JSON.stringify(cacheKeys, null, 1));

  // Load 2 — should be served by SW from cache
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2000);
  const l2 = await page.evaluate(() => ({
    cats: document.querySelectorAll('#catGrid .cat').length,
    tiles: document.querySelectorAll('#tiles .t').length,
    controlled: !!navigator.serviceWorker.controller
  }));
  console.log('LOAD2:', JSON.stringify(l2));

  // Load 3 — fully offline
  await ctx.setOffline(true);
  await page.reload({ waitUntil: 'load' }).catch(e => console.log('offline reload failed:', e.message));
  await page.waitForTimeout(2000);
  const l3 = await page.evaluate(() => ({
    cats: document.querySelectorAll('#catGrid .cat').length,
    tiles: document.querySelectorAll('#tiles .t').length,
    pics: typeof builtinPics !== 'undefined' ? builtinPics.length : -1
  })).catch(() => ({ crashed: true }));
  console.log('LOAD3 (offline):', JSON.stringify(l3));

  console.log('ERRORS:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
})();
