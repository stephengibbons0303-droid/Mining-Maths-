const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  // GIFs stall for 15s; IndexedDB-independent UI must render immediately
  await ctx.route('**/pics/*.gif', async route => {
    await new Promise(r => setTimeout(r, 15000));
    await route.continue();
  });

  const t0 = Date.now();
  await page.goto('http://localhost:8902/Mining-Maths-/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#catGrid .cat', { timeout: 5000 });
  const gridMs = Date.now() - t0;
  const early = await page.evaluate(() => ({
    cats: document.querySelectorAll('#catGrid .cat').length,
    tiles: document.querySelectorAll('#tiles .t').length,
    scene: !!document.querySelector('#stage .scene'),  // SVG fallback while GIFs pending
    pics: builtinPics.length
  }));
  console.log(`grid visible after ${gridMs}ms (GIFs still stalled):`, JSON.stringify(early));

  // after the stall, GIFs should arrive and replace the SVG scene
  await page.waitForTimeout(18000);
  const late = await page.evaluate(() => ({
    pics: builtinPics.length,
    img: !!document.querySelector('#stage img.scene')
  }));
  console.log('after GIFs arrive:', JSON.stringify(late));
  console.log('ERRORS:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
  process.exit(early.cats === 12 && gridMs < 5000 && late.pics === 2 && !errors.length ? 0 : 1);
})();
