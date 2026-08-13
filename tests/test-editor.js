// v19 castle editor: budget maths, support rule, persistence, battle integration.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 800, height: 1280 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8901/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  const log = [], ck = (n, ok) => log.push((ok ? 'PASS' : 'FAIL') + '  ' + n);
  const cell = (c, r) => p.click(`#edSvg rect[data-c="${c}"][data-r="${r}"]`);
  const tool = t => p.evaluate(t => { ED.tool = t; edPalette(); }, t);

  // open editor: empty grid, full budget, 4 tools
  await p.click('#edBtn');
  await p.waitForTimeout(300);
  let st = await p.evaluate(() => ({
    open: !document.getElementById('editor').classList.contains('hidden'),
    tools: document.querySelectorAll('#edPal button').length,
    left: edLeftN(), cells: document.querySelectorAll('#edSvg rect[data-c]').length
  }));
  ck('editor opens: 4 tools, 40 blocks, 8x10 grid', st.open && st.tools === 4 && st.left === 40 && st.cells === 80);

  // place a stone on the ground row
  await cell(0, 0);
  st = await p.evaluate(() => ({ n: S.castle.length, left: edLeftN() }));
  ck('stone placed: saved to S.castle, 39 left', st.n === 1 && st.left === 39);

  // floating block rejected
  await cell(3, 5);
  st = await p.evaluate(() => ({ n: S.castle.length, msg: document.getElementById('edMsg').textContent }));
  ck('floating block rejected with message', st.n === 1 && /underneath|floating/i.test(st.msg));

  // torch costs 2, placed on top of the stone
  await tool('t');
  await cell(0, 1);
  st = await p.evaluate(() => ({ n: S.castle.length, left: edLeftN() }));
  ck('torch on top costs 2 (37 left)', st.n === 2 && st.left === 37);

  // remove tool clears the whole stack (no floaters)
  await tool('x');
  await cell(0, 0);
  st = await p.evaluate(() => ({ n: S.castle.length, left: edLeftN() }));
  ck('remove clears block + everything above', st.n === 0 && st.left === 40);

  // build a small castle: 3x2 stones + flag on top
  await tool('s');
  for (const [c, r] of [[2, 0], [3, 0], [4, 0], [2, 1], [3, 1], [4, 1]]) await cell(c, r);
  await tool('f');
  await cell(3, 2);
  st = await p.evaluate(() => ({ n: S.castle.length, left: edLeftN() }));
  ck('6 stones + flag built (30 left)', st.n === 7 && st.left === 30);

  // budget enforced
  await p.evaluate(() => { for (let i = 0; i < 30; i++) { ED.g[edKey(i % 8, Math.floor(i / 8) + 4)] = 's'; } edSave(); edDraw(); });
  await p.evaluate(() => { ED.tool = 'f'; });
  await cell(7, 0);
  st = await p.evaluate(() => ({ left: edLeftN(), msg: document.getElementById('edMsg').textContent }));
  ck('over-budget placement blocked with arithmetic message', st.left === 0 && /Not enough/.test(st.msg));
  await p.evaluate(() => { for (const k in ED.g) { const r = +k.split(',')[1]; if (r >= 4) delete ED.g[k]; } edSave(); edDraw(); });

  // done: editor closes, design persists
  await p.click('#edQuit');
  st = await p.evaluate(() => ({ closed: document.getElementById('editor').classList.contains('hidden'), n: S.castle.length }));
  ck('Done closes editor, design saved', st.closed && st.n === 7);

  // battle uses Jad's build: keep + 2 crumble groups, his flag flying
  await p.click('#siegeBtn');
  await p.waitForTimeout(400);
  st = await p.evaluate(() => ({
    open: !document.getElementById('siege').classList.contains('hidden'),
    pRows: document.querySelectorAll('#castleP .crow').length,
    eRows: document.querySelectorAll('#castleE .crow').length,
    flag: !!document.querySelector('#castleP polygon[fill="#58d0ff"]'),
    keep: !!document.querySelector('#castleP .keep')
  }));
  ck('battle: custom castle = keep + 2 groups, flag flying; enemy classic', st.open && st.pRows === 3 && st.eRows === 3 && st.flag && st.keep);
  await p.click('#siegeQuit');

  // classic restore
  await p.click('#edBtn');
  await p.waitForTimeout(300);
  await p.click('#edClassic');
  st = await p.evaluate(() => S.castle.length);
  ck('classic restore empties the design', st === 0);
  await p.click('#edQuit');
  await p.evaluate(() => { S.battles.tokens = (S.battles.tokens || 0) + 1; save(); });
  await p.click('#siegeBtn');
  await p.waitForTimeout(400);
  st = await p.evaluate(() => document.querySelectorAll('#castleP rect').length);
  ck('classic build back in battle (many bricks)', st > 40);
  await p.click('#siegeQuit');

  console.log(log.join('\n')); console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  await b.close();
  process.exit(log.some(l => l.startsWith('FAIL')) || errs.length ? 1 : 0);
})();
