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
- **Current version: v12.** Family: Jad (7), little brother Rai, Dad (Stephen). Rai
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
- **Known trap ×2**: when patching `index.html` with python string slices between
  function names, the scene functions (shadowsSVG…wireCircuit) sit BETWEEN wireSpace
  and ziplineSVG — careless slicing has deleted them twice. Always `node --check` the
  extracted script AND load the page (the on-page red `#errbar` reports runtime errors).

## NEXT FEATURE (agreed): "Castle Siege" — crossbows & catapults maths game

Stephen's instinct: this is the most fruitful of the game ideas discussed
(vs 3D Jenga tower and Tetris/Drop-Match — see backlog). **Awaiting Jad's input
before building** — Stephen is asking him. Then build.

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

### Questions Jad is being asked (his answers steer build order)
1. Which fantasy matters most: **building** his own castle (→ castle editor, geometry),
   **smashing** the enemy's (→ invest in crumble/damage), or **beating** Rai/Dad
   (→ two-player first)?
2. His verdict on the other game ideas (3D Jenga tower with faux physics;
   Drop-Match falling-tile matcher) — build later, shelve, or never.
3. Any of his own ideas.

### Suggested first build slice (once Jad answers)
Solo vs simple AI, one projectile weight + one castle layout, numeric power dial only
(fixed 45° angle), tape + landing marker + "how far short?" correction input,
scripted crumble, win/lose fanfare, ★ rewards wired into existing `award()`.
Then layer: weights, wind, angle, platforms, 2-player, castle editor — in whatever
order Jad's answers dictate. Entry point: add to the 🎮 row (sprint button pattern,
`#sprintBtn` / `startSprint()` as the template).

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
