const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 420, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8901/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  const log = [], ck = (n, ok) => log.push((ok ? 'PASS' : 'FAIL') + '  ' + n);

  // sprint
  await p.click('#sprintBtn');
  await p.waitForTimeout(300);
  ck('sprint opens with timer running', await p.evaluate(() => spr.run && spr.t >= 58));
  for (let i = 0; i < 3; i++) {
    const ans = await p.evaluate(() => spr.ans);
    for (const ch of String(ans)) await p.click(`#sprintPad [data-k="${ch}"]`);
    await p.click('#sprintPad [data-k="ok"]');
  }
  ck('3 sprint answers scored', await p.evaluate(() => spr.score) === 3);
  await p.evaluate(() => { spr.t = 1; });
  await p.waitForTimeout(1700);
  const end = await p.evaluate(() => ({ shown: !document.getElementById('sprintEnd').classList.contains('hidden'), best: S.sprintBest, stars: S.stars }));
  ck('sprint end: best recorded + stars', end.shown && end.best === 3 && end.stars >= 1);
  await p.click('#sprintDone');
  ck('sprint button shows best', (await p.evaluate(() => document.getElementById('sprintBtn').textContent)).includes('best 3'));

  // negative temperature via kid pad
  await p.evaluate(() => {
    cur = { cat: CATS.find(c => c.id === 'measurement') };
    document.getElementById('activity').classList.remove('hidden'); applyWho();
    cur.q = { q: 'The temperature is 4°C. It gets 6 degrees COLDER.', ans: '-2°C', d: { t: 'tchange', start: 4, delta: 6 } };
    cur.attempts = 0; cur.done = false; cur.noted = false;
    cur.q.steps = buildSteps(cur.q); renderKidEntry(cur.q);
  });
  const negUI = await p.evaluate(() => ({ row: !document.getElementById('kXRow').classList.contains('hidden'), spec: cur.spec }));
  ck('tchange: minus button + pad spec -2', negUI.row && negUI.spec.neg && negUI.spec.pad === -2);
  await p.click('#kXRow button');
  await p.click('#kPad [data-k="2"]');
  const negDisp = await p.evaluate(() => document.getElementById('kInput').textContent);
  const s0 = await p.evaluate(() => S.stars);
  await p.click('#kPad [data-k="ok"]');
  await p.waitForTimeout(1000);
  ck('negative answer −2 accepted', negDisp === '−2' && await p.evaluate(() => S.stars) === s0 + 1);
  ck('thermometer renders negative scale', await p.evaluate(() => buildMeasure({ t: 'therm', v: -5, max: 20, min: -10, tick: 5 }).includes('-10')));

  // machines
  await p.evaluate(() => { document.getElementById('activity').classList.add('hidden'); setTab('science'); openTopic(TOPICS.find(t => t.id === 'machines')); });
  await p.waitForTimeout(400);
  await p.click('#topVis #crateG');
  await p.waitForTimeout(700);
  const cy = await p.evaluate(() => document.querySelector('#crateG').getAttribute('transform'));
  ck('pulley crate rises on tap', !cy.includes('156'));
  ck('machines mission is division (12/2=6)', await p.evaluate(() => TOPICS.find(t => t.id === 'machines').steps.some(x => x.type === 'mission' && x.ans === 6)));

  // sound
  await p.evaluate(() => openTopic(TOPICS.find(t => t.id === 'sound')));
  await p.waitForTimeout(400);
  await p.click('#topVis #batG');
  await p.waitForTimeout(1900);
  ck('bat echo completes with echolocation label', (await p.evaluate(() => document.querySelector('#sndLbl').textContent)).includes('ECHO'));
  await p.click('#topVis #whaleG');
  await p.waitForTimeout(900);
  ck('whale click: 4x faster label', (await p.evaluate(() => document.querySelector('#sndLbl').textContent)).includes('4×'));
  ck('sound mission: thunder division', await p.evaluate(() => TOPICS.find(t => t.id === 'sound').steps.some(x => x.type === 'mission' && x.ans === 3)));

  // certificate
  await p.evaluate(() => { document.getElementById('topic').classList.add('hidden'); S.mastered.addition = true; save(); openCerts(); });
  await p.waitForTimeout(300);
  const cert = await p.evaluate(() => ({
    open: !document.getElementById('cert').classList.contains('hidden'),
    topic: document.getElementById('certTopic').textContent, meta: document.getElementById('certMeta').textContent
  }));
  ck('certificate shows mastered topic + date', cert.open && cert.topic.includes('Addition') && /\d{4}/.test(cert.meta));
  await p.screenshot({ path: '../shot-cert.png' });
  await p.click('#certClose');

  // science-flavoured word problems present
  const flav = await p.evaluate(() => {
    let oct = false, sci = false;
    for (let i = 0; i < 400; i++) { const q = genMul(5); if (q.q.includes('octopus')) oct = true; }
    for (let i = 0; i < 400; i++) { const q = genAddition(5); if (q.q.includes('moon rocks') || q.q.includes('moths')) sci = true; }
    return { oct, sci };
  });
  ck('science-flavoured word problems appear', flav.oct && flav.sci);

  console.log(log.join('\n')); console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await b.close();
  process.exit(log.some(l => l.startsWith('FAIL')) || errs.length ? 1 : 0);
})();
