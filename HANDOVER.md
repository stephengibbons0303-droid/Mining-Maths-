# Handover — Jad's Maths Quest

Working notes for the next session. Read this first; it captures project state,
conventions, testing traps, and the agreed next feature (Castle Siege v2
pass-and-play). For the release-by-release history see `PROGRESS.md`.

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
- **Current version: v24.** Family: Jad (7), little brother Rai, Dad (Stephen). Rai
  appears in word-problem name pools; sound topic references him.
- **Usage pattern**: Jad uses the tablet roughly **every other day**, not daily.
- **COPY RULE (Stephen, v17)**: never convey time windows or deadlines to Jad —
  no "today", "daily", "until midnight", countdowns or expiry language anywhere
  in app copy. He's 7. Mechanics may still roll over by calendar date internally;
  the words must not say so.
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
- Suites: `test.js` (core kid/dad/retry/steps), `test-v4/v5/v9/v12.js` (feature
  eras), `test-v16.js` (quests/tokens/badges), `test-v17.js` (time-free copy,
  gap-tolerant streak, landscape layouts), `test-siege.js` (full match to
  throne capture), `test-editor.js` (castle editor), `test-2p.js`
  (pass-and-play). All green at v20.
  `survey.js` measures scene sizes. Note: the local `http.server 8901` dies
  between shell commands in the cloud env and must be started from the REPO
  ROOT (wrong cwd = silent 404s).
- **Touch lesson (v13)**: Chromium honours `touch-action` only on the **SVG root**,
  not inner elements — per-element `touchAction='none'` works for mouse but real
  touchscreens hijack the gesture for scrolling/pull-to-refresh. Fix lives in CSS
  (`#topVis svg{touch-action:none}` + overscroll-behavior). `tests/test-touch.js`
  guards every drag surface with CDP-emulated touch — run it for any new drag UI.
- **Known trap ×2**: when patching `index.html` with python string slices between
  function names, the scene functions (shadowsSVG…wireCircuit) sit BETWEEN wireSpace
  and ziplineSVG — careless slicing has deleted them twice. Always `node --check` the
  extracted script AND load the page (the on-page red `#errbar` reports runtime errors).

## Castle Siege — v1 (v14) · editor (v19) · pass-and-play (v20) all SHIPPED.

v1 is live: solo vs AI, 🏰 button in the games row. Implementation notes:
`startSiege()/SG` state, `siegeField()` draws battlefield (tape 0–100 m,
`sgX(m)` maps metres→svg x), `playerFire`/`enemyTurn` turn loop,
`sgCrumble` scripted block tumble, correction mode = ＋/− delta input.
Castles are Minecraft-style builds (v18, Stephen wanted more than 6 blocks):
~60 small brick rects per castle — corner towers with battlement caps and
torches, curtain wall, arched gate, arrow slits, tall central flag tower
(player flag blue, enemy red). Damage order via `.crow` groups: hit 1
tumbles the flag tower + tower caps, hit 2 the main walls, leaving the
broken gold keep + exposed throne amid rubble. `sgCrumble` tumbles every
rect/polygon/circle in the top group.
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

### Castle editor (v19, expanded v23 — SHIPPED)
🛠 Build button in the games row (free, no battle token). 8×10 grid above a
fixed gold keep; palette Stone(1)/**Plank(1)/Turret(1)/Window(1)** (v23)/
Torch(2)/Flag(4)/Remove with a **40-block budget** — the maths is the budget
arithmetic. Support rule: no floating blocks — EXCEPT **planks may hang off
a side neighbour** (`edSupported()`), so bridges between towers work.
Remove clears the block + everything above in the column (a plank left
side-hanging after that is tolerated — soft structural sim). Placeable
cells glow for the current tool. Design persists as `S.castle=[[c,r,t],…]`;
types s/p/c/w/t/f. **`S.castleUse` ('own'|'classic', v23)** picks which
castle fights via chips in the editor — choosing classic NEVER wipes the
build (the v19 button destructively cleared it; Stephen flagged it).
Blocks sorted bottom-up, upper half tumbles on hit 1, lower half on hit 2.
Enemy keeps the classic build. `tests/test-editor.js` covers all of it.

### Physical firing controls + weights + angle (v23 rock pair → v24 full panel, SHIPPED)
Stephen requested tactile controls (drag-arm + release lever + angle
steppers + kg weights). The core no-instinct principle survives because
**everything resolves to visible numbers and there is NO trajectory
preview**: the drag sets a number on a big readout, landing feedback stays
numeric, and castles still relocate every hit.
- **Power**: drag the catapult arm back (arm visibly cocks, `.armActive`
  rotates `-15-pow*0.95°` about its pivot; pointer handler on #siegeSvg
  near the active catapult, mirrored for 2P player 2) — or tap ▼▲ for ±1.
  `sgSetPow()` clamps 1–100.
- **Angle**: ▼▲ stepper, 15°–75° in 15° steps. **45° = full power,
  30°/60° = ¾, 15°/75° = ½** (fractions of amounts — Year 3). Arc height
  follows the angle in `sgFly` (steep = high lob, short).
- **Weight**: three kg chips. **1 kg flies ×2 power** (halve to aim far),
  **2 kg flies exactly power** (the learnt baseline), **4 kg flies ½ and
  smashes two wall layers** (+4★). `sgLand() = round(pow·F(ang)·2/kg)`;
  overshoots past 100 m announce "right off the field".
- **🔥 PULL THE LEVER!** button fires (arm snap animation, then flight).
  Post-miss copy explains the active factors (`sgWhy()`); "last shot:
  power N" reminder shown. Enemy AI always fires the 2 kg/45° baseline
  (`sgFly(...,2,45)`); per-player pow/ang/kg in 2P via loadTurn/saveTurn.
The number pad is GONE from the siege (still used everywhere else).
Next layer: wind (signed adjustment).

### Pass-and-play (v20 — SHIPPED)
The 🏰 button now opens a **mode picker** over a battlefield preview:
🤖 solo (unchanged) or 👥 two players. Name chips (Jad/Rai/Dad, persisted
as `S.sg2`, same-name guard). Both modes cost one battle token, consumed
when the match starts (`useBattle()`), so 2-player can't bypass quest
gating. 2P state lives in `SG.two/turn/M{1,2}/HP{1,2}/pl{1,2}` — per-player
lastPow/sign/mode are swapped into the shared SG fields via
`loadTurn()/saveTurn()`, so `sgControls/sgKey/sgDisp` are reused untouched;
`sgKey` routes to `fire2P()` vs `playerFire()`. Both players aim by tape
mark (tag copy switches — "read the tape"); castles at rand(6–26) and
rand(60–92) both relocate on hits (churn both ways); same ±6/±3 tolerances,
same correction-as-input maths in both directions; catapults mirrored
(`cata(m,flip)`); name labels above castles; "pass the tablet" prompt each
turn; winner banner via `siegeEnd2`. Jad's editor build fights on
**whichever side is named Jad** (`castle(...,ownFlag)`).
`tests/test-2p.js` plays a full Jad-vs-Rai match both directions to
capture. NOTE: all siege-opening tests now click `#sgVsAI` after
`#siegeBtn` (the picker step).

### Next siege layers (agreed order)
Per-player editor designs (Rai builds his own too — store per-name
castles), then wind (signed adjustment), angle as a second number
(weights shipped in v23).

### UI trap (v23, learned the hard way)
`.newpic` has `width:100%`; inside `.gamesrow` the flex override MUST keep
`width:auto;min-width:0` — an inline `flex:0 0 auto` on a `.newpic` child
made the Build button swallow the whole row and crush Sprint/Siege to
65px (shipped broken v19–v22; Stephen caught it on the tablet).
`test-v17.js` now guards the row widths. When adding home-page buttons,
re-screenshot PORTRAIT, not just landscape.

## Directed learning (v16, reframed v17 — SHIPPED)
"⚔️ Quest Board" on the maths tab: 3 quests per **play day** — Practice
(least-recently practised topic, from per-topic history `S.hist{n,ok,last}`),
Challenge (lowest-accuracy topic, cold-start division, framed as 🐉 with
double-star bonus +6★), Explorer (rotates science-quiz / sprint / surprise
topic). Game gating: 1 free Castle Siege battle per board + 1 token per
quest; all 3 quests = 👑 Crown → endless battles (S.crowns counted).
Internally the board regenerates when `S.quests.date !== todayStr()` — i.e.
a fresh board each visit on Jad's every-other-day cadence; the crown/tokens
quietly reset with it, and **no copy ever mentions this** (see COPY RULE).
Streak is gap-tolerant (v17): `rollDate()` keeps `S.streak` through gaps of
≤3 days, so every-other-day play builds a streak; badges are 🔥 On Fire
(streak of 7 play days) and 🌋 Unstoppable (30). Badge shelf (Settings → 🏅):
All-Rounder, Dragon Slayer (50 division correct), Scientist, the two streak
badges, Crown Collector (win 5 crowns), plus bronze/silver/gold per maths
topic. Dad override: Settings toggle '⚔️ Quests & battle tokens' disables
gating entirely.
Key functions: ensureQuests/battlesLeft/questTick/renderQuests/badgeDefs.
`tests/test-v16.js` covers the loop; `tests/test-v17.js` guards the
time-free copy, gap-tolerant streak and fresh-board rollover.

## Landscape Castle Siege (v17 — SHIPPED)
Manifest `orientation` is now `"any"`; the app locks itself portrait at boot
via `lockOrient('portrait')` (guarded `screen.orientation.lock`, no-op where
unsupported, e.g. browser tabs that aren't fullscreen). `startSiege()` locks
landscape; Quit/Done re-lock portrait. So the installed PWA behaves exactly
as before everywhere except the siege, which rotates to a much bigger scene.
In a plain browser tab the lock is inert — rotating the tablet by hand gets
the same layout via CSS. Layout: `@media (orientation:landscape) and
(min-width:700px)` turns `.siegecard` into a grid — battlefield SVG + message
left (~900px wide on the tablet), keypad column (340px) right. This also
sets up v2 pass-and-play nicely (both players see the whole field).

## Backlog (agreed or parked)
- **3D Jenga tower** — parked pending Jad. If built: faux physics (stability meter +
  scripted collapse, NOT a physics engine), Three.js already in the file.
- **Drop-Match** — parked pending Jad. Self-paced falling-tile matcher, uniform tiles,
  no countdown; wall grows on mistakes. Dot-array faces on small answers.
- **Dinosaurs & fossils topic** (pairs with trexroar.gif reward), weekly quest map,
  theme toggle (if slate wears thin), second picture pack.
- **Watchpoint**: if Jad leans on "🧱 Show columns" every question, consider a small
  cost for it. If he spams through reading gates, consider comprehension checks.
- **Editor watchpoints (v19)**: does the 40-block budget feel generous or
  stingy once Jad builds? Does he ask for more piece types (gold blocks,
  windows, gate)? Both are one-line tunes (`ED_BUDGET`, `ED_COST` + a draw
  case). If he builds a 1-block "castle" and gets flattened, that's his
  lesson to keep — don't guard against it.

## Conventions
- Commits pushed straight to the branch above (no PRs). Playwright-test each release.
- Version bump = settings footer string + sw.js CACHE name, every user-visible change.
- Screenshots to Stephen via chat when a visual change lands; he tests on the real
  tablet (Android, portrait) and sends photos back.
