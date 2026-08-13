const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 800, height: 1280 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8901/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  const log = [], ck = (n, ok) => log.push((ok ? 'PASS' : 'FAIL') + '  ' + n);

  const center = async sel => {
    const r = await p.evaluate(s => {
      const el = document.querySelector(s); const b = el.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    }, sel);
    return r;
  };
  const dragTo = async (fromSel, toSel, dy = 0) => {
    const a = await center(fromSel), c = await center(toSel);
    await p.mouse.move(a.x, a.y); await p.mouse.down();
    await p.mouse.move((a.x + c.x) / 2, (a.y + c.y) / 2, { steps: 5 });
    await p.mouse.move(c.x, c.y + dy, { steps: 5 });
    await p.mouse.up();
  };

  await p.click('#tabSci');

  // 1. electricity conductor station
  await p.evaluate(() => openTopic(TOPICS.find(t => t.id === 'electricity')));
  await p.waitForTimeout(400);
  await dragTo('.citem[data-nm="the metal key"]', '#gapSlot');
  await p.waitForTimeout(300);
  let st = await p.evaluate(() => ({ glow: document.querySelector('#bulbGlow').getAttribute('opacity'), lbl: document.querySelector('#circLbl').textContent }));
  ck('key into gap: bulb lights, CONDUCTOR label', st.glow === '0.85' && st.lbl.includes('CONDUCTOR'));
  await dragTo('.citem[data-nm="the plastic spoon"]', '#gapSlot');
  await p.waitForTimeout(300);
  st = await p.evaluate(() => ({ glow: document.querySelector('#bulbGlow').getAttribute('opacity'), lbl: document.querySelector('#circLbl').textContent }));
  ck('spoon swaps in: bulb dark, INSULATOR label', st.glow === '0' && st.lbl.includes('INSULATOR'));

  // 2. floating tank
  await p.evaluate(() => openTopic(TOPICS.find(t => t.id === 'floating')));
  await p.waitForTimeout(400);
  await dragTo('.fitem[data-nm="the orange"]', '#floatSvg rect[x="74"][y="110"]');
  await p.waitForTimeout(800);
  let fl = await p.evaluate(() => ({
    lbl: document.querySelector('#floatLbl').textContent,
    y: +document.querySelector('.fitem[data-nm="the orange"]').getAttribute('transform').match(/ ([\d.]+)\)/)[1]
  }));
  ck('orange dropped in: FLOATS at surface', fl.lbl.includes('FLOATS') && Math.abs(fl.y - 104) < 3);
  await dragTo('.fitem[data-nm="the coin"]', '#floatSvg rect[x="74"][y="110"]');
  await p.waitForTimeout(900);
  fl = await p.evaluate(() => ({
    lbl: document.querySelector('#floatLbl').textContent,
    y: +document.querySelector('.fitem[data-nm="the coin"]').getAttribute('transform').match(/ ([\d.]+)\)/)[1]
  }));
  ck('coin dropped in: SINKS to bottom', fl.lbl.includes('SINKS') && Math.abs(fl.y - 194) < 3);

  // 3. shadows sun drag
  await p.evaluate(() => openTopic(TOPICS.find(t => t.id === 'shadows')));
  await p.waitForTimeout(400);
  const rx0 = await p.evaluate(() => +document.querySelector('#shadowEl').getAttribute('rx'));
  // drag sun from its morning spot to the top of the arc (noon)
  const svgBox = await p.evaluate(() => { const r = document.querySelector('#shadowSvg').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const sun = await center('#sunDrag');
  await p.mouse.move(sun.x, sun.y); await p.mouse.down();
  await p.mouse.move(svgBox.x + svgBox.w / 2, svgBox.y + svgBox.h * 0.12, { steps: 10 });
  await p.mouse.up();
  const rx1 = await p.evaluate(() => +document.querySelector('#shadowEl').getAttribute('rx'));
  const tl = await p.evaluate(() => document.querySelector('#timeLbl').textContent);
  ck(`sun dragged to noon: shadow shrinks (${rx0}->${rx1})`, rx0 > 90 && rx1 < 45 && tl.includes('midday'));

  // 4. zip line ring drag
  await p.evaluate(() => openTopic(TOPICS.find(t => t.id === 'zipline')));
  await p.waitForTimeout(400);
  const h0 = await p.evaluate(() => +document.querySelector('#zipLine').getAttribute('y1'));
  const ring = await center('#zipHandle');
  await p.mouse.move(ring.x, ring.y); await p.mouse.down();
  await p.mouse.move(ring.x, ring.y - svgBox.h * 0.25, { steps: 8 });
  await p.mouse.up();
  const h1 = await p.evaluate(() => +document.querySelector('#zipLine').getAttribute('y1'));
  ck(`ring drag raises line start (${h0}->${h1})`, h1 < h0 - 20);
  await p.click('#topVis #zipToy');
  await p.waitForTimeout(1600);
  const zt = await p.evaluate(() => document.querySelector('#zipTime').textContent);
  ck('steep launch reports time + FAST', /about \d/.test(zt) && zt.includes('⚡'));

  // 5. machines rope pull
  await p.evaluate(() => openTopic(TOPICS.find(t => t.id === 'machines')));
  await p.waitForTimeout(400);
  const knot = await center('#ropeKnot');
  await p.mouse.move(knot.x, knot.y); await p.mouse.down();
  await p.mouse.move(knot.x, knot.y + 120, { steps: 8 });
  const cy = await p.evaluate(() => +document.querySelector('#crateG').getAttribute('transform').match(/ ([\d.]+)\)/)[1]);
  ck('pulling rope down hoists crate mid-drag', cy < 150);
  await p.mouse.up();
  await p.waitForTimeout(900);
  const cy2 = await p.evaluate(() => +document.querySelector('#crateG').getAttribute('transform').match(/ ([\d.]+)\)/)[1]);
  ck('crate settles back down on release', Math.abs(cy2 - 172) < 2);
  await p.screenshot({ path: '../shot-v12-machines.png' });

  console.log(log.join('\n')); console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await b.close();
  process.exit(log.some(l => l.startsWith('FAIL')) || errs.length ? 1 : 0);
})();
