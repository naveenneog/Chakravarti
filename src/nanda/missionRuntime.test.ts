import { describe, expect, it } from 'vitest'
import {
  evaluateExitCompletion,
  isObjectiveInRange,
  projectGuards,
  type ExitCompletionInput,
} from '../action/missionRuntime'
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

describe('isObjectiveInRange (collection boundaries)', () => {
  const collection = def.objectives.collection // radius 1.35, axis {1.2,1.8,1.2}
  const at = (x: number, y: number, z: number) => ({ x, y, z })

  it('collects exactly on the radius (inclusive), isolated from the axis box', () => {
    const origin = at(0, 0, 0)
    // dx beyond the axis limit (1.2) so only the radius test can collect it.
    expect(isObjectiveInRange(at(1.3, 0, 0), origin, collection)).toBe(true)
    // Exactly on the radius along that axis is inclusive.
    expect(isObjectiveInRange(at(1.35, 0, 0), origin, collection)).toBe(true)
    // Just past the radius and past the axis limit -> not collected.
    expect(isObjectiveInRange(at(1.35 + 1e-4, 0, 0), origin, collection)).toBe(
      false,
    )
  })

  it('counts vertical distance in the radius test', () => {
    // dx=1.3 alone is within radius; add dy so 3D distance exceeds 1.35 and the
    // axis box (dy 1.85 > 1.8) also fails.
    expect(isObjectiveInRange(at(1.3, 0, 0), at(0, 0, 0), collection)).toBe(true)
    expect(isObjectiveInRange(at(0, 1.85, 0), at(0, 0, 0), collection)).toBe(
      false,
    )
  })

  it('collects outside the radius but exactly on all axis limits', () => {
    // dx=1.2, dz=1.2, dy=1.8: 3D distance ~2.49 > radius, but on every axis edge.
    expect(isObjectiveInRange(at(1.2, 1.8, 1.2), at(0, 0, 0), collection)).toBe(
      true,
    )
  })

  it('fails when any axis limit is exceeded and outside the radius', () => {
    expect(
      isObjectiveInRange(at(1.2 + 1e-6, 1.8, 1.2), at(0, 0, 0), collection),
    ).toBe(false)
    expect(
      isObjectiveInRange(at(1.2, 1.8 + 1e-6, 1.2), at(0, 0, 0), collection),
    ).toBe(false)
    expect(
      isObjectiveInRange(at(1.2, 1.8, 1.2 + 1e-6), at(0, 0, 0), collection),
    ).toBe(false)
  })
})

// Gate 13 truth table (written BEFORE wiring, per Sol's NO-GO-for-blind-edits):
// pin every branch of the completion decision so extracting the predicate from
// NandaMission's useFrame cannot change when the mission ends in success/failure.
describe('evaluateExitCompletion (Timber Gate completion truth table)', () => {
  const rule = def.objectives.completion // interact-at-exit-v1, requireBossDefeated
  const exit = def.topology.anchors.exit // { x: 0, z: -12.4 }, radius 2.4

  // A fully-eligible rising-edge interact right on the exit.
  const base: ExitCompletionInput = {
    objectivesSecured: 2,
    requiredObjectives: 2,
    bossAlive: false,
    player: { x: 0, z: -12.4 },
    interactPressed: true,
    interactWasPressed: false,
    zeroHealth: false,
  }
  const evalWith = (patch: Partial<ExitCompletionInput>) =>
    evaluateExitCompletion(rule, exit, { ...base, ...patch })

  it('does not complete with insufficient objectives', () => {
    expect(evalWith({ objectivesSecured: 1 })).toBeNull()
  })

  it('does not complete while the boss lives (objectives met)', () => {
    expect(evalWith({ bossAlive: true })).toBeNull()
  })

  it('does not complete while the boss lives and objectives are unmet', () => {
    expect(evalWith({ bossAlive: true, objectivesSecured: 1 })).toBeNull()
  })

  it('does not complete outside the exit radius', () => {
    // distance 4.4 > 2.4
    expect(evalWith({ player: { x: 0, z: -8 } })).toBeNull()
  })

  it('completes exactly on the exit radius (inclusive)', () => {
    // Offset purely along x so the boundary distance is exactly 2.4 with no
    // floating-point drift (-12.4 + 2.4 would land at 2.4000000000000004, which
    // the legacy inline check also treats as just outside — verified below).
    expect(evalWith({ player: { x: 2.4, z: -12.4 } })).toBe('success')
  })

  it('does not complete just past the exit radius', () => {
    expect(evalWith({ player: { x: 2.4 + 1e-6, z: -12.4 } })).toBeNull()
  })

  it('does not complete when interact is not pressed', () => {
    expect(evalWith({ interactPressed: false })).toBeNull()
  })

  it('does not complete when interact is held (no rising edge)', () => {
    expect(evalWith({ interactPressed: true, interactWasPressed: true })).toBeNull()
  })

  it('completes on a valid rising-edge interact at the gate', () => {
    expect(evalWith({})).toBe('success')
  })

  it('completes with the boss alive when the rule does not require its defeat', () => {
    expect(
      evaluateExitCompletion(
        { kind: 'interact-at-exit-v1', exitAnchorId: exit.id, requireBossDefeated: false },
        exit,
        { ...base, bossAlive: true },
      ),
    ).toBe('success')
  })

  it('resolves success when a success and zero-health land on the same frame', () => {
    expect(evalWith({ zeroHealth: true })).toBe('success')
  })

  it('resolves failure on zero health without an eligible success', () => {
    expect(evalWith({ interactPressed: false, zeroHealth: true })).toBe('failure')
  })

  it('fails fast on an unsupported completion kind', () => {
    expect(() =>
      evaluateExitCompletion(
        { kind: 'chapter-policy', policyId: 'x' },
        exit,
        base,
      ),
    ).toThrow(/unsupported completion kind/)
  })
})
