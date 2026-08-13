const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 800, height: 1280 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8901/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(900);

  const ids = await p.evaluate(() => TOPICS.map(t => t.id));
  console.log('SCIENCE SCENES (800px tablet, drawing width as % of viewport):');
  for (const id of ids) {
    await p.evaluate(i => openTopic(TOPICS.find(t => t.id === i)), id);
    await p.waitForTimeout(250);
    const m = await p.evaluate(() => {
      const svg = document.querySelector('#topVis svg');
      const r = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      // actual drawn width when aspect-constrained by height
      const scale = Math.min(r.width / vb.width, r.height / vb.height);
      return { drawn: Math.round(vb.width * scale), h: Math.round(vb.height * scale), el: Math.round(r.width) };
    });
    console.log(`  ${id.padEnd(14)} drawing ${m.drawn}px wide x ${m.h}px  (${Math.round(m.drawn / 800 * 100)}% of screen)`);
    if (['space', 'lightspeed', 'zipline', 'sound', 'machines'].includes(id)) {
      await p.screenshot({ path: `../shot-v10-${id}.png` });
    }
    await p.evaluate(() => document.getElementById('topic').classList.add('hidden'));
  }

  // maths visuals
  console.log('MATHS VISUALS:');
  await p.evaluate(() => { setTab('maths'); S.levels.subtraction = 2; openActivity(CATS[1]); });
  await p.waitForTimeout(300);
  await p.click('#colBtn');
  const col = await p.evaluate(() => { const s = document.querySelector('#vissvg svg'); const r = s.getBoundingClientRect(); return Math.round(r.width); });
  console.log(`  column visual ${col}px wide (${Math.round(col / 800 * 100)}%)`);
  await p.screenshot({ path: '../shot-v10-maths.png' });
  await p.evaluate(() => { closeActivity(); });

  console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await b.close();
})();
