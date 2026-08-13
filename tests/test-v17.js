// v17: time-free copy, gap-tolerant streak, landscape siege layout.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 800, height: 1280 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8901/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  const log = [], ck = (n, ok) => log.push((ok ? 'PASS' : 'FAIL') + '  ' + n);

  // 1) quest header + settings toggle carry no time-window language
  let st = await p.evaluate(() => ({
    header: document.querySelector('#questCard h3').textContent,
    opts: [...document.querySelectorAll('.opt span')].map(s => s.textContent).join(' | ')
  }));
  ck('quest header is "Quest Board", time-free', st.header.includes('Quest Board') && !/today|daily/i.test(st.header));
  ck('settings toggle is time-free', !/daily|today|midnight/i.test(st.opts));

  // 2) blocked-battle toast has no "today"
  await p.evaluate(() => { ensureQuests(); S.battles.used = 99; save(); renderQuests(); });
  await p.click('#siegeBtn');
  await p.waitForTimeout(300);
  st = await p.evaluate(() => document.getElementById('toast').textContent);
  ck('blocked toast time-free: "' + st + '"', /No battles left/.test(st) && !/today|midnight/i.test(st));

  // 3) crown toast has no "daily"/"today"
  await p.evaluate(() => {
    S.quests.list.forEach(q => { q.done = q.need - 1; questTick(q.k === 'sprint' || q.k === 'science' ? q.k : 'cat', q.cat); });
  });
  await p.waitForTimeout(1600);
  st = await p.evaluate(() => document.getElementById('toast').textContent);
  ck('crown toast time-free: "' + st + '"', /CROWN/.test(st) && !/today|daily|midnight/i.test(st));

  // 4) badges: play-day streak wording, no "days in a row"; crown badge no "daily"
  st = await p.evaluate(() => badgeDefs().map(x => x.nm + ' ' + x.bd).join(' | '));
  ck('badges time-free, play-day streaks', /Streak of 7 play days/.test(st) && /Win 5 crowns/.test(st) && !/in a row|daily|today/i.test(st));

  // 5) streak survives a 2-day gap (every-other-day play) but not a 5-day gap
  await p.evaluate(() => {
    const d = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
    S.streak = 5; S.lastDate = d(2); save();
  });
  await p.reload(); await p.waitForTimeout(700);
  const s2 = await p.evaluate(() => S.streak);
  await p.evaluate(() => {
    const d = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
    S.streak = 5; S.lastDate = d(5); save();
  });
  await p.reload(); await p.waitForTimeout(700);
  const s5 = await p.evaluate(() => S.streak);
  ck('streak keeps through 2-day gap, resets after 5', s2 === 5 && s5 === 0);

  // 6) skipped days: quest board regenerates fresh (no stale crown / battles)
  st = await p.evaluate(() => {
    const d = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
    S.quests = { date: d(2), crown: true, list: [] }; S.battles = { date: d(2), used: 9, tokens: 3 }; save();
    ensureQuests();
    return { fresh: S.quests.date === todayStr(), crown: S.quests.crown, n: S.quests.list.length, left: battlesLeft() };
  });
  ck('new play day: fresh board, crown cleared, 1 free battle', st.fresh && !st.crown && st.n === 3 && st.left === 1);

  // 7) landscape: siege lays out scene + keypad side by side, big scene
  const p2 = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p2.on('pageerror', e => errs.push('L: ' + e.message));
  await p2.goto('http://localhost:8901/index.html', { waitUntil: 'load' });
  await p2.waitForTimeout(900);
  await p2.click('#siegeBtn');
  await p2.waitForTimeout(500);
  st = await p2.evaluate(() => {
    const card = document.querySelector('.siegecard'), svg = document.getElementById('siegeSvg'), ctl = document.getElementById('siegeCtl');
    const sr = svg.getBoundingClientRect(), cr = ctl.getBoundingClientRect();
    return { open: !document.getElementById('siege').classList.contains('hidden'),
      grid: getComputedStyle(card).display === 'grid', svgW: sr.width, sideBySide: cr.left > sr.right - 10 };
  });
  ck('landscape siege: grid layout, keypad beside scene, svg > 600px wide', st.open && st.grid && st.svgW > 600 && st.sideBySide);

  // 8) portrait unaffected: stacked layout
  st = await p.evaluate(() => {
    ensureQuests(); S.battles.tokens = 5; save();
    return true;
  });
  await p.click('#siegeBtn');
  await p.waitForTimeout(400);
  st = await p.evaluate(() => {
    const card = document.querySelector('.siegecard');
    const svg = document.getElementById('siegeSvg').getBoundingClientRect();
    return { open: !document.getElementById('siege').classList.contains('hidden'),
      stacked: getComputedStyle(card).display !== 'grid', svgW: svg.width };
  });
  ck('portrait siege unchanged: stacked layout', st.open && st.stacked && st.svgW > 500);

  // 9) footer version bumped
  const ver = await p.evaluate(() => document.getElementById('ver').textContent);
  ck('footer shows v17', ver.includes('· v17'));

  console.log(log.join('\n')); console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await b.close();
  process.exit(log.some(l => l.startsWith('FAIL')) || errs.length ? 1 : 0);
})();
