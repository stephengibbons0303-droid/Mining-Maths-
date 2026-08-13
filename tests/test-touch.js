// Touch-emulation drag tests (CDP touch events, hasTouch context).
// Guards the Chromium rule that touch-action only works on the SVG ROOT:
// every drag surface must work from a touchscreen, not just a mouse.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 800, height: 1280 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const log = [], ck = (n, ok) => log.push((ok ? 'PASS' : 'FAIL') + '  ' + n);
  await p.goto('http://localhost:8901/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  const c = await ctx.newCDPSession(p);
  const touchDrag = async (fx, fy, tx, ty, steps) => {
    await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: fx, y: fy }] });
    for (let i = 1; i <= steps; i++) {
      await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: fx + (tx - fx) * i / steps, y: fy + (ty - fy) * i / steps }] });
      await p.waitForTimeout(25);
    }
    await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const center = async sel => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);

  await p.click('#tabSci');
  await p.evaluate(() => openTopic(TOPICS.find(t => t.id === 'shadows')));
  await p.waitForTimeout(400);
  const rx0 = await p.evaluate(() => +document.querySelector('#shadowEl').getAttribute('rx'));
  const sun = await center('#sunDrag');
  const svgB = await p.evaluate(() => { const r = document.querySelector('#shadowSvg').getBoundingClientRect(); return { cx: r.x + r.width / 2, ty: r.y + r.height * 0.12 }; });
  await touchDrag(sun.x, sun.y, svgB.cx, svgB.ty, 8);
  ck('touch sun drag', await p.evaluate(() => +document.querySelector('#shadowEl').getAttribute('rx')) < rx0 - 30);

  await p.evaluate(() => openTopic(TOPICS.find(t => t.id === 'zipline')));
  await p.waitForTimeout(400);
  const h0 = await p.evaluate(() => +document.querySelector('#zipLine').getAttribute('y1'));
  const ring = await center('#zipHandle');
  await touchDrag(ring.x, ring.y, ring.x, ring.y - 140, 8);
  ck('touch zip ring drag', await p.evaluate(() => +document.querySelector('#zipLine').getAttribute('y1')) < h0 - 15);

  await p.evaluate(() => openTopic(TOPICS.find(t => t.id === 'electricity')));
  await p.waitForTimeout(400);
  const key = await center('.citem[data-nm="the metal key"]');
  const gap = await center('#gapSlot');
  await touchDrag(key.x, key.y, gap.x, gap.y, 8);
  await p.waitForTimeout(300);
  ck('touch circuit key lights bulb', await p.evaluate(() => document.querySelector('#bulbGlow').getAttribute('opacity')) === '0.85');

  await p.evaluate(() => openTopic(TOPICS.find(t => t.id === 'floating')));
  await p.waitForTimeout(400);
  const org = await center('.fitem[data-nm="the orange"]');
  const tank = await p.evaluate(() => { const r = document.querySelector('#floatSvg rect[x="74"][y="110"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await touchDrag(org.x, org.y, tank.x, tank.y, 8);
  await p.waitForTimeout(800);
  ck('touch orange floats', (await p.evaluate(() => document.querySelector('#floatLbl').textContent)).includes('FLOATS'));

  await p.evaluate(() => openTopic(TOPICS.find(t => t.id === 'machines')));
  await p.waitForTimeout(400);
  const knot = await center('#ropeKnot');
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: knot.x, y: knot.y }] });
  for (let i = 1; i <= 6; i++) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: knot.x, y: knot.y + i * 20 }] }); await p.waitForTimeout(25); }
  const cy = await p.evaluate(() => +document.querySelector('#crateG').getAttribute('transform').match(/ ([\d.]+)\)/)[1]);
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  ck('touch rope pull hoists crate', cy < 150);

  await p.evaluate(() => openTopic(TOPICS.find(t => t.id === 'magnets')));
  await p.waitForTimeout(400);
  const mag = await center('#magnet');
  const clip = await center('#clip');
  await touchDrag(mag.x, mag.y, clip.x, clip.y - 30, 8);
  ck('touch magnet drag moves clip', await p.evaluate(() => !!document.querySelector('#clip').getAttribute('transform')));

  console.log(log.join('\n'));
  await b.close();
  process.exit(log.some(l => l.startsWith('FAIL')) ? 1 : 0);
})();
