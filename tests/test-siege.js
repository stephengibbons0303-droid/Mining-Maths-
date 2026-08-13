// Castle Siege v1: full match — estimate, hit, correction inputs, win.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 800, height: 1280 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8901/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  const log = [], ck = (n, ok) => log.push((ok ? 'PASS' : 'FAIL') + '  ' + n);
  const type = async n => { for (const ch of String(n)) await p.click(`#sgPad [data-k="${ch}"]`); await p.click('#sgPad [data-k="ok"]'); };

  await p.click('#siegeBtn');
  await p.waitForTimeout(400);
  let st = await p.evaluate(() => ({ open: !document.getElementById('siege').classList.contains('hidden'),
    D: SG.D, rows: document.querySelectorAll('#castleE .crow').length, mode: SG.mode,
    keep: !!document.querySelector('#castleE .keep'), throne: !!document.querySelector('#castleE .throne') }));
  ck('siege opens: keep + 2 walls, throne hidden, aim mode', st.open && st.D >= 35 && st.D <= 90 && st.rows === 3 && st.mode === 'aim' && st.keep && !st.throne);

  // shot 1: fire exactly at the castle -> hit
  const s0 = await p.evaluate(() => S.stars);
  await type(st.D);
  await p.waitForTimeout(6000);
  st = await p.evaluate(() => ({ eHP: SG.eHP, stars: S.stars, mode: SG.mode, sign: !!document.getElementById('sgSign') }));
  ck('direct hit: wall down, +2 stars', st.eHP === 2 && st.stars === s0 + 2);
  ck('after enemy turn: correction mode with +/- buttons', st.mode === 'correct' && st.sign);

  // shot 2: castle rebuilt at new D — enter the CORRECTION (|D - lastPow|)
  let delta = await p.evaluate(() => Math.abs(SG.D - SG.lastPow));
  if (delta === 0) { await p.evaluate(() => { SG.D = Math.min(90, SG.D + 8); }); delta = 8; }
  const inGame = await p.evaluate(() => Math.abs(SG.D - SG.lastPow) <= 6); // within tolerance? then delta 0 would also hit; use exact anyway
  await type(delta);
  await p.waitForTimeout(6000);
  st = await p.evaluate(() => ({ eHP: SG.eHP, throne: !!document.querySelector('#castleE .throne'),
    msg: document.getElementById('siegeMsg').textContent }));
  ck('second hit exposes the throne (crown visible, 3m warning)', st.eHP === 1 && st.throne);

  // shot 3: final wall
  let d3 = await p.evaluate(() => Math.abs(SG.D - SG.lastPow));
  if (d3 === 0) { await p.evaluate(() => { SG.D = Math.min(90, SG.D + 8); }); d3 = 8; }
  const sw = await p.evaluate(() => S.stars);
  await type(d3);
  await p.waitForTimeout(6000);
  st = await p.evaluate(() => ({ again: !!document.getElementById('sgAgain'),
    msg: document.getElementById('siegeMsg').textContent, stars: S.stars }));
  ck('precise third shot CAPTURES the throne + bonus stars', st.again && st.msg.includes('CAPTURED') && st.stars >= sw + 5);

  // out-of-range guard (grant a battle token first — v16 gating consumes them)
  await p.evaluate(() => { S.battles.tokens = (S.battles.tokens || 0) + 1; save(); });
  await p.click('#sgAgain');
  await p.waitForTimeout(400);
  await type(555);
  const guard = await p.evaluate(() => SG.busy === false && SG.mode === 'aim');
  ck('power >100 rejected, still aiming', guard);
  await p.click('#siegeQuit');

  console.log(log.join('\n')); console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await b.close();
  process.exit(log.some(l => l.startsWith('FAIL')) || errs.length ? 1 : 0);
})();
