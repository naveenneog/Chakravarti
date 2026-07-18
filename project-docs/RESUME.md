# Resume Context — Chakravarti: Chronicles of Bharat

Last updated: 2026-07-17. Read this first to resume work.

## What this is

A mobile-first, single-player **3D action game** with an optional strategy
overlay and evidence-aware historical framing. Repo `naveenneog/Chakravarti`,
deployed to GitHub Pages from `main` + `/docs`, live at
<https://naveenneog.github.io/Chakravarti/>.

The first playable chapter is **"The Timber Gate"** (The Fall of the Nandas):
young Chandragupta infiltrates the timber district of Pataliputra.

## Current state

- Latest release: **v0.7.0** (tag `v0.7.0`), on `main`.
- Working tree clean; everything committed and pushed.
- `package.json` version `0.7.0`. 46 unit tests pass (`npm run test`); browser
  smoke via `npm run test:smoke` (build Pages first). Current mobile build:
  `Chakravarti-v0.6.1.apk` (rebuild with `npm run apk`).
- **Web/PWA is the authoritative product.** Unity (`unity/ChakravartiAction`) is
  a frozen v0.5.0 prototype — see `project-docs/UNITY_QA_REPORT.md`.

## Stack & commands

- Web game: **React 19 + React-Three-Fiber + three.js**, Vite, TypeScript.
- Native client: **Unity 6** under `unity/ChakravartiAction` (used for the Pages
  gameplay showcase capture).
- Android: **Capacitor** (`npm run apk`).
- Build Pages: `npm run build:pages` (outputs to `docs/`). Tests: `npm run test`.
  Lint: `npm run lint` (oxlint). Type-check: `npx tsc -b`.
- Deploy = commit `docs/` + push `main`; GitHub Pages builds automatically.

## Recent features (this arc)

1. **Sora story intro** (`src/nanda/StoryIntro.tsx`) — cinematic before the
   mission, generated via `tooling/story-media-manifest.json` +
   `tooling/generate_media.py` (Azure Sora-2 + neural TTS). Media in
   `public/media/story/`. Skippable, poster fallback, replayable from War Council.
2. **First-run tutorial** (`src/nanda/MissionTutorial.tsx`) — teaches
   move/jump/strike/open/heal; flags persisted via `src/nanda/onboarding.ts`.
3. **Stealth-aware guard AI** (`src/nanda/guardAi.ts`, tested in
   `guardAi.test.ts`) — pure, engine-agnostic FSM: vision cone + noise-based
   hearing, patrol/suspicious/chase/attack/retreat, flanking, telegraphed
   strikes. Consumed by `NandaMission.tsx`'s `useFrame`. Alert indicators +
   "Spotted" HUD prompt.
4. **Mobile GPU perf pass** — scene lights 8→5, fewer shadow casters, removed a
   per-frame allocation in `NandaMission.tsx`.
5. **Boss fight** (`src/nanda/bossAi.ts`, tested in `bossAi.test.ts`) — the Nanda
   Captain holds the gate: pure health-phased FSM (measured/aggressive/
   desperate) with telegraphed strikes, lunges + vulnerable recovery windows.
   Gate opens only once the captain falls. Boss HP bar + phase readout in the HUD.
6. **Aftermath cutscenes** (`src/nanda/OutcomeCutscene.tsx`) — victory/defeat
   Sora cinematics before the debrief, once per completion, skippable. Defeat =
   disciplined withdrawal (gate holds, no capture), matching the `withdrawal`
   outcome. Manifests: `tooling/outcome-{victory,defeat}-manifest.json`. Chosen
   from `state.outcome` (withdrawal→defeat). Reviewed by Sol before building.
7. **Browser smoke test** (`tests/smoke.mjs`, `npm run test:smoke`, v0.6.2) —
   playwright-core + system Edge/Chrome against the built docs bundle.
8. **Grandiose character pass** (v0.6.3) — reviewed human palette + PBR, role
   silhouettes (hero/guard/captain), captain helmet, rim light, in
   `NandaMission.tsx` (`themedCharacterClone`, `CHARACTER_PALETTE`).
9. **Kalinga chapter envelope** (v0.7.0–v0.7.3) — `src/game/KalingaIntro.tsx`
   cinematic before the tactical battle, and a dedicated `KalingaDebrief` in
   `src/App.tsx` (view `'kalinga-debrief'`) after it that ties the player's
   result to Edict XIII, then links to the codex. Deterministic battle engine
   (`src/game/`) unchanged.

## Conventions

- Ship each feature as its own scoped commit + a `chore: rebuild Pages and
  release vX.Y.Z` commit; bump `package.json`, update `CHANGELOG.md`, tag
  `vX.Y.Z`, merge/land on `main`, push (rollback-safe).
- Keep game AI/logic as pure, unit-tested modules (like `guardAi.ts`), separate
  from the R3F render loop.
- Plain CSS with `--cp-*` theme variables (no Tailwind/shadcn).
- Azure media: endpoint `https://ai-contosohub530569751908.cognitiveservices.azure.com`,
  AAD via `az account get-access-token --resource https://cognitiveservices.azure.com`.
  `tooling/.media-state*.json` is gitignored (paid-render idempotency state).

## Agent skills installed (skills.sh)

`.agents/skills/` + `skills-lock.json` hold 5 skills for GitHub Copilot:
`vercel-react-best-practices`, `playwright-best-practices`, `playwright-cli`,
`test-driven-development`, `webapp-testing`. Fetch more via
`npx skills add <owner/repo> --skill <name> --agent github-copilot --copy -y`
(browse <https://www.skills.sh/topic>).

## Next options (not started)

- Further mobile perf (Draco/KTX2 compression, instanced palisade posts, LOD;
  also the intro mp4 is still ~5.8 MB uncompressed — could re-encode like the
  outcome clips at ~0.3–0.7 MB).
- More chapters / a second boss, building on `bossAi.ts`.
- Second campaign chapter from the roadmap in `project-docs/GAME_DESIGN.md`.
