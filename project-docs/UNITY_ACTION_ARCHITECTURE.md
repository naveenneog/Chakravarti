# Unity Action Architecture

> **Status (2026-07-18): FROZEN v0.5.0 prototype.** Development direction changed
> after this document was written. The **web / React-Three-Fiber client is now
> authoritative** and has advanced to v0.6.3 with guard AI, a boss fight, a Sora
> story intro, a tutorial, a mobile perf pass, and victory/defeat cutscenes —
> none of which exist in this Unity project. This client is retained as a native
> vertical-slice prototype/showcase only. Do not port web features here without
> an explicit realignment decision. See `UNITY_QA_REPORT.md`.

## Decision (original, superseded)

Chakravarti now has two clients with explicit responsibilities:

- **Unity action client:** release-facing third-person character movement,
  traversal, combat, enemies, animation, lighting, audio, VFX, mobile input,
  Windows packaging, and Android packaging.
- **React strategy client:** historical evidence, campaign simulation, council
  planning, source cards, deterministic command logs, and browser distribution.

The browser action prototype remains a reference implementation, not the visual
quality target.

## Current Unity vertical slice

`The Timber Gate` is generated from one reproducible bootstrap:

1. Import CC0 Quaternius FBX characters as legacy animation rigs.
2. Extract Idle, Run, Jump, SwordSlash, Punch, RecieveHit, and Defeat clips into
   runtime Resources.
3. Build a timber-walled Pataliputra district with roofs, ramp, houses, trees,
   torches, dispatch objectives, and a northern gate.
4. Spawn Chandragupta, four guards, third-person camera, health, melee combat,
   recovery, guard pursuit, objectives, and touch controls.
5. Generate music, ambience, footsteps, sword, impact, damage, objective,
   healing, gate, and defeat audio at runtime.
6. Build Windows and Android from editor automation methods.

## Runtime systems

| System | Responsibility |
| --- | --- |
| `WorldBootstrap` | Creates the scene, materials, lighting, actors, objectives, gate, and UI. |
| `ThirdPersonHero` | Movement, rotation, jump, attack, interaction, recovery, and player animation. |
| `ThirdPersonCamera` | Smooth follow, obstruction handling, framing, and impact shake. |
| `EnemyGuard` | Detection, pursuit, melee range, attack timing, hit reaction, and defeat. |
| `MeleeCombat` | Team-aware target selection, range/cone validation, damage, and combat audio. |
| `MissionDirector` | HUD, objective count, guard count, gate rules, recovery state, and outcomes. |
| `ProceduralAudioDirector` | Adaptive score, ambience, and event-driven effects. |
| `ProjectBootstrap` | Model import, clip extraction, scene generation, player settings, and build settings. |
| `BuildAutomation` | Deterministic Windows and Android build entry points. |

## Shared campaign contract

The next integration step is a versioned JSON contract shared by TypeScript and
C#:

- selected intelligence, alliance, and logistics plan IDs;
- mission modifiers for health, damage, movement, guards, objectives, and
  recovery;
- mission result for health remaining, guards defeated, objectives secured,
  route, elapsed time, and recovery used;
- campaign schema version, content version, seed, and ordered command log.

Unity consumes a mission contract and returns a mission result. The TypeScript
campaign reducer remains authoritative for political outcomes until it is
ported with byte-identical golden fixtures.

## Quality gates

- The Unity client is the only release-facing action renderer.
- Mobile landscape is the primary viewport. Safe areas, thumb reach, touch
  controls, Android performance, and readable camera framing are validated
  before desktop adaptations.
- No primitive mannequin is accepted as the final hero.
- Every action must have animation, sound, and visible feedback.
- Touch, keyboard, and controller input must map to the same commands.
- Windows and Android builds must be generated from editor automation.
- Historical reconstruction labels remain visible in the strategy/codex client.
