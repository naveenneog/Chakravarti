import { describe, expect, it } from 'vitest'
import {
  GUARD_PERCEPTION,
  angleToTarget,
  createGuardBrain,
  playerNoiseLevel,
  updateGuardBrain,
  type GuardBrain,
  type GuardWorldInput,
} from './guardAi'

const baseInput = (
  overrides: Partial<GuardWorldInput> = {},
): GuardWorldInput => ({
  guard: { x: 0, z: 0 },
  facingYaw: 0, // facing +z
  player: { x: 0, z: 5 },
  playerNoise: 0.5,
  healthFraction: 1,
  ...overrides,
})

const advance = (
  brain: GuardBrain,
  input: GuardWorldInput,
  seconds: number,
  dt = 1 / 30,
) => {
  let last = updateGuardBrain(brain, input, GUARD_PERCEPTION, dt)
  const steps = Math.round(seconds / dt)
  for (let i = 1; i < steps; i += 1) {
    last = updateGuardBrain(brain, input, GUARD_PERCEPTION, dt)
  }
  return last
}

describe('guard perception', () => {
  it('measures the angle between facing and a target', () => {
    // Facing +z, target directly ahead => 0 radians.
    expect(angleToTarget(0, { x: 0, z: 0 }, { x: 0, z: 5 })).toBeCloseTo(0)
    // Target directly behind => pi radians.
    expect(angleToTarget(0, { x: 0, z: 0 }, { x: 0, z: -5 })).toBeCloseTo(
      Math.PI,
    )
  })

  it('detects a visible player in front and escalates to alerted', () => {
    const brain = createGuardBrain('g', { x: 0, z: 0 })
    const intent = advance(brain, baseInput({ player: { x: 0, z: 4 } }), 1)
    expect(brain.awareness).toBeGreaterThanOrEqual(
      GUARD_PERCEPTION.detectThreshold,
    )
    expect(intent.alert).toBe('alerted')
    expect(intent.state === 'chase' || intent.state === 'attack').toBe(true)
  })

  it('does not see a quiet player standing behind it', () => {
    const brain = createGuardBrain('g', { x: 0, z: 0 })
    // Player behind (negative z), barely moving => quiet, out of vision cone.
    const intent = advance(
      brain,
      baseInput({ player: { x: 0, z: -6 }, playerNoise: 0.04 }),
      1.5,
    )
    expect(brain.awareness).toBeLessThan(GUARD_PERCEPTION.suspicionThreshold)
    expect(intent.state).toBe('patrol')
    expect(intent.alert).toBe('calm')
  })

  it('hears a loud player behind it even without line of sight', () => {
    const brain = createGuardBrain('g', { x: 0, z: 0 })
    // Directly behind and close, but attacking (max noise).
    const intent = advance(
      brain,
      baseInput({ player: { x: 0, z: -2 }, playerNoise: 1 }),
      1.5,
    )
    expect(brain.awareness).toBeGreaterThan(GUARD_PERCEPTION.suspicionThreshold)
    expect(intent.alert === 'suspicious' || intent.alert === 'alerted').toBe(
      true,
    )
  })
})

describe('guard state machine', () => {
  it('returns to patrol after losing the player and investigating', () => {
    const brain = createGuardBrain('g', { x: 0, z: 0 }, [
      { x: 0, z: 0 },
      { x: 2, z: 0 },
    ])
    advance(brain, baseInput({ player: { x: 0, z: 4 } }), 1)
    expect(brain.alert).toBe('alerted')
    // Player vanishes far away and silent.
    const far = baseInput({ player: { x: 40, z: 40 }, playerNoise: 0 })
    const intent = advance(brain, far, 8)
    expect(brain.awareness).toBeLessThan(GUARD_PERCEPTION.suspicionThreshold)
    expect(brain.lastKnownPlayer).toBeNull()
    expect(intent.state).toBe('patrol')
  })

  it('telegraphs a wind-up before the strike lands', () => {
    const brain = createGuardBrain('g', { x: 0, z: 0 })
    const input = baseInput({ player: { x: 0, z: 1.2 } })
    // Alert the guard first.
    advance(brain, input, 1)
    // Collect intents until a strike fires.
    let sawWindup = false
    let strikeTick = -1
    for (let i = 0; i < 60; i += 1) {
      const intent = updateGuardBrain(brain, input, GUARD_PERCEPTION, 1 / 30)
      if (intent.windup) {
        sawWindup = true
      }
      if (intent.strike) {
        strikeTick = i
        break
      }
    }
    expect(sawWindup).toBe(true)
    expect(strikeTick).toBeGreaterThan(0)
  })

  it('retreats when badly wounded and threatened', () => {
    const brain = createGuardBrain('g', { x: 0, z: 0 })
    const input = baseInput({ player: { x: 0, z: 1.4 }, healthFraction: 0.1 })
    const intent = advance(brain, input, 1)
    expect(intent.state).toBe('retreat')
    // Moves away from the player (increasing negative z from guard origin).
    expect(intent.moveTarget?.z).toBeLessThan(0)
  })

  it('flanks from opposite sides depending on flank sign', () => {
    const left = createGuardBrain('l', { x: 0, z: 0 }, [], -1)
    const right = createGuardBrain('r', { x: 0, z: 0 }, [], 1)
    // Player ahead and to the side so a chase (not attack) is chosen.
    const input = baseInput({ guard: { x: 0, z: 0 }, player: { x: 0, z: 6 } })
    const leftIntent = advance(left, input, 1)
    const rightIntent = advance(right, input, 1)
    expect(leftIntent.state).toBe('chase')
    expect(rightIntent.state).toBe('chase')
    // Flank targets should sit on opposite sides of the player on the x axis.
    expect(Math.sign(leftIntent.moveTarget!.x)).not.toBe(
      Math.sign(rightIntent.moveTarget!.x),
    )
  })
})

describe('player noise', () => {
  it('is quiet when still and loud when attacking', () => {
    expect(
      playerNoiseLevel({
        moving: false,
        attacking: false,
        airborne: false,
        landed: false,
      }),
    ).toBeLessThan(0.1)
    expect(
      playerNoiseLevel({
        moving: true,
        attacking: true,
        airborne: false,
        landed: false,
      }),
    ).toBe(1)
    expect(
      playerNoiseLevel({
        moving: false,
        attacking: false,
        airborne: false,
        landed: true,
      }),
    ).toBeGreaterThan(0.5)
  })
})
