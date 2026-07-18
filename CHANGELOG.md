# Changelog

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
