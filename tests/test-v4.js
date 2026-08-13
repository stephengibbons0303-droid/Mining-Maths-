const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto('http://localhost:8901/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const log = [];
  const check = (n, ok) => log.push(`${ok ? 'PASS' : 'FAIL'}  ${n}`);

  // speaker gone
  check('speaker button removed', await page.evaluate(() => !document.getElementById('speak') && !document.getElementById('optAudio')));

  // ----- money pad entry -----
  await page.evaluate(() => { const c = CATS.find(x => x.id === 'money'); S.levels.money = 2; openActivity(c); });
  await page.waitForTimeout(300);
  let st = await page.evaluate(() => ({ pad: !document.getElementById('kPad').classList.contains('hidden'),
    unitRow: !document.getElementById('kXRow').classList.contains('hidden'),
    units: [...document.querySelectorAll('#kXRow button')].map(b => b.dataset.u),
    expect: cur.spec.pad, money: !!cur.spec.money }));
  check('money question uses pad with £/p buttons', st.pad && st.unitRow && st.units.join('') === '£p' && st.money);

  // answer in pence
  for (const ch of String(st.expect)) await page.click(`#kPad [data-k="${ch}"]`);
  const s0 = await page.evaluate(() => S.stars);
  await page.click('#kPad [data-k="ok"]');
  await page.waitForTimeout(1100);
  check('pence entry accepted', await page.evaluate(() => S.stars) === s0 + 1);

  // answer in whole pounds when applicable: force a £-multiple by direct spec surgery on a fresh question
  await page.evaluate(() => { cur.q = { q: 'test', ans: '£2', d: { t: 'mcount', items: [100,100], total: 200 } }; cur.attempts = 0; cur.done = false; cur.noted = false; renderKidEntry(cur.q); });
  await page.click('#kXRow button[data-u="£"]');
  await page.click('#kPad [data-k="2"]');
  const s1 = await page.evaluate(() => S.stars);
  await page.click('#kPad [data-k="ok"]');
  await page.waitForTimeout(1100);
  check('whole-pound entry via £ button accepted', await page.evaluate(() => S.stars) === s1 + 1);

  // ----- remainder two-part entry -----
  await page.evaluate(() => { cur.q = { q: '17 ÷ 5 = ?', ans: '3 r 2', d: { t: 'divrem', total: 17, dv: 5, qn: 3, rem: 2 } }; cur.attempts = 0; cur.done = false; cur.noted = false; renderKidEntry(cur.q); });
  st = await page.evaluate(() => ({ row: !document.getElementById('kXRow').classList.contains('hidden'), spec: cur.spec }));
  check('remainder question shows r button', st.row && st.spec.rem === 2 && st.spec.pad === 3);
  await page.click('#kPad [data-k="3"]');
  await page.click('#kPad [data-k="ok"]');   // should demand remainder, not fail
  let disp = await page.evaluate(() => ({ done: cur.done, attempts: cur.attempts }));
  check('OK without remainder prompts instead of counting wrong', !disp.done && disp.attempts === 0);
  await page.click('#kXRow button');
  await page.click('#kPad [data-k="2"]');
  const dtxt = await page.evaluate(() => document.getElementById('kInput').textContent);
  const s2 = await page.evaluate(() => S.stars);
  await page.click('#kPad [data-k="ok"]');
  await page.waitForTimeout(1100);
  check('quotient + r + remainder entry works ("3 r 2")', dtxt === '3 r 2' && await page.evaluate(() => S.stars) === s2 + 1);

  // ----- science: space topic -----
  await page.click('#back');
  await page.click('#tabSci');
  await page.waitForTimeout(300);
  const topics = await page.evaluate(() => [...document.querySelectorAll('#sciGrid .nm')].map(e => e.textContent));
  check('space topic on science grid', topics.includes('Space & Planets'));
  await page.evaluate(() => openTopic(TOPICS.find(t => t.id === 'space')));
  await page.waitForTimeout(400);
  const sp = await page.evaluate(() => ({
    planets: document.querySelectorAll('#topVis .planet').length,
    astro: !!document.querySelector('#topVis #astro')
  }));
  check('space scene has 9 bodies + astronaut', sp.planets === 9 && sp.astro);
  // tap the moon -> astronaut moves & label updates
  await page.click('#topVis .planet[data-p="moon"]');
  await page.waitForTimeout(700);
  const jump = await page.evaluate(() => ({
    stand: document.querySelector('#topVis #standLbl').textContent,
    lbl: document.querySelector('#topVis #jumpLbl').textContent
  }));
  check('tapping Moon updates labels (6x)', jump.stand.includes('Moon') && jump.lbl.includes('6×'));
  // walk two steps: say -> ask, answer the concept question
  await page.evaluate(() => nextStep(sciState.idx));
  await page.waitForTimeout(200);
  const q1 = await page.evaluate(() => document.querySelector('.checkq').textContent);
  check('space step 2 is the gravity concept question', q1.includes('Moon'));
  // compact mode should NOT shrink space visual (keepVis)
  const compacted = await page.evaluate(() => document.getElementById('topVis').classList.contains('compact'));
  check('space keeps full visual during steps (keepVis)', !compacted);

  // gravity topic: feather present + compact after step 1
  await page.evaluate(() => openTopic(TOPICS.find(t => t.id === 'gravity')));
  await page.waitForTimeout(300);
  check('gravity has tappable feather', await page.evaluate(() => !!document.getElementById('featherDrop')));
  await page.evaluate(() => nextStep(sciState.idx));
  await page.waitForTimeout(600);
  check('gravity visual compacts after step 1', await page.evaluate(() => document.getElementById('topVis').classList.contains('compact')));

  console.log(log.join('\n'));
  console.log('ERRORS:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
  process.exit(log.some(l => l.startsWith('FAIL')) || errors.length ? 1 : 0);
})();
