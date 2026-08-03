# Changelog

## 0.11.0 - 2026-08-03

**The anthology is complete.** All five historical chapters on the roadmap are
now playable, and together they form a deliberate tour of *evidential
situations* — because the interesting thing about each of these campaigns turned
out to be a different problem with the record.

| Chapter | The record is… | Your verb |
| --- | --- | --- |
| The Cost of Kalinga | one-sided — the perpetrator's own inscription | fight, then read the cost |
| The Western Horizon | absent — no narrative at all, only material evidence | leave a record |
| The Brahmaputra Holds | **corroborated** — two traditions broadly agree | **choose the ground** |
| The Defiance at Narrai | **hostile** — only the invaders wrote | **trade space for cost** |
| The Hills of Pratapgad | **irreconcilable** — the accounts contradict | **arrange, never strike** |

### Added

- **Chapter III — The Brahmaputra Holds** (Lachit Borphukan, 1667–1671). The one
  chapter that can teach **corroboration**: the Assamese buranjis and the
  Mughal-side accounts broadly agree, and every season shows both side by side
  with agreement marked. The verb is *choose the ground* — raise earthworks until
  the land approach is shut, so the imperial fleet must come up the narrows where
  its weight cannot tell. The narrows are never a menu choice; they are earned by
  making every other approach impossible, and accepting battle in the open field
  throws all of it away, as it historically did at Alaboi. Three endings: the
  river holds, Guwahati falls, or the terms are accepted.

- **Chapter IV — The Defiance at Narrai** (Rani Durgavati, 1564). The chapter on
  a **hostile record**. It cannot be won and offers no counterfactual in which it
  is. Narrai is a defile between the hills and two rivers, and the player trades
  it across the two axes the defender actually controlled: the price the invasion
  pays, and how many people get out. The epilogue prints the short, self-serving
  imperial account — the only narrative that survives — beside everything the
  player did that it does not preserve. The queen's death appears once, as what
  that single source reports, and is never a mechanic.

- **Chapter V — The Hills of Pratapgad** (Shivaji, 1659). The chapter on an
  **irreconcilable record**, and the only one in which the player never fights:
  there is no strike action, no target, no enemy health and no combat resolution
  anywhere in the engine. You arrange the hills — scouting, lookouts, a concealed
  reserve, a signal chain, a road home — and the arrangement is scored on its
  *weakest* element, not its average, because a plan in broken country fails at
  its weakest link. The encounter beneath the fort is narrated neutrally and
  labelled *disputed and not depicted*; the aftermath shows the contradictory
  accounts of who struck first, whether it was premeditated, and how many were
  present, each marked **unresolved** with the reason it cannot presently be
  settled.

- A shared campaign stylesheet (`src/chapters/campaign.css`) so three chapters
  shipped together stay visually coherent without triplicating a stylesheet.

### Changed

- The Narrai, Saraighat and Pratapgad chronicle cards move from `planned` to
  `playable`, with descriptions and evidence lines rewritten to match what was
  actually built.
- `HISTORICAL_METHOD.md` gains full chapter boundaries for all three, and
  `GAME_DESIGN.md` records what each shipped chapter does.
- Pratapgad's readiness readout is rescaled against what is achievable in the
  turns available, so a fully prepared ground no longer reads as "35 out of 100".

### Approval and its limits

All three briefs (`PRATAPGAD_BRIEF.md`, `NARRAI_BRIEF.md`, `SARAIGHAT_BRIEF.md`)
now carry a sign-off block recording that **the product owner approved
construction on 2026-08-03**, that **no independent subject-specialist or
sensitivity review was obtained**, and that the owner accepted that risk. That is
recorded rather than quietly skipped.

The content red lines in each brief were treated as binding design constraints
regardless of approval, and are **enforced by unit tests** — including that
Pratapgad exposes no attack/strike/kill action, never names the opposing
commander as a target, and contains no combat state; and that Narrai never
exposes the queen's death as an action and never uses victor-side figures as
balance numbers.

### Validation

- 295 unit tests (up from 219) across 16 files, lint and type-check clean, 18/18
  browser smoke. Each new chapter has its own deterministic engine test suite
  (Saraighat 25, Narrai 26, Pratapgad 25) covering gating, thresholds, every
  ending, and replay determinism. A scripted playthrough completed **all three
  chapters end to end at 1280×900 and 412×915** — reaching "The Brahmaputra
  holds", "A price, and a people" and "The ground was ready" — with zero console
  errors and no horizontal overflow.

## 0.10.0 - 2026-08-02

### Added

- **Chapter II — The Western Horizon** (Chandragupta II and the Western
  Kshatrapas), playable from the Chronicles home screen and the header nav.

  The design brief for this chapter forbade inventing a decisive battle, because
  no securely preserved account of the western campaign survives. So the chapter
  makes that constraint the mechanic. There is nothing to win a battle with;
  instead you conduct a reign across eight seasons — march the Malwa road, seal
  the Vakataka marriage, hold the Saurashtra ports, strike silver, endow
  Udayagiri, confirm local officers, or winter the court — and the game tracks
  the **evidence trail your reign leaves**.

  - **Coinage is the scoreboard.** Western Kshatrapa silver must actually stop
    circulating and Gupta silver cut to *their* weight standard must replace it.
    Minting alone is not enough: displacement scales with market acceptance, so a
    coin nobody trusts does not travel. Meanwhile an unsupported coinage only
    decays once the province is genuinely held.
  - **Every season either leaves a durable artifact or leaves nothing.** Coins,
    inscriptions and dynastic charters survive. Marches, garrisons and quiet
    seasons are recorded as pointed **absences** — first-class entries in the
    ledger, because they are the chapter's whole argument.
  - **The ending is a historian's dossier**, not a victory screen: a coinage
    chart drawn from the player's own campaign, a count of durable artifacts
    against silent seasons, and the record split into "what survives" and "what
    did not". Winning by force alone yields *a conquest the record forgot* — a
    legitimate, instructive outcome rather than a failure state.
  - Three endings: **the west absorbed**, **a conquest the record forgot**, and
    **overreach**.

  Every action carries a citation and an evidence label. Sourced content covers
  the cessation of Kshatrapa silver with Rudrasimha III, Gupta silver in the
  Kshatrapa standard, the Udayagiri inscription of Virasena (Gupta era 82), the
  Sanchi inscription of Amrakardava (Gupta era 93), the Vakataka marriage and
  Prabhavatigupta's charters, the disputed Mehrauli "Chandra" pillar, and the
  later Vikramaditya legend — the last two explicitly flagged as *not* evidence
  for this campaign.

- **Approval briefs for the two remaining historical chapters**,
  `project-docs/NARRAI_BRIEF.md` (Rani Durgavati / Gondwana) and
  `project-docs/SARAIGHAT_BRIEF.md` (Lachit Borphukan), following the
  `PRATAPGAD_BRIEF.md` precedent: experience contract, evidence matrix with
  claim-status labels, mechanics options, renderer/cost analysis, red lines, and
  the named approvers required. Both chapters remain **blocked pending review**.

### Changed

- The Vikramaditya entry in the campaign chronicle is promoted from `research` to
  `playable`, with an accurate era range (c. 395–415 CE).
- `HISTORICAL_METHOD.md` gains full Western Horizon chapter boundaries, including
  the rule that in-game artifacts are dated to the player's reconstructed reign
  while real inscription dates live only in the source records — enforced by a
  unit test after QA caught the dossier showing two different dates for the same
  object.

### Not done, deliberately

- **Pratapgad remains blocked.** Its standing NO-GO requires three named
  approvers (product owner, Deccan-history/sensitivity reviewer, spend
  authorizer); only the product owner has signed.
- No generic scene-description language was introduced, per Sol's standing
  architectural guardrail.

### Validation

- 219 unit tests (up from 186) and 18/18 browser smoke checks. The new chapter is
  covered by 34 engine tests including every ending, resource and coinage
  clamping, action gating and once-only rules, and replay determinism. A scripted
  playthrough completed a full eight-season campaign to the dossier at both
  1280×900 and 412×915 with zero console errors and no horizontal overflow.

## 0.9.0 - 2026-07-30

### Added

- **The Nanda infantry roster.** v0.8.0 gave the player a deep verb but left
  exactly one enemy behaviour to use it on, so the loop revealed its whole depth
  in a single exchange. The garrison is now four archetypes, each asking a
  different question of the same Guard verb — and the equipment is taken from a
  source the chapter already cites (Arrian's summary of Megasthenes on Indian
  foot-soldiers) rather than invented:
  - **Sentry** — the baseline. A broad sword "wield[ed] with both hands". Read
    the wind-up, parry it.
  - **Javelineer** — "some are equipped with javelins instead of bows". Longer
    reach, a heavier and slower telegraph, and the thrust *steps in* as it lands,
    so backing out of range — the universal answer before the roster — no longer
    works. Stand and parry.
  - **Shieldbearer** — "bucklers made of undressed ox-hide, which are not so
    broad as those who carry them, but are about as long". He carries the
    player's own mechanic: a raised guard that **deflects** frontal strikes
    outright and recoils the swing. Because the buckler is long but narrow it
    covers his front and not his flanks, so the historical detail *is* the
    mechanic — go around him, or punish the window after his own blow. He keeps
    the shield up through his own wind-up, so he cannot be out-damaged and the
    parry has to be learned.
  - **Archer** — a bow "made of equal length with the man who bears it", braced
    against the ground to draw. He outranges everything, but the draw is the
    longest telegraph in the game and he gives ground when rushed. Close the
    distance, break line of sight, or time the Guard to knock the arrow down.
- **Arrows** (`src/nanda/arrows.ts`) — a pure, unit-tested projectile pool of 16
  preallocated slots with arc drop, wall and terrain collision, and no per-frame
  allocation, rendered as a single instanced mesh.
- **Bone-attached kit** so the roster reads by silhouette before it reads by
  behaviour: a tall ox-hide buckler that swings across the body when raised and
  drops away when its bearer commits, a javelin, and a man-height longbow.
- **A threat readout** naming the nearest engaged enemy, so the roster teaches
  itself in play, plus a tutorial page covering all four.
- Bow-draw/release, arrow flight and shield-rebound audio, layered and detuned
  per trigger like the rest of the combat set.

### Changed

- `resolveOutgoingStrike` gained a deflection outcome that short-circuits every
  bonus — a riposte window is **not** consumed by a swing that bounces, so being
  deflected costs tempo but never the reward you earned.
- Guard AI takes an optional archetype behaviour block (own guard, guard
  recovery, minimum range). The shipped `GUARD_PERCEPTION` and every existing
  caller are untouched, and the sentry archetype is byte-identical to it — the
  runtime now fails fast if the definition's guard config and the sentry ever
  drift apart.
- Guard spawns carry an optional `archetype` in the mission definition; omitting
  it yields a sentry, so older chapters are unaffected. Enemy health scales per
  archetype.
- The Timber Gate garrison is composed so the three always-spawned guards teach
  three different answers, with the archer held back to the fourth slot.

### Validation

- 186 unit tests (up from 146) and 18/18 browser smoke checks. A scripted
  playthrough provoked parries, perfect parries, ripostes and **deflections**,
  and confirmed the sentry, shieldbearer and archer all engage by name with zero
  console errors and no layout overflow. The archer is additionally verified
  end to end in a pure test that runs its real brain into the real arrow pool
  and asserts the shaft connects.

## 0.8.0 - 2026-07-26

### Added

- **Close combat: the Guard verb.** The guards and the captain already
  telegraphed every attack — a guard holds a 0.45s wind-up, the captain winds up
  strikes and charges lunges — but the player had no verb to answer a telegraph
  with, so retreating was the only counterplay. Chandragupta now has a single
  defensive verb, graded entirely by timing (`Q` / `Shift`, or the new Guard
  touch control):
  - **Parry** — raise the guard as the blow lands: no damage, the attacker is
    staggered, and a riposte window opens.
  - **Perfect parry** — raise it inside the leading 0.13s: longer stagger, a
    bigger riposte, and against the captain it forces the vulnerable recovery
    window that previously only followed a lunge.
  - **Block** — hold the guard early and the blow is reduced but paid for out of
    **Resolve**; empty it and the guard **breaks**, locking the verb for 1.15s.
    Turtling is not a strategy, and neither is mashing: opening a parry window
    locks the next one behind a cooldown whether it was spent, dropped, or
    expired.
  - **Arc** — a blow from outside the frontal arc lands in full, so the guards'
    existing flanking behaviour finally has teeth. While the guard is up
    Chandragupta soft-locks onto the nearest threat so a stationary parry is
    aimed at what is actually swinging.
  All of it lives in a new pure, engine-agnostic `src/nanda/combat.ts` (36 unit
  tests) alongside `guardAi`/`bossAi`, with the tuning sourced from the Timber
  Gate definition's new optional `encounters.playerCombat` block.
- **Game feel.** Impacts now carry: hit-stop (a hard slow of the mission clock
  and every character's animation, weighted so a perfect parry is the heaviest
  beat in the fight), a camera dolly punch on top of the existing shake,
  knockback, a pooled additive spark system (128 preallocated particles, no
  per-frame allocation), a parry/riposte banner, a Resolve meter, a run parry
  counter, and staggered enemies that visibly reel out of their clip.
- **Combat audio** — layered transient/body/tail synthesis for block, parry,
  perfect parry, guard break and riposte, each detuned per trigger so trading
  blows never turns into machine-gun repeats.

### Changed

- **Honest melee.** A swing used to hit the nearest living guard within 2.25
  units *regardless of facing* — including one directly behind the player. It
  now only hits what is within reach **and** inside the swing arc, and the hero
  turns onto whatever the swing actually lands on.
- The player's vulnerability bonus against a recovering captain (1.8x) moved
  into `combat.ts`, and riposte and vulnerability no longer stack — the larger
  bonus wins.
- The first-run tutorial teaches Guard, and the keyboard hint lists it.

### Fixed

- The mission's top-left readout is now one flow column, so the HUD chips can no
  longer ride up over the title panel and clip the prompt line at desktop widths
  (pre-existing; verified against the 0.7.12 build). The Resolve meter joins the
  same column instead of using fixed offsets that broke at 360px.

### Validation

- 146 unit tests (up from 104) and 18/18 browser smoke checks (up from 13/13).
  The smoke test now drives a real exchange and asserts that combat resolves on
  the guard, that the readout stacks without collisions, and that there is no
  horizontal overflow.

## 0.7.12 - 2026-07-19

### Changed

- Mission-definition migration gate 13 (Sol-reviewed, no behaviour change): the
  mission-completion decision is now a pure `evaluateExitCompletion` predicate
  (`src/action/missionRuntime.ts`) that reads its parameters from the Timber Gate
  definition — the exit anchor position/radius and the `interact-at-exit-v1`
  policy's `requireBossDefeated` flag. It resolves a single frame to
  `'success' | 'failure' | null`, narrows to the supported kind, and fails fast
  otherwise. Behaviour is preserved exactly: a rising-edge interact within the
  exit radius (inclusive) with objectives met and the boss cleared succeeds; a
  same-frame success suppresses a same-frame death; otherwise zero health fails.
  `completionSent` stays the once-only arbiter and the `useFrame` call site is
  unchanged. NandaMission fails fast at load if the completion kind is
  unsupported or its `exitAnchorId` does not resolve to the topology anchor. A
  13-case truth table was written **before** the wiring (Sol's one NO-GO for
  blind edits) and Sol reviewed the implemented diff. 104 tests + 13/13 smoke.
- Mission-definition migration **gate 14 (verification) — the 14-gate migration
  is now complete.** Ran a desktop (1280×800) and mobile (412×915) playthrough:
  the Timber Gate boots, renders the definition-driven title/prompt/HUD counts
  and the `exitActionLabel` ("Open") touch control, responds to movement + attack
  input, and reports zero console/page errors at both viewports. The
  `ActionMissionDefinition` is the single production source of truth; the
  `useFrame` scheduler, AI state machines, and scene renderer stay imperative per
  Sol's guardrail.

## 0.7.11 - 2026-07-19

### Changed

- Mission-definition migration gate 12 (Sol-approved, no behaviour change): the
  guard perception config and the entire boss encounter (id, spawn, AI config,
  max health) now come from the Timber Gate definition's `encounters` block
  instead of the `GUARD_PERCEPTION` / `BOSS_CONFIG` / `BOSS_MAX_HEALTH` AI-module
  constants. The runtime reads the mission's chosen values at every call site
  (guard brain + landed-strike range, boss brain + lunge range, health
  fractions, HUD `bossMaxHealth`) and **fails fast** if the definition ever omits
  the boss rather than silently degrading to a bossless mission. The initial HUD
  boss-health readout moved to a testable `initialHud` module sourcing both
  fields from `encounters.boss.maxHealth` (new pinning test). The AI-module
  constants remain as the driver defaults. 91 tests + 13/13 smoke green.

## 0.7.10 - 2026-07-19

### Changed

- Mission-definition migration gates 10–11 (Sol-approved, no behaviour change):
  objective positions and the collection policy now come from the Timber Gate
  definition via a pure, unit-tested `isObjectiveInRange` helper (collection
  boundaries pinned), and `engine.ts` sources `requiredObjectives` from the
  definition's `baseRequiredCount` so there is a single source of truth (asserted
  by a new engine test). Terrain/collision queries route through
  `definition.topology.geometry`, removing the direct `missionGeometry` import
  bypass. 90 tests + 13/13 smoke green.

## 0.7.9 - 2026-07-19

### Changed

- Mission-definition migration gate 9 (Sol-approved, no behaviour change): guard
  spawns, ids, patrol routes, and flank signs are now projected from the Timber
  Gate definition via a pure, unit-tested `projectGuards` helper
  (`src/action/missionRuntime.ts`) instead of the module-level `enemyStarts` /
  `patrolRoutes` constants (now deleted). The "first N guards by `enemyCount`"
  selection, ids, and alternating flank signs are pinned by a new
  characterization test (counts 3/4/6). 85 tests + 13/13 smoke green.

## 0.7.8 - 2026-07-19

### Changed

- Mission-definition migration gates 7–8 (Sol-approved, no behaviour change):
  the character palette (skin/hair + hero/guard/captain roles), the world
  colour-role → CSS-variable mapping, the Canvas DPR, and the shadow-map size now
  read from the Timber Gate definition instead of hardcoded literals. Identical
  values (pinned by golden tests); 81 tests + 13/13 smoke green.

## 0.7.7 - 2026-07-18

### Changed

- Mission-definition migration gates 5–6 (Sol-approved, no behaviour change):
  the hero/guard/boss models and tree/bush/jar props now read their paths from
  the Timber Gate definition, and the HUD prompt strings, mission title, initial
  prompt, and boss label are sourced from the definition's presentation copy
  instead of hardcoded literals. Pinned by the existing 81 golden tests; 13/13
  browser smoke.

## 0.7.6 - 2026-07-18

### Fixed

- Applied Sol's gate-4 fixture review to the (still unused) Timber Gate mission
  definition: corrected the default route label to the engine base default
  (`Unprepared courtyard approach`, not the hidden-caches plan override), added
  the global skin/hair tones and the world colour-role → CSS-variable mapping to
  the palette schema, and corrected the shadow-caster policy description.
  Strengthened the golden tests with full patrol-route, asset, presentation-copy,
  and palette equality plus roof/ramp epsilon probes (test count 76 → 81). Still
  unused by production; unblocks the subsystem wiring gates.

## 0.7.5 - 2026-07-18

### Added

- Refactor steps 2–3 toward a data-driven mission (Sol-approved): a generic,
  immutable `ActionMissionDefinition` schema + validator
  (`src/action/missionDefinition.ts`) and the complete Timber Gate encoded as a
  parallel definition (`src/nanda/timberGateDefinition.ts`), both **unused by
  production**, pinned by golden tests so the upcoming subsystem-by-subsystem
  wiring cannot silently change spawns, patrols, objectives, boss, completion,
  assets, or budgets. Strengthened the geometry golden tests with explicit
  boundary/epsilon probes. Test count 46 → 76.

## 0.7.4 - 2026-07-18

### Changed

- Refactor step 1 toward a data-driven mission (Sol-reviewed staged plan):
  extracted the pure terrain-height and collision functions (`floorHeightAt`,
  `isBlocked`) from `NandaMission.tsx` into `src/nanda/missionGeometry.ts` with
  no behaviour change, and pinned them with 10 golden/characterization tests
  (`missionGeometry.test.ts`) so the upcoming migration cannot silently alter
  collision or terrain.

## 0.7.3 - 2026-07-18

### Changed

- Compressed the Mauryan Rise intro clip to the mobile budget (4.0 MB ->
  ~0.4 MB, H.264 24 fps faststart), matching the other cinematics. No visual or
  gameplay change; poster/narration still precache and the mp4 loads on demand.

### Tests

- Extended the browser smoke (`npm run test:smoke`) to cover the Kalinga chapter
  flow — opening the battle shows the intro cinematic (with the poster fallback
  when video is blocked) and leads into the tactical board — and split the
  console-error assertion so the deliberately blocked-mp4 resource failures are
  no longer counted as regressions (13 checks).

## 0.7.2 - 2026-07-18

### Added

- Dedicated Cost of Kalinga historical debrief: after the battle, a "Historical
  debrief" screen now shows the player's specific outcome (result, restraint
  objective met or exceeded, cost of war vs target, turns) and ties it to
  Ashoka's Major Rock Edict XIII, before linking to the full codex. Previously
  the battle jumped straight to the generic codex, losing the result context.

## 0.7.1 - 2026-07-18

### Changed

- Compressed the Timber Gate story-intro clip to the mobile budget
  (5.8 MB -> ~0.7 MB, H.264 24 fps faststart), matching the Kalinga and outcome
  clips. No visual or gameplay change; the poster/narration still precache and
  the mp4 loads on demand with a poster fallback.

## 0.7.0 - 2026-07-18

### Added

- Completed the Cost of Kalinga chapter envelope: the tactical battle now opens
  with a cinematic chapter intro (the existing Sora Kalinga clip + Azure
  narration) before the board, so the chapter flows intro -> battle -> outcome ->
  historical debrief like the Timber Gate. Skippable, mute, reduced-motion
  poster-only, autoplay-fallback "Play narration", and modal focus/keyboard
  dismissal; shown on every battle start. The deterministic battle engine is
  unchanged.

### Changed

- Compressed the Kalinga intro clip to a mobile budget (5.5 MB -> ~0.5 MB);
  its poster and narration precache, the mp4 loads on demand with a poster
  fallback.

## 0.6.3 - 2026-07-18

### Changed

- Grandiose character presentation pass (no gameplay, collision, or animation
  changes): replaced the neon-theme-derived recolouring with a reviewed, human
  palette (proper skin, cloth, metal, leather tones) and distinct PBR
  roughness/metalness per material category, so the cast reads as people in
  period dress rather than toy mannequins.
- Stronger silhouette differentiation between roles: the hero is taller and
  broader, guards are smaller, and the Nanda Captain is larger with a
  bone-attached helmet and crest instead of merely being a scaled-up guard.
- Repurposed the existing fill light as a cool rim/back light for edge
  separation on characters, without adding a new light to the mobile budget.

## 0.6.2 - 2026-07-18

### Added

- Repeatable browser smoke test (`npm run test:smoke`, `tests/smoke.mjs`): boots
  the built Pages bundle in a real browser and asserts the critical path — home
  renders, the action mission mounts a WebGL canvas with touch controls, pause
  opens/closes, the War Council toggles repeatedly, and the game still boots with
  video blocked (poster fallback) — all with zero console/page errors. Uses
  `playwright-core` + a system Chromium/Edge, no heavy browser download.

## 0.6.1 - 2026-07-18

### Added

- Victory and defeat **aftermath cutscenes** for The Timber Gate, played once per
  completion before the strategic debrief and always skippable. Victory shows the
  gate opening onto the waking city at dawn; defeat shows a disciplined
  withdrawal into the night with the gate still barred (never a capture), so the
  cinematic matches the campaign's `withdrawal` outcome.
- New Sora-generated clips + Azure narration (`tooling/outcome-victory-manifest.json`,
  `tooling/outcome-defeat-manifest.json`), compressed to a mobile budget
  (victory ~0.65 MB, defeat ~0.27 MB); posters and narration are precached, the
  mp4s load on demand with a poster fallback.
- One reusable, lazy-loaded `OutcomeCutscene` with reduced-motion (poster-only),
  a persisted mute preference, an explicit "Play narration" control when mobile
  autoplay is blocked, and modal focus/keyboard dismissal.

## 0.6.0 - 2026-07-17

### Added

- Boss fight: the **Nanda Captain** now holds the northern gate. The gate only
  opens once the captain is defeated (in addition to securing the dispatches).
- Health-based boss AI (`src/nanda/bossAi.ts`, unit-tested) with three phases —
  measured, aggressive, and desperate — that escalate speed and shorten attack
  cooldowns as the captain loses health.
- Telegraphed heavy strikes and, from phase 2, longer-range lunges that leave a
  brief vulnerable recovery window; landing a hit during that window deals bonus
  damage.
- A distinct, larger captain figure with a phase-coloured ground aura, attack
  telegraph, and an on-screen boss health bar with phase readout.

## 0.5.4 - 2026-07-15

### Changed

- Mobile GPU performance pass on the 3D mission: reduced scene lights from eight
  to five (dropped the redundant ambient light; only the two front torches cast
  point lights while all four keep a brighter emissive glow).
- Trimmed the shadow pass — decorative props (trees, bushes, jars), torch poles,
  and flat ground/water planes no longer cast shadows; walls and characters
  still do.
- Removed a per-frame array allocation from the guard-separation loop.

## 0.5.3 - 2026-07-14

### Added

- Stealth-aware guard AI: each Nanda guard now patrols a route and perceives the
  player through a forward vision cone and by noise (running, landing, and
  especially attacking), instead of always tracking the player.
- Guard states — patrol, suspicious (investigate a last-known position), chase,
  attack, and retreat when badly wounded — with flanking so guards spread out.
- Telegraphed strikes: guards wind up before hitting, so retreating during the
  wind-up dodges the blow.
- On-screen alert indicators over guards (amber = suspicious, red = alerted) and
  a "Spotted" / "a guard heard something" HUD prompt so stealth is legible.
- Unit tests for perception, the state machine, wind-up timing, and flanking.

## 0.5.2 - 2026-07-14

### Added

- Cinematic story-intro (Sora-generated) that opens the first chapter, "The
  Timber Gate," with narration, skip, and mute controls, plus a poster fallback.
- First-run gameplay tutorial teaching move, jump, strike, open, and heal, with
  a "How to play" button and a "Replay story intro" option in the War Council.
- Reproducible `tooling/story-media-manifest.json` for the intro video and
  narration via the existing Azure Sora + Speech pipeline.

### Changed

- Showcase videos now fall back to their poster image if playback fails.

### Fixed

- Unity showcase capture only deletes an output directory when the path is a
  validated capture-style subfolder, never a drive or volume root.
- The Windows/Android build script now requires a real `Unity.exe` leaf file
  rather than any existing path.

## 0.5.1 - 2026-07-14

### Added

- Real Unity gameplay trailer embedded on the GitHub Pages home screen.
- Two vertical gameplay shorts covering combat and traversal.
- Original showcase soundtrack with percussion, drone, combat accents, and
  objective chimes.
- Responsive landscape and 9:16 video cards with generated poster images.
- Reproducible internal Unity frame capture and FFmpeg showcase tooling.

### Changed

- The home-page cinematic now uses current Unity gameplay instead of the earlier
  concept introduction.

## 0.5.0 - 2026-07-13

### Added

- Separate Unity 6 native action client under `unity/ChakravartiAction`.
- Reproducible Unity scene bootstrap and automated Windows/Android build entry
  points.
- Third-person character controller, smooth follow camera, jump, sword combat,
  recovery, guard pursuit, objectives, and an opening timber gate.
- Rigged CC0 FBX hero and guards with extracted Idle, Run, Jump, SwordSlash,
  Punch, RecieveHit, and Defeat clips.
- Native scene lighting, fog, shadows, torches, materials, mobile controls, HUD,
  and runtime-generated adaptive audio.
- Deterministic native runtime smoke mode that moves, attacks, captures a
  screenshot, and exits.
- MCP for Unity v10 integration and GitHub Copilot CLI `unityMCP`
  configuration.
- Unity action architecture and build documentation.

### Changed

- The Unity client is now the production destination for release-facing action
  gameplay. The web client remains the strategy, historical-content, and
  browser-prototype surface.

## 0.4.2 - 2026-07-13

### Changed

- Replaced the primitive mannequin hero and guards with rigged CC0 Quaternius
  humanoids containing authored Idle, Run, Jump, SwordSlash, RecieveHit, Punch,
  and Defeat animation clips.
- Built project-original bone-attached hero costume pieces: dhoti, torso wrap,
  shoulder cloth, belt, hair, diadem, and sword.
- Added an interactive Web Audio sound director with ambient wind and river
  texture, adaptive melodic score, percussion, footsteps, jumping, sword swing,
  impact, damage, objective, healing, gate, and defeat cues.
- Sound starts safely from the first movement, attack, or touch gesture; mute
  state is persisted and exposed in the live action HUD.
- Added cast and receive shadows, hemisphere and directional lighting, torch
  lights, a brighter horizon layer, deeper fog, and combat camera shake.
- Corrected character orientation and a Strict Mode animation-mixer cache issue
  that could blank the scene, particularly in dark theme.
- Added complete CC0 source and license provenance for the animated characters.

## 0.4.1 - 2026-07-13

### Changed

- Chakravarti now launches directly into the full-screen, single-player
  **Timber Gate** mission instead of opening on the anthology or planning UI.
- A forgiving default field plan immediately enables visible objectives,
  stronger attacks, fewer guards, extra health, and recovery supplies.
- Strategy is now optional through an in-game **War Council** and never blocks
  first play.
- The anthology header, mobile navigation, chapter header, and evidence footer
  are removed from the live action viewport.
- Mission title, health, objectives, controls, pause, War Council, and exit are
  compact overlays on the 3D world.
- Chandragupta now uses an articulated low-poly character with moving limbs,
  running motion, airborne posture, and a sword-swing animation.
- The third-person camera is lower, closer, and more responsive.
- Completed or older campaign saves start a fresh action run on launch; invalid
  prior-version saves are still backed up rather than silently discarded.

## 0.4.0 - 2026-07-13

### Added

- **The Timber Gate**, a playable action-strategy vertical slice for the Fall of
  the Nandas chapter.
- Three-part strategic planning across intelligence, alliances, and logistics;
  every choice materially changes the real-time mission.
- Mobile third-person movement, jumping, elevated traversal, close combat,
  pursuing guards, recovery supplies, dispatch objectives, pause, and restart.
- Full accessible command-mode mission that resolves through the same campaign
  reducer when WebGL is unavailable or reduced mode is selected.
- Versioned save, locked mission modifiers, sanitized action results, ordered
  event log, deterministic replay, and distinct success, costly-entry, and
  withdrawal outcomes.
- Evidence-labeled briefing and debrief separating the accepted Nanda-Maurya
  transition, Pataliputra archaeology, later literary traditions, and invented
  mission details.
- CC0 Kenney vegetation with retained license and documented provenance.
- Project-original storage-jar GLB generated locally from a Hugging Face
  TripoSR ONNX model, with reproducible concept, settings, checksum, and tooling.
- Offline PWA caching for PNG concept art and GLB game assets.

## 0.3.0 - 2026-07-12

### Added

- Separate **Mauryan Rise** campaign centered on Chandragupta Maurya and
  Kautilya without merging their period into Ashoka's Kalinga chapter.
- Mobile-first low-poly 3D Magadha province with Pataliputra, river, buildings,
  army camp, characters, guided camera, and device-quality safeguards.
- Six-season deterministic kingdom loop covering construction, resources,
  recruitment, upkeep, legitimacy, readiness, threat, and three endings.
- Six in-context council debates with evidence category, source ID, explanation,
  forecasts, and consequences visible before commitment.
- Infantry, archers, cavalry, and elephants with distinct requirements, upkeep,
  formation bonuses, and strategic roles.
- Pre-resolved 3D border-war vignette with pause, skip, and identical fallback
  outcomes.
- Versioned local saves, invalid-save backup, ordered command log, and replay
  tests.
- Full accessible HTML campaign mode for devices without WebGL.
- Original adaptive Web Audio score for world, council, battle, and aftermath.
- Azure Speech voices for Chandragupta, Kautilya, and the campaign narrator.
- Azure Sora vertical cinematic and poster for the Mauryan campaign.
- Reviewed historical and architecture roadmap with mobile performance budgets.

## 0.2.0 - 2026-07-12

### Added

- Capacitor Android application with portrait-first native packaging.
- Branded launcher icons and splash screens generated without vulnerable tooling.
- Debug-signed release APK build script and versioned APK artifact.
- Generated `docs/` production site for GitHub Pages.
- PolyForm Noncommercial 1.0.0 license.

## 0.1.0 - 2026-07-12

### Added

- Mobile-first installable React PWA for **Chakravarti: Chronicles of Bharat**.
- Playable Kalinga tactical vertical slice with deterministic rules and enemy AI.
- Terrain movement, unit roles, command-standard objective, and cost-of-war score.
- Historical codex separating recorded evidence, source claims, and reconstruction.
- Campaign roadmap for Ashoka, Chandragupta II Vikramaditya, Rani Durgavati,
  Lachit Borphukan, and Chhatrapati Shivaji Maharaj.
- Keyless Azure Speech and Sora media-generation pipeline with paid-render guard.
- Unit tests for movement, combat, victory, and enemy turns.

