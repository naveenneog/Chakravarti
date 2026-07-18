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
    // Patrol first waypoints match each guard's post.
    expect(def.encounters.guards[0].patrol[0]).toEqual({ x: 0, z: 6 })
    expect(def.encounters.guards[5].patrol[2]).toEqual({ x: 0.6, z: -10 })
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
    expect(def.presentation.assets.heroModel).toBe(
      './models/cc0/quaternius-characters/BaseCharacter.gltf',
    )
    expect(def.presentation.assets.guardModel).toBe(
      './models/cc0/quaternius-characters/Ninja_Sand.gltf',
    )
    expect(def.presentation.assets.bossModel).toBe(
      './models/cc0/quaternius-characters/Ninja_Sand.gltf',
    )
    expect(def.presentation.assetFailurePolicy).toBe('reduced-mode')
  })

  it('pins the mobile performance budgets', () => {
    expect(def.budgets).toEqual({
      dpr: [1, 1.5],
      maxTotalLights: 5,
      maxPointLights: 2,
      maxShadowCastingLights: 1,
      shadowMapSize: 1024,
      shadowCasterPolicy:
        'walls-and-characters-cast; props, ground/water planes, and torch poles do not',
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
