import { describe, expect, it } from 'vitest'
import { validateMissionDefinition } from '../action/missionDefinition'
import { timberGateDefinition as def } from './timberGateDefinition'
import { GUARD_PERCEPTION } from './guardAi'
import { BOSS_CONFIG, BOSS_MAX_HEALTH } from './bossAi'
import { floorHeightAt, isBlocked } from './missionGeometry'

// Golden fixture review gate (Sol): these pin the Timber Gate definition to the
// exact values currently hardcoded across NandaMission/NandaCampaign/engine, so
// the wiring migration cannot silently change them.

describe('timberGateDefinition validity', () => {
  it('passes schema validation with no errors', () => {
    expect(validateMissionDefinition(def)).toEqual([])
  })
})

describe('timberGateDefinition golden values', () => {
  it('pins identity and topology', () => {
    expect(def.identity).toEqual({
      id: 'timber-gate',
      chapterId: 'fall-of-nandas',
      title: 'The Timber Gate',
    })
    expect(def.topology.worldBounds).toEqual({
      minX: -9.6,
      maxX: 9.6,
      minZ: -15.2,
      maxZ: 15.2,
    })
    expect(def.topology.playerSpawn).toEqual({ x: 0, y: 0.85, z: 13.4 })
    expect(def.topology.anchors.exit).toEqual({
      id: 'northern-gate',
      position: { x: 0, z: -12.4 },
      interactionRadius: 2.4,
    })
    // Geometry is referenced by function identity, not re-implemented.
    expect(def.topology.geometry.floorHeightAt).toBe(floorHeightAt)
    expect(def.topology.geometry.isBlocked).toBe(isBlocked)
  })

  it('pins six guards in order with alternating flank signs', () => {
    expect(def.encounters.guards.map((g) => g.id)).toEqual([
      'nanda-guard-1',
      'nanda-guard-2',
      'nanda-guard-3',
      'nanda-guard-4',
      'nanda-guard-5',
      'nanda-guard-6',
    ])
    expect(def.encounters.guards.map((g) => g.flankSign)).toEqual([
      1, -1, 1, -1, 1, -1,
    ])
    expect(def.encounters.guards.map((g) => g.spawn)).toEqual([
      { x: 0, y: 0, z: 6 },
      { x: 5.5, y: 0, z: 3 },
      { x: -4, y: 0, z: -3 },
      { x: 5.5, y: 0, z: -6 },
      { x: -3, y: 0, z: -10 },
      { x: 2.8, y: 0, z: -12 },
    ])
    // Full patrol-route equality so no waypoint can regress undetected.
    expect(def.encounters.guards.map((g) => g.patrol)).toEqual([
      [{ x: 0, z: 6 }, { x: 3.2, z: 8.6 }, { x: -2.6, z: 8 }],
      [{ x: 5.5, z: 3 }, { x: 7.6, z: 6.6 }, { x: 4, z: 1.4 }],
      [{ x: -4, z: -3 }, { x: -6.6, z: -1.4 }, { x: -3, z: -6 }],
      [{ x: 5.5, z: -6 }, { x: 7.6, z: -9 }, { x: 3.6, z: -4 }],
      [{ x: -3, z: -10 }, { x: -6, z: -12 }, { x: -1.6, z: -8 }],
      [{ x: 2.8, z: -12 }, { x: 5, z: -13.4 }, { x: 0.6, z: -10 }],
    ])
  })

  it('pins the guard perception driver to the shipped config', () => {
    expect(def.encounters.guardAi.driverId).toBe('guard-ai-v1')
    expect(def.encounters.guardAi.config).toBe(GUARD_PERCEPTION)
  })

  it('pins the boss to the shipped config and health', () => {
    expect(def.encounters.boss).not.toBeNull()
    expect(def.encounters.boss?.id).toBe('nanda-captain')
    expect(def.encounters.boss?.spawn).toEqual({ x: 0, y: 0, z: -9 })
    expect(def.encounters.boss?.driverId).toBe('nanda-captain-v1')
    expect(def.encounters.boss?.config).toBe(BOSS_CONFIG)
    expect(def.encounters.boss?.maxHealth).toBe(BOSS_MAX_HEALTH)
    expect(BOSS_MAX_HEALTH).toBe(240)
  })

  it('pins objectives, required count, and collection predicate', () => {
    expect(def.objectives.items).toEqual([
      { id: 'objective-1', position: { x: -7.5, y: 2.65, z: 3.4 } },
      { id: 'objective-2', position: { x: 6.4, y: 0.25, z: -5.1 } },
    ])
    expect(def.objectives.baseRequiredCount).toBe(2)
    expect(def.objectives.collection).toEqual({
      kind: 'proximity-or-axis-box-v1',
      radius: 1.35,
      axisTolerance: { x: 1.2, y: 1.8, z: 1.2 },
    })
  })

  it('requires objectives, boss defeat, and the exit interaction to complete', () => {
    expect(def.objectives.completion).toEqual({
      kind: 'interact-at-exit-v1',
      exitAnchorId: 'northern-gate',
      requireBossDefeated: true,
    })
  })

  it('pins asset paths and the reduced-mode failure policy', () => {
    expect(def.presentation.assets).toEqual({
      heroModel: './models/cc0/quaternius-characters/BaseCharacter.gltf',
      guardModel: './models/cc0/quaternius-characters/Ninja_Sand.gltf',
      bossModel: './models/cc0/quaternius-characters/Ninja_Sand.gltf',
      props: {
        tree: './models/cc0/kenney-nature/tree_oak.glb',
        bush: './models/cc0/kenney-nature/plant_bushLarge.glb',
        jar: './models/nanda/mauryan-storage-jar.glb',
      },
    })
    expect(def.presentation.assetFailurePolicy).toBe('reduced-mode')
  })

  it('pins the default route label to the engine base default (not a plan override)', () => {
    expect(def.presentation.copy.defaultRouteLabel).toBe(
      'Unprepared courtyard approach',
    )
  })

  it('pins the full presentation copy', () => {
    expect(def.presentation.copy).toEqual({
      defaultRouteLabel: 'Unprepared courtyard approach',
      initialPrompt: 'Reach the marked dispatches, then the northern gate',
      prompts: {
        spotted: 'Spotted — break line of sight or fight through',
        heard: 'A guard heard something — stay out of sight',
        atGateReady: 'Open the timber gate',
        atGateLocked: 'Secure the dispatches before opening the gate',
        noHeals: 'No recovery charges remain',
        bossEngaged: 'Fell the Nanda captain to reach the gate',
        bossVulnerable: 'The captain is off balance — strike now!',
        bossGate: 'Face the Nanda captain guarding the gate',
        default: 'Reach the marked dispatches, then the northern gate',
      },
      objectiveLabel: 'Dispatches',
      bossLabel: 'Nanda Captain',
      exitActionLabel: 'Open',
    })
  })

  it('pins the character palette including global skin and hair', () => {
    expect(def.presentation.characterPalette).toEqual({
      skin: '#b3794f',
      hair: '#231b15',
      roles: {
        hero: {
          cloth: '#8f1d33',
          clothDark: '#5d1322',
          metal: '#c9a24b',
          leather: '#5a3b24',
        },
        guard: {
          cloth: '#7a6038',
          clothDark: '#463722',
          metal: '#8a7444',
          leather: '#463020',
        },
        captain: {
          cloth: '#611427',
          clothDark: '#360c17',
          metal: '#d8b45c',
          leather: '#3d281a',
        },
      },
    })
  })

  it('pins the world colour-role -> CSS variable mapping', () => {
    expect(def.presentation.worldPalette).toEqual({
      background: '--cp-bg',
      ground: '--cp-surface',
      groundSoft: '--cp-surface-soft',
      wall: '--cp-border-strong',
      wallDark: '--cp-text-muted',
      text: '--cp-text',
      muted: '--cp-text-soft',
      accent: '--cp-accent',
      accentHover: '--cp-accent-hover',
      success: '--cp-success',
      danger: '--cp-danger',
      warning: '--cp-warning',
      water: '--cp-link',
    })
  })

  it('pins the mobile performance budgets', () => {
    expect(def.budgets).toEqual({
      dpr: [1, 1.5],
      maxTotalLights: 5,
      maxPointLights: 2,
      maxShadowCastingLights: 1,
      shadowMapSize: 1024,
      shadowCasterPolicy:
        'District non-plane meshes and characters cast; decorative GLTF props, ground/water planes, torches, markers and indicators do not',
    })
  })
})

describe('validateMissionDefinition catches problems', () => {
  it('flags an out-of-range required objective count', () => {
    const broken = {
      ...def,
      objectives: { ...def.objectives, baseRequiredCount: 9 },
    }
    expect(validateMissionDefinition(broken)).toContain(
      'baseRequiredCount must be between 0 and the number of objective items',
    )
  })

  it('flags requiring a boss defeat with no boss', () => {
    const broken = {
      ...def,
      encounters: { ...def.encounters, boss: null },
    }
    expect(validateMissionDefinition(broken)).toContain(
      'completion requires a boss but no boss is defined',
    )
  })
})
