# Changelog

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
