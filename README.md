# Jad's Maths Quest

A maths + science practice app for Jad, with Minecraft picture rewards. Works fully offline once installed.

## What's inside

- **12 maths topics** with 5-level progression ladders (concrete → pictorial → abstract)
- **Kid mode** — Jad answers himself with a number pad or answer choices, and the app checks
- **Dad mode** — parent-led Tracker / Quiz-me flows (the original design)
- **🧭 Show me how** — step-by-step worked solutions for every question
- **Smart practice** — missed questions come back for a retry and again a few questions later; 3 misses in a row gently drops the level
- **Hidden picture rewards** — stars reveal tiles over Minecraft GIFs (`pics/`), which animate when fully revealed; add your own from Settings
- **Science topics** with predict → test → reveal experiments

## Deploying

Pushed via the GitHub Actions workflow in `.github/workflows/pages.yml`.
One-time setup: repo **Settings → Pages → Source: GitHub Actions**.

## Installing on a tablet

1. Open the GitHub Pages URL in the tablet browser (online, once)
2. Browser menu → **Add to Home screen** / **Install app**
3. The service worker caches everything — it now runs fully offline
