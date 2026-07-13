# Mauryan Rise: Design and Delivery Roadmap

## Decision

The Chandragupta Maurya campaign is a separate earlier-era chronicle, not an
extension of Ashoka's Kalinga battlefield. The campaign uses a mythic anthology
frame while keeping rulers, conflicts, and evidence inside their own period.

Two independent reviews shaped the plan:

- Historical review found strong support for the broad rise of Chandragupta,
  the Nanda-Maurya transition, a Seleucid conflict and settlement, Megasthenes
  at the Mauryan court, and a fortified Pataliputra. Exact battles, dialogue,
  troop numbers, and most policy implementation remain uncertain.
- Architecture review rejected an unbounded real-time empire simulator. It
  recommended a pure deterministic campaign domain with React UI, React Three
  Fiber presentation, a pre-resolved 3D battle vignette, and an HTML fallback.

## Historical boundaries

- Chandragupta's overthrow of the Nandas is safe as a broad historical claim.
  Exact battles, siege sequence, commanders, and troop counts are reconstruction.
- Kautilya/Chanakya is traditionally associated with Chandragupta. The extant
  Arthashastra is textually complex and may contain material compiled or
  redacted well after Chandragupta. Mechanics inspired by it are labeled as
  source-derived inspiration, not verified Mauryan administrative practice.
- Classical sources report a conflict and settlement with Seleucus I, ceded
  territory, an alliance, and 500 elephants. The exact number and terms remain
  claims in later sources; no detailed battle narrative survives.
- Megasthenes' Indica is lost and survives through later quotations. Its exact
  dimensions and gate counts for Pataliputra are source claims. Archaeology
  supports a large timber-fortified city, not a precise recoverable city plan.
- The Alexander-Chandragupta meeting and later conspiracy scenes belong under
  literary-tradition labels or are omitted.

## Version 0.3.0 vertical slice

**Working chapter:** A Season in Magadha

The player completes six seasonal turns in one low-poly 3D province:

1. Inspect Pataliputra, the river, farms, roads, army camp, and frontier.
2. Build one farm, market, barracks, or fort per season.
3. Recruit infantry, archers, cavalry, or elephants with distinct requirements
   and upkeep.
4. Debate one state problem with Chandragupta and Kautilya.
5. Review forecast resource, threat, legitimacy, and readiness effects.
6. Resolve seasonal income and army upkeep.
7. Select a formation for one pre-resolved border war.
8. Watch, pause, skip, or replay its 3D vignette.
9. Reach one of three endings based on food, legitimacy, readiness, and threat.

## Simulation contract

- The TypeScript reducer is authoritative. React, Three.js, animation, and audio
  only present state.
- Every irreversible choice is a serializable command.
- Campaign state stores schema version, content version, campaign ID, seed,
  ordered event log, resources, buildings, army, and outcome.
- Replaying the same command log from the same seed must reproduce the same state.
- Invalid, corrupt, or incompatible saves are backed up and clearly replaced
  with a new campaign rather than silently guessed into shape.
- Battle outcome is determined before animation starts. Pause, skip, fallback,
  and replay cannot change it.

## Economy contract

Initial resources are food, treasury, and legitimacy. Threat and readiness are
strategic meters.

- Farms increase seasonal food.
- Markets increase seasonal treasury.
- Barracks improve readiness and unlock advanced recruitment.
- Forts reduce threat growth and improve war defense.
- Infantry holds the center cheaply.
- Archers strengthen a screen formation.
- Cavalry creates flank advantage but costs treasury upkeep.
- Elephants provide a powerful center bonus but require food, treasury,
  legitimacy, and supporting buildings.

Food or treasury shortages do not hard-lock the campaign. They reduce readiness
and legitimacy, leaving a recovery path through future income and council choices.

## 3D and mobile performance budgets

- The 3D route is lazy-loaded; Kalinga remains independent of Three.js.
- No texture downloads are required in 0.3.0; visual identity uses geometry and
  the existing Clawpilot color variables.
- Target at least 30 FPS on a four-core, 4 GB Android device.
- Cap device pixel ratio at 1.5 and use 1.0 on reduced-quality devices.
- Strategic scene target: fewer than 80 draw calls and no more than 40 rendered
  battle soldiers.
- Static world uses demand rendering. Continuous frames run only during camera
  movement, construction feedback, or battle playback.
- No mandatory shadows or post-processing on low tier.
- The full campaign remains playable through accessible HTML controls when
  WebGL is unavailable or reduced mode is selected.

## Release acceptance criteria

- Complete a six-season run in under ten minutes.
- Three distinct endings are reachable.
- All commands and endings have headless tests.
- Every council statement and choice contains evidence type, source ID, and a
  reconstruction note.
- Building, recruitment, threat, upkeep, and war forecasts are visible before
  commitment.
- The border-war result is identical across animation, instant resolve, save,
  load, and replay.
- Music starts only after a user gesture, honors mute state, and stops or
  suspends when the app is backgrounded.
- Existing Kalinga behavior and tests remain intact.
- Pages and Android APK are rebuilt, tagged, published, and verified.

## Longer roadmap

### 0.4 - The Fall of the Nandas (delivered vertical slice)

**The Timber Gate** proves the action-strategy bridge:

- choose one intelligence, alliance, and logistics preparation;
- lock those choices into versioned mission modifiers;
- play Chandragupta in a third-person reconstructed Pataliputra district;
- move, jump, cross elevated timber routes, fight or avoid guards, recover,
  secure dispatches, and open the gate;
- return health, objectives, time, and guard outcomes to political state;
- complete the same campaign contract through an accessible command mode;
- load CC0 vegetation and a project-original Hugging Face-generated prop while
  retaining license and model provenance.

The complete multi-mission fall of the Nandas remains future work: unrest across
multiple regions, coalition loyalty, intelligence networks, ministerial
defection traditions, and a final political settlement should build on this
contract rather than expanding the one district into an unbounded action level.

#### 0.4.1 - Action First

The product launches directly into the graphical single-player Timber Gate
mission with a balanced default loadout. The War Council, anthology navigation,
evidence material, and command-mode fallback remain available but secondary.
The hero is articulated and animated, the camera is closer, and all live mission
UI is overlaid on the full-screen world.

#### 0.4.2 - Grandiose presentation foundation

Replace release-facing primitive characters with rigged CC0 animation bases and
project-original costume geometry. Add adaptive score, ambience, event-driven
effects, shadows, torch lighting, dark-theme parity, and camera impact response.
These systems become mandatory foundations for every later action chapter.

### 0.5 - The Northwest Frontier

Add a regional campaign map, roads, rivers, passes, supply, and diplomacy around
the post-Alexander northwest without inventing a single documented Taxila battle.

### 0.6 - The Elephant Peace

Add the Seleucid frontier, negotiation goals, the elephant-transfer source
claim, and Megasthenes observer cards.

### 0.7 - Tactical intervention

Prototype one optional touch-friendly tactical encounter. Strategy remains
complete without it; tactical results feed the same campaign reducer.

### 0.8 - Living Pataliputra

Add higher-detail architecture, animated citizens, roads, districts, specialist
officers, and reviewed 3D hero assets.

### 1.0 - Mauryan Rise

Ship the five-chapter Chandragupta campaign with localized narration, complete
music, accessible codex, Android and desktop packages, and cross-platform saves.
