// Castle Siege: v24 lever controls (drag arm / angle stepper / kg weights), full match.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8901/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  const log = [], ck = (n, ok) => log.push((ok ? 'PASS' : 'FAIL') + '  ' + n);
  const fire = async n => { await p.evaluate(n => sgSetPow(n), n); await p.click('#sgFire'); };

  await p.click('#siegeBtn');
  await p.waitForTimeout(300);
  await p.click('#sgVsAI'); // mode picker
  await p.waitForTimeout(300);
  let st = await p.evaluate(() => ({ open: !document.getElementById('siege').classList.contains('hidden'),
    D: SG.D, rows: document.querySelectorAll('#castleE .crow').length,
    keep: !!document.querySelector('#castleE .keep'), throne: !!document.querySelector('#castleE .throne'),
    lever: !!document.getElementById('sgFire'), ang: !!document.getElementById('sgAngV'),
    kgs: document.querySelectorAll('#sgWt button').length, arm: !!document.querySelector('.armActive') }));
  ck('siege opens: castle intact, lever + angle stepper + 3 kg weights + arm', st.open && st.D >= 35 && st.D <= 90 && st.rows === 3 && st.keep && !st.throne && st.lever && st.ang && st.kgs === 3 && st.arm);

  // enemy-aim invariant (v21 regression)
  ck('enemy misses land |err| metres from the castle, never clamped into a hit',
    await p.evaluate(() => [16, -16, 10, -10, 5, -5, 3, -3, 0].every(e => Math.abs(enemyLand(e) - 4) === Math.abs(e) && enemyLand(e) >= 1)));

  // landing maths: land = power x angle-fraction x 2/kg
  ck('sgLand: fractions of power by angle, x2 / half by kg',
    await p.evaluate(() => {
      const t = (pow, ang, kg, want) => { SG.pow = pow; SG.ang = ang; SG.kg = kg; return sgLand() === want; };
      const ok = t(80, 45, 2, 80) && t(80, 60, 2, 60) && t(80, 15, 2, 40) && t(80, 45, 1, 160) && t(88, 45, 4, 44) && t(80, 30, 4, 30);
      SG.pow = 50; SG.ang = 45; SG.kg = 2; sgControls(); return ok;
    }));

  // angle stepper UI + power clamp
  await p.click('#angUp');
  ck('angle steps to 60 with fraction note', await p.evaluate(() =>
    SG.ang === 60 && document.getElementById('sgAngV').textContent === '60°' && /¾/.test(document.getElementById('sgAngN').textContent)));
  await p.click('#angDn');
  ck('power clamps to 100', await p.evaluate(() => { sgSetPow(555); const ok = SG.pow === 100; return ok; }));

  // drag the catapult arm: pull left/down raises power, readout + arm follow
  const before = await p.evaluate(() => { sgSetPow(30); return { pow: SG.pow, arm: document.querySelector('.armActive').getAttribute('transform') }; });
  const box = await p.locator('#siegeSvg').boundingBox();
  const gx = box.x + (65.6 / 420) * box.width, gy = box.y + (180 / 262) * box.height;
  await p.mouse.move(gx, gy); await p.mouse.down();
  await p.mouse.move(gx - 40, gy + 25, { steps: 8 });
  await p.mouse.up();
  st = await p.evaluate(() => ({ pow: SG.pow, disp: document.getElementById('sgPowV').textContent, arm: document.querySelector('.armActive').getAttribute('transform') }));
  ck('dragging the arm raises power (readout + arm rotate)', st.pow > before.pow && st.disp === String(st.pow) && st.arm !== before.arm);

  // shot 1: dead-on with the default 2 kg / 45° rock
  const s0 = await p.evaluate(() => S.stars);
  await fire(st.D = await p.evaluate(() => SG.D));
  await p.waitForTimeout(6000);
  st = await p.evaluate(() => ({ eHP: SG.eHP, stars: S.stars, busy: SG.busy, last: !!document.getElementById('sgLast') }));
  ck('direct hit: wall down, +2 stars', st.eHP === 2 && st.stars === s0 + 2);
  ck('after enemy turn: controls back with last-power reminder', st.busy === false && st.last);

  // shot 2: castle relocated — fire at its new mark
  await fire(await p.evaluate(() => SG.D));
  await p.waitForTimeout(6000);
  st = await p.evaluate(() => ({ eHP: SG.eHP, throne: !!document.querySelector('#castleE .throne') }));
  ck('second hit exposes the throne', st.eHP === 1 && st.throne);

  // shot 3: capture
  const sw = await p.evaluate(() => S.stars);
  await fire(await p.evaluate(() => SG.D));
  await p.waitForTimeout(6000);
  st = await p.evaluate(() => ({ again: !!document.getElementById('sgAgain'), msg: document.getElementById('siegeMsg').textContent, stars: S.stars }));
  ck('precise third shot CAPTURES the throne + bonus stars', st.again && st.msg.includes('CAPTURED') && st.stars >= sw + 5);

  // rematch: heavy 4 kg double-smash, then 1 kg doubling capture
  await p.evaluate(() => { S.battles.tokens = (S.battles.tokens || 0) + 1; save(); });
  await p.click('#sgAgain');
  await p.waitForTimeout(300);
  await p.click('#sgVsAI');
  await p.waitForTimeout(300);
  await p.evaluate(() => { SG.D = 44; redrawSiege(); });
  await p.click('#sgWt [data-kg="4"]');
  const sh = await p.evaluate(() => S.stars);
  await fire(88); // 88 x 1/2 = 44
  await p.waitForTimeout(6500);
  st = await p.evaluate(() => ({ eHP: SG.eHP, stars: S.stars, throne: !!document.querySelector('#castleE .throne') }));
  ck('4 kg at power 88 flies 44 m: double smash 3->1, +4 stars', st.eHP === 1 && st.stars === sh + 4 && st.throne);
  await p.evaluate(() => { SG.D = 44; redrawSiege(); });
  await p.click('#sgWt [data-kg="1"]');
  const sc = await p.evaluate(() => S.stars);
  await fire(22); // 22 x 2 = 44 — doubling to capture
  await p.waitForTimeout(7000);
  st = await p.evaluate(() => ({ msg: document.getElementById('siegeMsg').textContent, stars: S.stars }));
  ck('1 kg at power 22 flies 44 m: doubling captures the throne', st.msg.includes('CAPTURED') && st.stars >= sc + 5);
  await p.click('#siegeQuit');

  console.log(log.join('\n')); console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await b.close();
  process.exit(log.some(l => l.startsWith('FAIL')) || errs.length ? 1 : 0);
})();
