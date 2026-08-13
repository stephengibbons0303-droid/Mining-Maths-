# Progress — Jad's Maths Quest

What was started with, and what has been built, release by release. For *how to
work on the project* (conventions, testing, traps, next steps) see `HANDOVER.md`.

## Initial state (session start, 2026-08-12)

Stephen uploaded a single hand-built HTML file: a Minecraft-themed maths
activity page for Jad (age 7, UK curriculum), designed as a **parent-led**
activity — Dad read the questions and marked answers by hand. Alongside it, two
reward GIFs (`minecraftsea.gif`, `trexroar.gif`) meant to be revealed as
prizes. Nothing was deployed; the GIFs weren't wired in; there were no worked
solutions, no difficulty adaptation, no science content, no tests.

The brief: assess it, wire in the GIF rewards, make it something Jad could use
independently on his Android tablet — including fully offline — and deepen the
pedagogy (worked solutions, retries, hints).

## What was built (v1 → v19, all this session)

### Foundation — the app becomes a real product (`c7a10d8`…`224315b`, v1–v3)
- Repo set up; app restructured as an offline-first PWA on GitHub Pages
  (deploy-from-branch, service worker precache, manifest, self-hosted fonts,
  slate-themed icons). Live at
  https://stephengibbons0303-droid.github.io/Mining-Maths-/
- GIFs bundled as in-app **hidden-picture rewards**: stars reveal tiles.
- **Kid mode** (Jad answers himself: number pad or multiple choice, derived
  per-question) alongside the original **Dad mode**; per-question **worked
  solutions** ("Show me how", step-by-step); **retry system** — immediate
  retry, missed questions requeued 4 later, automatic step-down after 3
  consecutive misses; hint coverage completed across all topics.
- v3 fixed the first real-device bug: boot no longer waits on the 3.3 MB GIFs
  (blank screen on Stephen's phone), plus an on-page error bar.

### Answer entry & first science expansion (`a2be571`…`d6378a5`, v4–v5)
- Pad entry extended with **£/p money**, **remainder (r)** and **negative (−)**
  inputs so division-with-remainder, money and temperature questions are typed,
  not multiple-choice. Unclear web-audio TTS removed.
- **Space topic** (astronaut jump under different gravity) and three further
  interactive science topics; **maths missions** embedded in every science
  topic (+2★ pad questions); **revisit quizzes**.

### Pedagogy & look, driven by real tablet testing (`1813468`…`2da0a64`, v6–v11)
- Colour-grouped tens/ones columns confused Jad in testing → columns became a
  **tappable scaffold**, then fully neutral.
- Plain purple → **slate cave theme**, then a **bright kid palette** (grey text
  read as "dull" on the tablet); **tablet-first portrait layout** with margins
  reclaimed.
- Science scenes rebuilt as wide **420-unit panoramas** after a survey showed
  most scenes used a fraction of the screen. Full solar system + Moon with the
  astronaut jumping **on each planet**; Racing Light with the Voyager story;
  Zip Line physics (speed/time); times-table **Sprint**; negative temperatures;
  Machines (pulleys/ramps/Lego) and Sound & Echoes (whales/bats — the topics
  Jad, Rai and Dad had been reading about); mastery **certificates**.
- **Reading gates**: science text reveals sentence-by-sentence and Next stays
  locked briefly, so explanations can't be skipped.

### Interaction depth (`eeeda05`…`08a92c7`, v12–v13)
- **Five drag-and-drop science interactions** (circuit, floating, shadows,
  zip line, machines) via SVG pointer events.
- v13: drags were dead on the real tablet — Chromium only honours
  `touch-action` on the SVG **root**. Fixed in CSS; every drag surface now
  guarded by a CDP-emulated touch test suite. Playwright suites committed to
  `tests/` and `HANDOVER.md` started.

### Castle Siege (`890aae5`…`fb469a5`, v14–v15 & v18)
- **v14**: turn-based numeric-artillery game (Gorillas lineage, Stephen's
  crossbows-and-catapults idea). Aiming is a typed number (power = metres);
  unlabelled distances force estimation; the correction after a miss **is the
  input** (＋/− difference); enemy accuracy tightens each shot; scripted block
  crumble. Gated design principle: no drag-aim, no trajectory preview — the
  maths stays calculated, never instinctive.
- **v15**: win condition from Stephen's tabletop Crossbows & Catapults design —
  smash two walls (±6 m) to expose the **throne** in the gold keep, then a
  precision shot within ±3 m **captures** it. Enemy can capture yours.
- **v18**: castles rebuilt as elaborate Minecraft-style block builds (~60
  bricks: towers, battlements, torches, gate, arrow slits, flag tower) after
  Jad's dad rightly called the 6-block original too simple. Damage tells a
  story: flag tower first, walls second, throne in the rubble.

### Directed learning (`832be2d`…`84af566`, v16–v17)
- **v16**: **Quest Board** — 3 quests per play day (Practice = least-recently
  practised topic, Challenge = weakest topic framed as a 🐉 with double stars,
  Explorer rotates science/sprint/surprise). Battles gated: 1 free + 1 per
  quest; all three = 👑 **Crown** → endless battles. Badge shelf (18 badges).
  Dad override toggle in Settings.
- **v17**: corrections from Stephen — Jad plays **every other day**, so all
  "today/daily" time-window copy removed app-wide (he's 7; nothing should ever
  say a reward expires), the streak made **gap-tolerant** (≤3-day gaps keep it
  — it was mathematically impossible for an every-other-day player before),
  and **Castle Siege goes landscape** (orientation lock in the installed app +
  side-by-side scene/keypad layout).

### Castle editor (`94142c6`, v19)
- 🛠 **build-your-own-castle editor**: 8×10 grid over the fixed gold keep;
  Stone(1)/Torch(2)/Flag(4) palette against a **40-block budget** (the maths
  is the running cost arithmetic); **no floating blocks** support rule; design
  persists and fights in every battle, crumbling in two layers. Classic castle
  restorable; enemy keeps the classic build.

### Pass-and-play (v20 — current)
- Castle Siege **two-player mode**: mode picker over a battlefield preview
  (🤖 solo / 👥 two players), Jad/Rai/Dad name chips, alternating turns with
  a "pass the tablet" prompt, mirrored catapults, both castles relocating on
  hits, the same estimation-and-correction maths in both directions, and the
  throne-capture endgame either way. Both modes cost one battle token (so
  2-player can't bypass quest gating). Jad's editor build fights on
  whichever side is named Jad.

### Review pass + Stephen's UI feedback (v21–v23)
- **v21**: full-repo code review — 10 verified fixes, headlined by the enemy
  AI clamp that turned wide misses into direct hits (could even steal the
  throne), plus day-rollover drift, fade guards, dead speech code, sw.js
  offline errors, and a perpetual WebGL render loop.
- **v22**: four-angle /simplify pass — shared `canFade` predicate, column
  subtraction borrowing in true paper order (no negative digits), 3D loop
  lifecycle owned properly, `renderHome()` naming the home render set.
- **v23**: Stephen's tablet feedback — fixed the games row (Build button had
  swallowed the row, crushing Sprint/Siege to 65px); editor gained planks
  (side-supportable — bridges!), turret caps and windows plus an explicit
  "which castle fights" selector that no longer wipes the build; and the
  first ballistics maths layer: light/heavy rocks (heavy = ×2 smash, flies
  HALF the power, even numbers only), true parabolic flight with a trail.

### Physical catapult controls (v24)
- Stephen's spec: drag the catapult arm back to set power (arm visibly
  cocks, big numeric readout, ±1 fine arrows), tap ▲▼ to step the launch
  angle (15°–75°; 45° flies full power, 30°/60° fly ¾, 15°/75° fly ½ —
  fractions of amounts), pick a rock in kilogrammes (1 kg flies ×2, 2 kg
  steady, 4 kg flies ½ and smashes two layers), then 🔥 pull the release
  lever. Arc height follows the angle; no trajectory preview, so every
  shot still needs the arithmetic. Number pad removed from the siege.

## State at end of session

- **Live version: v20**, deployed and verified green on Pages.
- 12 maths topics × 5 levels, kid/dad modes, worked solutions, adaptive retry.
- 13 interactive science topics with missions, quizzes, drags, reading gates.
- Games: times-table Sprint, Castle Siege (solo + pass-and-play + editor),
  quest board with battle tokens, crown, badges, gentle gap-tolerant streak.
- 10 Playwright suites in `tests/` (~100 checks), all green at v20:
  `test.js`, `test-v4/v5/v9/v12/v16/v17.js`, `test-siege.js`,
  `test-editor.js`, `test-2p.js`, plus `test-touch.js` (CDP touch),
  `test-sw.js`, `test-slow.js`, `survey.js`.
- Next up (agreed): per-player castle designs (Rai builds his own), then
  weights / wind / angle layers. See `HANDOVER.md` for the full backlog.
