// Daily quests, battle tokens, crown, badges.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 800, height: 1280 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8901/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  const log = [], ck = (n, ok) => log.push((ok ? 'PASS' : 'FAIL') + '  ' + n);

  // quest board renders 3 quests, 1 free battle
  let st = await p.evaluate(() => ({
    visible: !document.getElementById('questCard').classList.contains('hidden'),
    n: document.querySelectorAll('#questList .optbtn').length,
    kinds: S.quests.list.map(q => q.k), left: battlesLeft(),
    label: document.getElementById('siegeBtn').textContent
  }));
  ck('quest board: 3 quests visible, 1 free battle', st.visible && st.n === 3 && st.left === 1 && st.label.includes('⚔️1'));
  ck('quests are practice+challenge+explorer', st.kinds[0] === 'practice' && st.kinds[1] === 'challenge' && ['science', 'sprint', 'explore'].includes(st.kinds[2]));

  // tapping the practice quest opens its topic
  await p.click('#questList .optbtn');
  await p.waitForTimeout(400);
  st = await p.evaluate(() => ({ open: !document.getElementById('activity').classList.contains('hidden'), cat: cur.cat.id, q: S.quests.list[0].cat }));
  ck('practice quest opens its topic', st.open && st.cat === st.q);

  // answer 5 correct -> quest completes, +3 stars, +1 token
  const s0 = await p.evaluate(() => S.stars);
  for (let i = 0; i < 5; i++) {
    await p.waitForTimeout(300);
    const spec = await p.evaluate(() => cur.spec);
    if (spec.mc) {
      await p.evaluate(() => { [...document.querySelectorAll('#kChoices .optbtn')].find(b => b.textContent === cur.spec.correct).click(); });
    } else {
      if (spec.neg) { /* not expected at L1 */ }
      for (const ch of String(Math.abs(spec.pad))) await p.click(`#kPad [data-k="${ch}"]`);
      await p.click('#kPad [data-k="ok"]');
    }
    await p.waitForTimeout(1100);
  }
  // 5 in a row may trigger the level-up challenge modal — dismiss it
  await p.evaluate(() => { if (!document.getElementById('challenge').classList.contains('hidden')) document.getElementById('chLater').click(); });
  await p.waitForTimeout(300);
  st = await p.evaluate(() => ({ got: S.quests.list[0].got, tokens: S.battles.tokens, stars: S.stars }));
  ck('5 correct completes quest: +3★ bonus, +1 token', st.got && st.tokens === 1 && st.stars >= s0 + 5 + 3);
  await p.click('#back');
  await p.waitForTimeout(300);
  ck('battles now 2', await p.evaluate(() => battlesLeft()) === 2);

  // battle consumes a token; blocking when exhausted
  await p.click('#siegeBtn');
  await p.waitForTimeout(300);
  ck('battle starts, consumes one', await p.evaluate(() => !document.getElementById('siege').classList.contains('hidden') && battlesLeft() === 1));
  await p.click('#siegeQuit');
  await p.evaluate(() => { S.battles.used = 2; save(); renderQuests(); });
  await p.click('#siegeBtn');
  await p.waitForTimeout(300);
  ck('no battles left: siege blocked', await p.evaluate(() => document.getElementById('siege').classList.contains('hidden')));

  // crown: finish remaining quests -> unlimited
  await p.evaluate(() => {
    S.quests.list[1].done = 4;
    questTick('cat', S.quests.list[1].cat);
    S.quests.list[2] = { k: 'sprint', need: 1, done: 0, got: false };
    questTick('sprint');
  });
  await p.waitForTimeout(300);
  st = await p.evaluate(() => ({ crown: S.quests.crown, crowns: S.crowns, left: battlesLeft() }));
  ck('all quests -> Daily Crown, unlimited battles', st.crown && st.crowns >= 1 && st.left === Infinity);
  await p.click('#siegeBtn');
  await p.waitForTimeout(300);
  ck('crowned: siege opens freely', await p.evaluate(() => !document.getElementById('siege').classList.contains('hidden')));
  await p.click('#siegeQuit');

  // badges overlay
  await p.click('#gear');
  await p.click('#badgeRow');
  await p.waitForTimeout(300);
  st = await p.evaluate(() => ({
    open: !document.getElementById('badges').classList.contains('hidden'),
    n: document.querySelectorAll('#badgeGrid .badge').length,
    crownBadge: [...document.querySelectorAll('#badgeGrid .badge')].some(b => b.textContent.includes('Crown Collector')),
    dragon: [...document.querySelectorAll('#badgeGrid .badge')].some(b => b.textContent.includes('Dragon Slayer'))
  }));
  ck('badge shelf: 18 badges incl Dragon Slayer + Crown Collector', st.open && st.n === 6 + 12 && st.crownBadge && st.dragon);
  await p.click('#badgeClose');

  // dad override: quests off -> board hidden, battles unlimited
  await p.click('#gear');
  await p.click('#optQuests');
  await p.waitForTimeout(200);
  st = await p.evaluate(() => ({ hidden: document.getElementById('questCard').classList.contains('hidden'), left: battlesLeft() }));
  ck('quests toggled off: board hidden, battles unlimited', st.hidden && st.left === Infinity);
  await p.evaluate(() => { S.questsOn = true; save(); renderQuests(); });

  console.log(log.join('\n')); console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await b.close();
  process.exit(log.some(l => l.startsWith('FAIL')) || errs.length ? 1 : 0);
})();
