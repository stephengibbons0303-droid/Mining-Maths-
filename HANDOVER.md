# Handover — Jad's Maths Quest

Working notes for the next session. Read this first; it captures project state and the
agreed design for the next major feature (Castle Siege).

## Project snapshot

- **What**: offline-first PWA for Jad (age 7, UK curriculum) — 12 maths topics with
  5-level ladders + kid/dad answer modes, 13 interactive science topics, times-table
  sprint, Minecraft GIF picture rewards, mastery certificates.
- **Live**: https://stephengibbons0303-droid.github.io/Mining-Maths-/ — GitHub Pages,
  deploy-from-branch `claude/minecraft-math-activity-review-yty9ur` (root). Every push
  redeploys automatically.
- **Stack**: single `index.html` (~. Three.js embedded inline for 3D shapes), `sw.js`
  service worker (bump `CACHE = 'jadquest-vN'` on every release **and** the `· vN`
  version string in the settings footer of index.html — users verify updates by it),
  self-hosted fonts, `pics/` bundled reward GIFs.
- **Current version: v15.** Family: Jad (7), little brother Rai, Dad (Stephen). Rai
  appears in word-problem name pools; sound topic references him.
- **Design language**: dark slate bg, ice-blue `#cfeaff` labels, sunny yellow `#ffe89a`
  guidance, cyan `#58d0ff` headings, gold stars, white numbers. Scenes are wide
  420-unit SVG panoramas (tablet-first, ~94% width at 800px). Science steps engine:
  `say` (sentence-by-sentence reveal gate) / `ask` (MC, delayed Next) / `predict`
  (predict→test→reveal) / `mission` (pad-entry maths, +2★). Drag interactions use
  `svgPt()` + pointer events (see wireCircuit/wireFloat/wireShadows/wireZip/wireMachines).

## Testing

- Playwright suites live in `tests/` (committed this session — they previously lived in
  ephemeral scratchpad). Run: `python3 -m http.server 8901` from repo root, then
  `cd tests && npm install playwright && node test.js` (chromium at
  `/opt/pw-browsers/chromium` in the cloud env; locally let Playwright download).
- Suites: `test.js` (core kid/dad/retry/steps), `test-v4/v5/v9/v12.js` (features).
  All green at v12. `survey.js` measures scene sizes.
- **Touch lesson (v13)**: Chromium honours `touch-action` only on the **SVG root**,
  not inner elements — per-element `touchAction='none'` works for mouse but real
  touchscreens hijack the gesture for scrolling/pull-to-refresh. Fix lives in CSS
  (`#topVis svg{touch-action:none}` + overscroll-behavior). `tests/test-touch.js`
  guards every drag surface with CDP-emulated touch — run it for any new drag UI.
- **Known trap ×2**: when patching `index.html` with python string slices between
  function names, the scene functions (shadowsSVG…wireCircuit) sit BETWEEN wireSpace
  and ziplineSVG — careless slicing has deleted them twice. Always `node --check` the
  extracted script AND load the page (the on-page red `#errbar` reports runtime errors).

## Castle Siege — v1 SHIPPED (v14). Next: v2 pass-and-play, v3 castle editor.

v1 is live: solo vs AI, 🏰 button in the games row. Implementation notes:
`startSiege()/SG` state, `siegeField()` draws battlefield (tape 0–100 m,
`sgX(m)` maps metres→svg x), `playerFire`/`enemyTurn` turn loop,
`sgCrumble` scripted block tumble, correction mode = ＋/− delta input.
Win condition (v15, Stephen's design): each castle guards a THRONE inside
a gold keep (tabletop C&C homage). Smash 2 walls (±6 m tolerance) to
EXPOSE the sparkling throne, then a precision shot within ±3 m CAPTURES
it — the endgame demands finer arithmetic. Enemy can capture yours too.
Other v1 decisions: castle distance UNLABELLED (first shot = estimation),
power maps 1:1 to metres, keep relocates after every hit (churn), enemy
accuracy tightens per shot [±16,±10,±5,±3,0], stars: +2/wall, +5 capture.
`tests/test-siege.js` plays a full match to throne capture.

### Core design principle (the whole game hangs on this)
Angry-Birds-style drag-to-aim makes ballistics **instinctive** — motor calibration,
zero arithmetic. The maths only exists if **aiming is numeric input** (Gorillas /
Scorched Earth lineage): set power / angle / projectile weight as NUMBERS, commit,
then watch. **No live trajectory preview while adjusting** — a preview reintroduces
the instinct channel.

### Mechanics agreed in discussion
- 2D side-view battlefield with a **measuring tape along the ground (0–100 m)**.
  Turn-based artillery: player castle vs enemy castle, first destroyed loses.
- **Feedback is arithmetic**: shot lands at 45 m, target at 70 m → the correction IS
  the input ("add how much power?") — differences within 100 as the core loop.
- **Projectile weights → doubling/halving**: 2 kg rock flies half as far on the same
  power, does double damage. Wall HP ÷ damage = hits needed (division).
- **Wind → signed adjustment** (+/− m), reusing the negative-number work from
  Measurement L5 temperatures.
- **Anti-instinct churn**: castle distance, wind, platforms and weights change every
  round so number lookups can't be memorised — only the method becomes fluent.
- **Maths difficulty deliberately BELOW practice level** (fluency application, not
  learning edge): differences ≤100, double/halve, small multiples. The game applies
  facts; the practice modes teach them.
- **Turn-based** (no time pressure — same lesson as rejecting Tetris) and therefore
  **pass-and-play 2-player free**: Jad vs Rai / Jad vs Dad, one tablet. Possibly more
  valuable than the AI enemy; AI enemy for solo can be simple (random ± error that
  shrinks each round).
- Build cost: modest. Parabola math by formula (no physics engine); castle blocks
  crumble via scripted tumble (same trick planned for Jenga). 2D SVG/canvas in the
  existing stack.

### Jad's answers (received)
1. Fantasy: **ALL THREE — build, smash AND beat.** So the full vision is on:
   castle editor, satisfying crumble, and pass-and-play two-player. Suggested
   phasing: v1 solo numeric artillery + scripted crumble → v2 pass-and-play
   (Jad vs Rai/Dad) → v3 castle editor (place-your-own-blocks, geometry).
2. Verdict on Jenga tower / Drop-Match: not yet given — ask again later.
3. His own ideas: none captured yet.

### v2/v3 roadmap
v2 pass-and-play: two catapults + two castles, alternate real players (name
prompts, Jad vs Rai vs Dad), same correction maths both ways. v3 castle
editor: place-your-own-blocks before battle (geometry). Then layer weights
(double/halve), wind (signed adjustment), angle as a second number.

## Backlog (agreed or parked)
- **3D Jenga tower** — parked pending Jad. If built: faux physics (stability meter +
  scripted collapse, NOT a physics engine), Three.js already in the file.
- **Drop-Match** — parked pending Jad. Self-paced falling-tile matcher, uniform tiles,
  no countdown; wall grows on mistakes. Dot-array faces on small answers.
- **Dinosaurs & fossils topic** (pairs with trexroar.gif reward), weekly quest map,
  theme toggle (if slate wears thin), second picture pack.
- **Watchpoint**: if Jad leans on "🧱 Show columns" every question, consider a small
  cost for it. If he spams through reading gates, consider comprehension checks.

## Conventions
- Commits pushed straight to the branch above (no PRs). Playwright-test each release.
- Version bump = settings footer string + sw.js CACHE name, every user-visible change.
- Screenshots to Stephen via chat when a visual change lands; he tests on the real
  tablet (Android, portrait) and sends photos back.
