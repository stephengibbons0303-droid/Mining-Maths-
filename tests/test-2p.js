// v20 pass-and-play: mode picker, name chips, alternating turns both ways,
// mirrored correction maths, relocation churn, throne capture win.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8901/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  const log = [], ck = (n, ok) => log.push((ok ? 'PASS' : 'FAIL') + '  ' + n);
  const type = async n => { for (const ch of String(n)) await p.click(`#sgPad [data-k="${ch}"]`); await p.click('#sgPad [data-k="ok"]'); };
  // fire the current player's shot to land exactly at `to` (handles aim vs correction mode)
  const fireAt = async to => {
    const st = await p.evaluate(() => ({ mode: SG.mode, last: SG.lastPow }));
    if (st.mode === 'aim') { await type(to); return; }
    const d = to - st.last;
    await p.click(`#sgSign [data-s="${d >= 0 ? 1 : -1}"]`);
    await type(Math.abs(d));
  };

  // mode picker
  await p.click('#siegeBtn');
  await p.waitForTimeout(300);
  let st = await p.evaluate(() => ({
    open: !document.getElementById('siege').classList.contains('hidden'),
    ai: !!document.getElementById('sgVsAI'), two: !!document.getElementById('sgVs2'),
    left: battlesLeft()
  }));
  ck('mode picker: both modes offered, no token spent yet', st.open && st.ai && st.two && st.left === 1);

  // name chips, defaults Jad vs Rai
  await p.click('#sgVs2');
  await p.waitForTimeout(200);
  st = await p.evaluate(() => ({
    n1: document.querySelector('#sgN1 .sel') && document.querySelector('#sgN1 .sel').textContent,
    n2: document.querySelector('#sgN2 .sel') && document.querySelector('#sgN2 .sel').textContent
  }));
  ck('name chips default Jad vs Rai', st.n1 === 'Jad' && st.n2 === 'Rai');

  // same-player guard
  await p.click('#sgN2 [data-n="Jad"]');
  await p.click('#sg2Go');
  await p.waitForTimeout(200);
  ck('same player twice rejected', await p.evaluate(() => !(SG && SG.two)));
  await p.click('#sgN2 [data-n="Rai"]');

  // battle starts: token consumed, two castles + labels, P1 turn
  await p.click('#sg2Go');
  await p.waitForTimeout(300);
  st = await p.evaluate(() => ({
    two: SG.two, turn: SG.turn, left: battlesLeft(),
    m1: SG.M[1], m2: SG.M[2],
    labels: [...document.querySelectorAll('#siegeSvg text')].map(t => t.textContent).join(' '),
    sep: SG.M[2] - SG.M[1]
  }));
  ck('2P match starts: token spent, castles far apart, name labels', st.two && st.turn === 1 && st.left === 0 && st.sep >= 34 && /Jad/.test(st.labels) && /Rai/.test(st.labels));

  // P1 direct hit on Rai's castle -> wall down, relocation, pass to P2
  const s0 = await p.evaluate(() => S.stars);
  const oldM2 = st.m2;
  await fireAt(oldM2);
  await p.waitForTimeout(6000);
  st = await p.evaluate(() => ({ hp2: SG.HP[2], turn: SG.turn, stars: S.stars, moved: SG.M[2], msg: document.getElementById('siegeMsg').textContent }));
  ck('P1 hit: Rai wall down +2*, castle relocates, pass prompt', st.hp2 === 2 && st.turn === 2 && st.stars === s0 + 2 && /Pass the tablet/.test(st.msg) && /Rai/.test(st.msg));

  // P2 fires back the other way and hits Jad's castle
  const m1 = await p.evaluate(() => SG.M[1]);
  await fireAt(m1);
  await p.waitForTimeout(6000);
  st = await p.evaluate(() => ({ hp1: SG.HP[1], turn: SG.turn }));
  ck('P2 mirrored hit: Jad wall down, back to P1', st.hp1 === 2 && st.turn === 1);

  // P1 correction (castle moved) -> second wall -> throne exposed
  let m2 = await p.evaluate(() => SG.M[2]);
  await fireAt(m2);
  await p.waitForTimeout(6000);
  st = await p.evaluate(() => ({ hp2: SG.HP[2], throne: !!document.querySelector('#castleE .throne'), turn: SG.turn }));
  ck('P1 correction hit: throne exposed', st.hp2 === 1 && st.throne && st.turn === 2);

  // P2 misses on purpose; play returns to P1
  const miss = await p.evaluate(() => { const t = SG.M[1]; let v = t + 15; return Math.min(99, v); });
  await fireAt(miss);
  await p.waitForTimeout(6000);
  st = await p.evaluate(() => ({ turn: SG.turn, msg: document.getElementById('siegeMsg').textContent }));
  ck('P2 miss: correction feedback + back to P1', st.turn === 1 && /FURTHER|LESS/.test(st.msg));

  // P1 precision capture -> Jad wins
  const sw = await p.evaluate(() => S.stars);
  m2 = await p.evaluate(() => SG.M[2]);
  await fireAt(m2);
  await p.waitForTimeout(7000);
  st = await p.evaluate(() => ({ msg: document.getElementById('siegeMsg').textContent, again: !!document.getElementById('sgAgain'), stars: S.stars }));
  ck('throne captured: JAD WINS banner + bonus', /JAD WINS/.test(st.msg) && st.again && st.stars >= sw + 5);
  await p.click('#siegeQuit');

  console.log(log.join('\n')); console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await b.close();
  process.exit(log.some(l => l.startsWith('FAIL')) || errs.length ? 1 : 0);
})();
