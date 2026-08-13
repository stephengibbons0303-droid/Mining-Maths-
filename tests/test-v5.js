const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto('http://localhost:8901/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  const log = [];
  const check = (n, ok) => log.push(`${ok ? 'PASS' : 'FAIL'}  ${n}`);

  // 8 topics, every topic has a mission
  const meta = await page.evaluate(() => ({
    n: TOPICS.length,
    ids: TOPICS.map(t => t.id),
    missions: TOPICS.map(t => t.steps.filter(s => s.type === 'mission').length)
  }));
  check('13 science topics', meta.n === 13);
  check('every topic has exactly one maths mission', meta.missions.every(m => m === 1));

  // space mission: pad entry inside science, +2 stars
  await page.click('#tabSci');
  await page.evaluate(() => openTopic(TOPICS.find(t => t.id === 'space')));
  await page.waitForTimeout(300);
  await page.evaluate(() => nextStep(sciState.idx)); // say -> ask
  await page.evaluate(() => { // answer concept Q correctly
    const btns = [...document.querySelectorAll('#topStep .optbtn')];
    btns[0].click();
  });
  await page.waitForTimeout(300);
  await page.click('#aNext'); // -> mission step
  await page.waitForTimeout(300);
  const missionUI = await page.evaluate(() => ({
    pad: !!document.querySelector('#topStep .kgrid'),
    disp: !!document.querySelector('#topStep #mInput'),
    unit: document.querySelector('#topStep .kunit').textContent
  }));
  check('space mission shows pad with cm unit', missionUI.pad && missionUI.disp && missionUI.unit === 'cm');
  const starsBefore = await page.evaluate(() => S.stars);
  for (const ch of '180') await page.click(`#topStep .kgrid [data-k="${ch}"]`);
  await page.click('#topStep .kgrid [data-k="ok"]');
  await page.waitForTimeout(400);
  const missionDone = await page.evaluate(() => ({
    stars: S.stars, why: !document.getElementById('mWhy').classList.contains('hidden'),
    next: !document.getElementById('mNext').classList.contains('hidden')
  }));
  check('mission correct answer: +2 stars, why + next shown', missionDone.stars === starsBefore + 2 && missionDone.why && missionDone.next);

  // electricity conductor station present
  await page.evaluate(() => openTopic(TOPICS.find(t => t.id === 'electricity')));
  await page.waitForTimeout(300);
  const circ = await page.evaluate(() => ({ items: document.querySelectorAll('.citem').length, slot: !!document.querySelector('#gapSlot'), glow: document.querySelector('#bulbGlow').getAttribute('opacity') }));
  check('circuit gap station: 4 items, slot, bulb dark', circ.items === 4 && circ.slot && circ.glow === '0');

  // shadows draggable sun present
  await page.evaluate(() => openTopic(TOPICS.find(t => t.id === 'shadows')));
  await page.waitForTimeout(300);
  const shad = await page.evaluate(() => ({ sun: !!document.querySelector('#sunDrag'), rx: +document.querySelector('#shadowEl').getAttribute('rx') }));
  check('shadows: draggable sun, morning long shadow', shad.sun && shad.rx > 90);

  // weather interaction
  await page.evaluate(() => openTopic(TOPICS.find(t => t.id === 'weather')));
  await page.waitForTimeout(300);
  await page.click('#topVis #wSun');
  await page.click('#topVis #wCloud');
  const wx = await page.evaluate(() => ({
    steam: document.querySelector('#steam').getAttribute('opacity'),
    rain: document.querySelector('#rain').getAttribute('opacity')
  }));
  check('sun tap makes steam, cloud tap makes rain', wx.steam === '1' && wx.rain === '1');

  // body heart counter
  await page.evaluate(() => openTopic(TOPICS.find(t => t.id === 'body')));
  await page.waitForTimeout(300);
  await page.click('#topVis #heartG'); await page.waitForTimeout(150); await page.click('#topVis #heartG');
  await page.waitForTimeout(400);
  const beats = await page.evaluate(() => document.querySelector('#beatCount').textContent);
  check('heart taps count beats', beats === 'beats: 2');

  // revisit chooser + quiz for an explored topic
  await page.evaluate(() => { S.explored.gravity = true; save(); openTopic(TOPICS.find(t => t.id === 'gravity')); });
  await page.waitForTimeout(300);
  const chooser = await page.evaluate(() => ({
    explore: !!document.getElementById('chooseExplore'),
    quiz: !!document.getElementById('chooseQuiz')
  }));
  check('explored topic shows explore/quiz chooser', chooser.explore && chooser.quiz);
  await page.click('#chooseQuiz');
  await page.waitForTimeout(300);
  const quiz = await page.evaluate(() => ({
    steps: sciState.t.steps.length,
    types: sciState.t.steps.map(s => s.type),
    hasUI: !!document.querySelector('#topStep .optbtn') || !!document.querySelector('#topStep .kgrid')
  }));
  check('quiz mode: <=6 shuffled ask/mission steps + finale', quiz.steps <= 6 && quiz.types.slice(0, -1).every(t => t === 'ask' || t === 'mission') && quiz.hasUI);

  // quiz-ready badge on science grid
  await page.evaluate(() => { $('#topic').classList.add('hidden'); renderSci(''); });
  const badge = await page.evaluate(() => [...document.querySelectorAll('#sciGrid .lvl')].some(e => e.textContent.includes('quiz ready')));
  check('explored card shows quiz-ready badge', badge);

  console.log(log.join('\n'));
  console.log('ERRORS:', errors.length ? errors.join(' | ') : 'none');
  await browser.close();
  process.exit(log.some(l => l.startsWith('FAIL')) || errors.length ? 1 : 0);
})();
