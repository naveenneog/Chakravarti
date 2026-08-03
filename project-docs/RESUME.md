# Resume Context — Chakravarti: Chronicles of Bharat

Last updated: 2026-08-02. Read this first to resume work.

## What this is

A mobile-first, single-player **3D action game** with an optional strategy
overlay and evidence-aware historical framing. Repo `naveenneog/Chakravarti`,
deployed to GitHub Pages from `main` + `/docs`, live at
<https://naveenneog.github.io/Chakravarti/>.

The first playable chapter is **"The Timber Gate"** (The Fall of the Nandas):
young Chandragupta infiltrates the timber district of Pataliputra.

## Current state

- Latest release: **v0.11.0** (tag `v0.11.0`), on `main`.
- Working tree clean; everything committed and pushed. **295 unit tests pass.**
- `package.json` version `0.11.0`. Browser smoke via `npm run test:smoke` (18/18).
- **The anthology is complete.** All five roadmap chapters are playable, and they
  are deliberately a tour of *evidential situations*: Kalinga (one-sided, the
  perpetrator's own inscription), The Western Horizon (no narrative at all, only
  coins and inscriptions), The Brahmaputra Holds (two traditions corroborating),
  The Defiance at Narrai (only the invaders wrote), The Hills of Pratapgad
  (accounts that contradict and are left unresolved). Each has a distinct verb;
  do not collapse them into one shared campaign engine.
- New chapters live in `src/saraighat/`, `src/narrai/`, `src/pratapgad/`, each
  with its own pure deterministic engine + tests, following the established
  per-chapter convention. They share only `src/chapters/campaign.css`.
- **Design constraints that are enforced by tests, not just documented:**
  Pratapgad exposes no attack/strike/kill action, never names the opposing
  commander as a target, and has no combat state at all; Narrai never exposes the
  queen's death as an action, offers no counterfactual victory, and never uses
  victor-side chronicle figures as balance numbers. Do not "add combat" to
  Pratapgad or a win condition to Narrai — both would break the chapter.
- **Approval status:** all three briefs carry a sign-off block recording product
  owner approval on 2026-08-03 and that **no independent specialist review was
  obtained**. If one is engaged later, re-examine the briefs and the shipped
  chapters together.
- **Chapter II — The Western Horizon (v0.10.0).** `src/vikrama/` is a complete,
  self-contained turn campaign (types / content / engine / persistence / UI),
  wired into `App.tsx` as view `'western'`. It deliberately has **no battle**:
  the design brief forbade inventing one, so coinage displacement is the win
  condition and the ending is a historian's dossier. Engine is pure and
  deterministic (no RNG); `advanceCoinage` scales Gupta displacement by
  acceptance and decays Kshatrapa silver only once reach is real. In-game
  artifacts are dated to the player's reconstructed reign — **never put a real
  regnal year in an artifact title**, it is enforced by a test.
- **Chapter gating status.** Pratapgad, Narrai and Saraighat all have approval
  briefs in `project-docs/` and are **blocked pending human review**. Pratapgad
  needs three named approvers; only the product owner has signed. Do not build
  chapter code for any of them without the brief being signed.
- Sol's standing architectural guardrail: build a **bespoke `<XMission>`** per
  action chapter and share only proven leaf infrastructure. **Do not invent a
  JSON scene-description language** until 3+ missions reveal stable patterns.
- **Enemy roster (v0.9.0).** `src/nanda/archetypes.ts` (pure, tested) defines
  four equipment-led infantry types — sentry, javelineer, shieldbearer, archer —
  each asking a different question of the Guard verb. Equipment is sourced from
  Arrian's summary of Megasthenes (`megasthenes-fragments`); every timing and
  behaviour is labelled gameplay reconstruction (see HISTORICAL_METHOD.md).
  `guardAi.ts` gained an optional behaviour block (own guard / guard recovery /
  min range) that leaves `GUARD_PERCEPTION` and all existing callers untouched;
  `combat.ts` gained a `deflected` outcome; `arrows.ts` is a pure 16-slot
  projectile pool. Guard spawns carry an optional `archetype` in the definition
  (omitted = sentry). The shieldbearer keeps his shield up through his own
  wind-up **by design** — he cannot be out-damaged, which is what forces the
  parry to be learned. Do not "fix" that.
- **Close combat (v0.8.0): the Guard verb.** `src/nanda/combat.ts` is a pure,
  engine-agnostic module in the same family as `guardAi`/`bossAi`: parry /
  perfect parry / block / guard break, a Resolve meter, riposte windows, a
  frontal guard arc, honest melee target selection by arc, and a hit-stop
  budget. Tuning is data on the mission definition
  (`encounters.playerCombat`, optional, defaults to `COMBAT_CONFIG`). The
  runtime wiring in `NandaMission.tsx` adds hit-stop time dilation (the figures
  read a shared `timeScale` ref so skeletons freeze with the sim), a camera
  dolly punch, knockback, and a pooled 128-particle additive spark system. New
  UI: Resolve meter, combat banner, threat readout, Guard touch control,
  tutorial steps. Reduced-motion scales shake/punch down.
- **Mission-definition refactor: COMPLETE** (Sol-approved 14-gate plan, all
  gates shipped v0.7.4–v0.7.12 + gate-14 playthrough verified at desktop 1280×800
  and mobile 412×915, zero console errors). The `ActionMissionDefinition` schema
  (`src/action/missionDefinition.ts`) + Timber Gate data
  (`src/nanda/timberGateDefinition.ts`) are now the single production source of
  truth for geometry, assets, prompts, palettes, budgets, guard projection,
  objectives + collection policy, guard/boss encounter configs (fail-fast if boss
  omitted), the player's close-combat tuning, and the completion predicate
  (`evaluateExitCompletion`, truth-table tested + Sol-reviewed). Pure runtime
  helpers live in `src/action/missionRuntime.ts`; `initialHud` in
  `src/nanda/initialHud.ts`. The `useFrame` scheduler, AI state machines, and
  scene renderer were deliberately NOT data-driven (Sol's guardrail).
  **Next: the Pratapgad chapter** — consult Sol for an approved brief + ONE
  preview Sora render before spend-capped final renders.
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
   playwright-core + system Edge/Chrome against the built docs bundle. Extended
   in v0.8.0 to drive a real close-combat exchange (walk in, hold/tap Guard) and
   assert a resolved outcome plus a collision-free, overflow-free readout.
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

## Next options — needs human approval (Sol NO-GO for unattended)

The autonomous build loop was paused here after a bounded safety pass. Sol
(GPT-5.6) reviewed the two remaining roadmap items and ruled both **NO-GO for
fully unattended execution**; they need human oversight:

- **`mission-definition`** — extract Timber Gate's hardcoded config from
  `NandaMission.tsx` into a data-driven `ActionMissionDefinition`. Safe staged
  plan: (1) add the typed schema + runtime validation, unused by production;
  (2) encode Timber Gate as a parallel definition, not wired in; (3) add
  golden/characterization tests (spawn/patrol coords, sampled floor/collision,
  objective + gate eligibility, boss params + completion result, labels/assets/
  budgets); (4) **human reviews schema + fixtures**; (5) migrate one subsystem
  per green commit (assets → labels → spawns/patrols → objectives →
  terrain/collision → boss/completion); (6) final human mobile+desktop
  playthrough. Do not build a "god config" — separate topology, encounters,
  presentation, historical metadata, budgets.
- **`chapter-pratapgad`** (Shivaji hill-fort stealth chapter) — needs an
  approved evidence/claim matrix, greybox mechanics (elevation/visibility/noise/
  scouting/withdrawal), an account-comparison presentation, and **spend-capped
  paid Sora media (one preview render + human approval before final renders)**.
  Climax = detection/escape/command decision, not a health-sponge boss.

Other safe, unblocked ideas: Draco/KTX2 mesh compression, instanced palisade
posts, LOD; a dedicated Kalinga battle unit tutorial.

