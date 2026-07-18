import { describe, expect, it } from 'vitest'
import { projectGuards } from '../action/missionRuntime'
import { timberGateDefinition as def } from './timberGateDefinition'

// Gate 9 characterization: pin the runtime guard projection against the legacy
// "first N of enemyStarts" behaviour so wiring the mission init to the definition
// cannot change guard identities, order, spawns, patrols, or flank signs.

describe('projectGuards', () => {
  it('selects the first N guards in order for counts 3, 4, and 6', () => {
    expect(projectGuards(def, 3).map((g) => g.id)).toEqual([
      'nanda-guard-1',
      'nanda-guard-2',
      'nanda-guard-3',
    ])
    expect(projectGuards(def, 4).map((g) => g.id)).toEqual([
      'nanda-guard-1',
      'nanda-guard-2',
      'nanda-guard-3',
      'nanda-guard-4',
    ])
    expect(projectGuards(def, 6).map((g) => g.id)).toEqual([
      'nanda-guard-1',
      'nanda-guard-2',
      'nanda-guard-3',
      'nanda-guard-4',
      'nanda-guard-5',
      'nanda-guard-6',
    ])
  })

  it('projects exact spawns and alternating flank signs', () => {
    const guards = projectGuards(def, 6)
    expect(guards.map((g) => g.spawn)).toEqual([
      { x: 0, y: 0, z: 6 },
      { x: 5.5, y: 0, z: 3 },
      { x: -4, y: 0, z: -3 },
      { x: 5.5, y: 0, z: -6 },
      { x: -3, y: 0, z: -10 },
      { x: 2.8, y: 0, z: -12 },
    ])
    expect(guards.map((g) => g.flankSign)).toEqual([1, -1, 1, -1, 1, -1])
  })

  it('projects exact patrol routes as fresh mutable copies', () => {
    const guards = projectGuards(def, 6)
    expect(guards.map((g) => g.patrol)).toEqual([
      [{ x: 0, z: 6 }, { x: 3.2, z: 8.6 }, { x: -2.6, z: 8 }],
      [{ x: 5.5, z: 3 }, { x: 7.6, z: 6.6 }, { x: 4, z: 1.4 }],
      [{ x: -4, z: -3 }, { x: -6.6, z: -1.4 }, { x: -3, z: -6 }],
      [{ x: 5.5, z: -6 }, { x: 7.6, z: -9 }, { x: 3.6, z: -4 }],
      [{ x: -3, z: -10 }, { x: -6, z: -12 }, { x: -1.6, z: -8 }],
      [{ x: 2.8, z: -12 }, { x: 5, z: -13.4 }, { x: 0.6, z: -10 }],
    ])
    // Fresh copies: the projected patrol is a distinct array and objects from
    // the definition's, so the brain can hold a mutable copy safely.
    expect(guards[0].patrol).not.toBe(def.encounters.guards[0].patrol)
    expect(guards[0].patrol[0]).not.toBe(def.encounters.guards[0].patrol[0])
  })

  it('clamps a negative or zero count to an empty list', () => {
    expect(projectGuards(def, 0)).toEqual([])
    expect(projectGuards(def, -2)).toEqual([])
  })
})
