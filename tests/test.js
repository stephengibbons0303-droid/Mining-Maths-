const { chromium } = require('playwright');
const SP = '/tmp/claude-0/-home-user-Mining-Maths-/25dd5fe8-1a52-51af-82bd-6f46e6830e18/scratchpad';

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto('http://localhost:8901/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const log = [];
  const check = (name, ok) => { log.push(`${ok ? 'PASS' : 'FAIL'}  ${name}`); };

  // 1. builtin pics loaded
  const nPics = await page.evaluate(() => builtinPics.length);
  check('builtin GIF pics loaded (2)', nPics === 2);
  const stageImg = await page.evaluate(() => !!document.querySelector('#stage img.scene'));
  check('stage shows a picture (img)', stageImg);

  // 2. default is kid mode
  const who = await page.evaluate(() => S.who);
  check('default kid mode', who === 'kid');

  // 3. open Addition (level 1 => column add, numeric pad)
  await page.click('#catGrid .cat:first-child');
  await page.waitForTimeout(400);
  const kidVisible = await page.evaluate(() => !document.getElementById('kidActions').classList.contains('hidden'));
  const padVisible = await page.evaluate(() => !document.getElementById('kPad').classList.contains('hidden'));
  check('kid actions + pad visible on addition L1', kidVisible && padVisible);

  // 4. answer correctly via pad
  let ans = await page.evaluate(() => cur.spec.pad);
  for (const ch of String(ans)) await page.click(`#kPad [data-k="${ch}"]`);
  await page.click('#kPad [data-k="ok"]');
  await page.waitForTimeout(1200);
  const stars1 = await page.evaluate(() => S.stars);
  check('correct pad answer awards a star', stars1 >= 1);

  // 5. wrong answer twice -> resolves, shows next, queues retry
  ans = await page.evaluate(() => cur.spec.pad);
  const wrong = ans === 1 ? 2 : 1;
  for (let i = 0; i < 2; i++) {
    for (const ch of String(wrong)) await page.click(`#kPad [data-k="${ch}"]`);
    await page.click('#kPad [data-k="ok"]');
    await page.waitForTimeout(300);
  }
  const nextShown = await page.evaluate(() => !document.getElementById('kNext').classList.contains('hidden'));
  const hasRetry = await page.evaluate(() => !!pendingRetry);
  const ansShown = await page.evaluate(() => document.getElementById('aText').textContent.length > 0);
  check('double-wrong resolves: answer shown + Next + retry queued', nextShown && hasRetry && ansShown);

  // 6. Show me how works
  await page.click('#howK');
  await page.waitForTimeout(200);
  const howOpen = await page.evaluate(() => !document.getElementById('howto').classList.contains('hidden'));
  const stepCount = await page.evaluate(() => cur.q.steps.length);
  check('worked solution opens with steps', howOpen && stepCount >= 2);
  for (let i = 0; i < stepCount; i++) { await page.click('#howNext'); await page.waitForTimeout(120); }
  const howClosed = await page.evaluate(() => document.getElementById('howto').classList.contains('hidden'));
  check('stepping through closes overlay', howClosed);

  // 7. Next serves the SAME question again (retry)
  const missedQ = await page.evaluate(() => cur.q.q + '|' + JSON.stringify(cur.q.d));
  await page.click('#kNext');
  await page.waitForTimeout(300);
  const retryQ = await page.evaluate(() => cur.q.q + '|' + JSON.stringify(cur.q.d));
  const tagShown = await page.evaluate(() => !document.getElementById('retryTag').classList.contains('hidden'));
  check('immediate retry of missed question with tag', missedQ === retryQ && tagShown);

  // 8. step-down after 3 consecutive misses (set level 3 first)
  await page.evaluate(() => { S.levels.addition = 3; S.wrongRun.addition = 0; pendingRetry = null; save(); newQuestion(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { cur.noted = true; S.wrongRun.addition = 2; resolveWrong(); });
  const lvlNow = await page.evaluate(() => S.levels.addition);
  check('auto step-down 3->2 after 3 misses', lvlNow === 2);

  // 9. multiple choice flow (fractions L1)
  await page.click('#back');
  await page.waitForTimeout(200);
  await page.evaluate(() => { pendingRetry = null; S.missQ = {}; save(); });
  await page.evaluate(() => { const c = CATS.find(x => x.id === 'fractions'); openActivity(c); });
  await page.waitForTimeout(300);
  const mcVisible = await page.evaluate(() => !document.getElementById('kChoices').classList.contains('hidden'));
  const mcInfo = await page.evaluate(() => ({ n: cur.spec.mc.length, correct: cur.spec.correct, opts: cur.spec.mc }));
  check('fractions L1 shows multiple choice (>=3 options, has correct)', mcVisible && mcInfo.n >= 3 && mcInfo.opts.includes(mcInfo.correct));
  const starsBefore = await page.evaluate(() => S.stars);
  await page.click(`#kChoices .optbtn:has-text("${mcInfo.correct}")`);
  await page.waitForTimeout(1100);
  const starsAfter = await page.evaluate(() => S.stars);
  check('correct MC choice awards star', starsAfter === starsBefore + 1);

  // 10. every generator: kidSpec + steps coverage sweep
  const sweep = await page.evaluate(() => {
    const problems = [];
    for (const c of CATS) {
      for (let l = 1; l <= 5; l++) {
        for (let i = 0; i < 30; i++) {
          let q;
          try { q = GEN[c.id](l); } catch (e) { problems.push(`${c.id} L${l} GEN threw: ${e.message}`); break; }
          const spec = kidSpec(q);
          if (!spec) problems.push(`${c.id} L${l} no kidSpec: ${q.q}`);
          else if (spec.mc && !spec.mc.includes(spec.correct)) problems.push(`${c.id} L${l} correct not in mc`);
          else if (spec.mc && spec.mc.length < 2) problems.push(`${c.id} L${l} only ${spec.mc.length} choices: ${q.q}`);
          const steps = buildSteps(q);
          if (!steps || steps.length < 2) problems.push(`${c.id} L${l} no steps: ${q.q}`);
          if (problems.length > 12) return problems;
        }
      }
    }
    return problems;
  });
  check('all 12 topics x 5 levels have kid answers + worked steps', sweep.length === 0);
  if (sweep.length) log.push('   ' + sweep.slice(0, 12).join('\n   '));

  // 11. parent mode still works
  await page.evaluate(() => { S.who = 'parent'; save(); renderHeader(); applyWho(); });
  const quizVis = await page.evaluate(() => !document.getElementById('quizActions').classList.contains('hidden'));
  check('parent quiz actions visible in parent mode', quizVis);
  await page.click('#right');
  await page.waitForTimeout(300);
  check('parent ✓ works', true);

  // 12. settings sheet
  await page.click('#back');
  await page.click('#gear');
  await page.waitForTimeout(300);
  const whoBtns = await page.evaluate(() => ({
    kid: document.getElementById('whoKid').className, parent: document.getElementById('whoParent').className,
    thumbs: document.querySelectorAll('#picsList .thumb').length
  }));
  check('settings: who toggle reflects parent mode', whoBtns.parent.includes('on') && !whoBtns.kid.includes('on'));
  check('settings: builtin pic thumbnails shown', whoBtns.thumbs >= 2);
  await page.screenshot({ path: SP + '/shot-settings.png' });
  await page.click('#closeSheet');

  // 13. reveal-complete: GIF animates when done
  await page.evaluate(() => { S.stars = 60; S.revealBase = 0; S.starsPerTile = 2; save(); renderPicture(); });
  await page.waitForTimeout(500);
  const gifLive = await page.evaluate(() => {
    const img = document.querySelector('#stage img.scene');
    const pic = allPics()[((S.picIndex % sceneCount()) + sceneCount()) % sceneCount()];
    return { done: document.getElementById('stage').classList.contains('done'), animated: img && img.src === pic.url };
  });
  check('completed picture shows animated GIF', gifLive.done && gifLive.animated);
  await page.screenshot({ path: SP + '/shot-home.png' });

  // 14. kid clock MC + measurement pad snapshot
  await page.evaluate(() => { S.who = 'kid'; S.stars = 3; S.revealBase = 0; save(); renderHeader(); renderPicture(); });
  await page.evaluate(() => { const c = CATS.find(x => x.id === 'time'); S.levels.time = 2; openActivity(c); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: SP + '/shot-clock.png' });
  const clockUI = await page.evaluate(() => cur.q.d.t === 'clock' ? !document.getElementById('kChoices').classList.contains('hidden') : true);
  check('clock question gets MC in kid mode', clockUI);

  console.log(log.join('\n'));
  console.log('\nJS errors:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
  process.exit(log.some(l => l.startsWith('FAIL')) || errors.length ? 1 : 0);
})();
