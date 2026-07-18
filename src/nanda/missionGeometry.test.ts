import { describe, expect, it } from 'vitest'
import { floorHeightAt, isBlocked } from './missionGeometry'

// Characterization ("golden") tests: these pin the CURRENT Timber Gate geometry
// exactly so a later data-driven migration cannot silently change collision or
// terrain behaviour. If a change here is intentional, update the expected values
// deliberately.

describe('floorHeightAt (golden)', () => {
  it('is ground level (0) across the open courtyard', () => {
    expect(floorHeightAt(0, 0)).toBe(0)
    expect(floorHeightAt(0, 13.4)).toBe(0)
    expect(floorHeightAt(5, -10)).toBe(0)
    expect(floorHeightAt(9, 9)).toBe(0)
  })

  it('is roof height (2.4) on both rooftops', () => {
    // North roof: x in [-9,-6], z in [-8,-1.1]
    expect(floorHeightAt(-7.5, -4)).toBe(2.4)
    expect(floorHeightAt(-9, -8)).toBe(2.4)
    expect(floorHeightAt(-6, -1.1)).toBe(2.4)
    // South roof: x in [-9,-6], z in [1.1,8]
    expect(floorHeightAt(-7.5, 4.45)).toBe(2.4)
    expect(floorHeightAt(-9, 8)).toBe(2.4)
  })

  it('interpolates up the north ramp', () => {
    // ((-x - 3.5) / 2.5) * 2.4 over x in [-6,-3.5], z in [4,8]
    expect(floorHeightAt(-3.5, 6)).toBeCloseTo(0, 6)
    expect(floorHeightAt(-6, 6)).toBeCloseTo(2.4, 6)
    expect(floorHeightAt(-4.75, 6)).toBeCloseTo(1.2, 6)
  })

  it('does not treat near-roof-but-outside points as elevated', () => {
    expect(floorHeightAt(-5.9, -4)).toBe(0) // x just outside roof
    expect(floorHeightAt(-7.5, 0)).toBe(0) // z on the gate line, between roofs
    expect(floorHeightAt(-7.5, -1)).toBe(0) // z just inside the gate gap
  })
})

describe('isBlocked (golden)', () => {
  it('blocks everything outside the play bounds', () => {
    expect(isBlocked(-9.7, 0, 0.85, false)).toBe(true)
    expect(isBlocked(9.7, 0, 0.85, false)).toBe(true)
    expect(isBlocked(0, -15.3, 0.85, false)).toBe(true)
    expect(isBlocked(0, 15.3, 0.85, false)).toBe(true)
  })

  it('leaves the open courtyard walkable', () => {
    expect(isBlocked(0, 5, 0.85, false)).toBe(false)
    expect(isBlocked(3, -8, 0.85, false)).toBe(false)
    expect(isBlocked(-8, 10, 0.85, false)).toBe(false)
  })

  it('blocks the gate line for a grounded hero by default', () => {
    expect(isBlocked(0, 0, 0.85, false)).toBe(true)
    expect(isBlocked(3, 0.3, 0.85, false)).toBe(true)
    expect(isBlocked(-2, -0.5, 0.85, false)).toBe(true)
  })

  it('opens the side gate only when sideGateOpen and within x [5.9,8.1]', () => {
    expect(isBlocked(7, 0, 0.85, true)).toBe(false)
    expect(isBlocked(7, 0, 0.85, false)).toBe(true) // gate shut
    expect(isBlocked(5.8, 0, 0.85, true)).toBe(true) // just left of gate
    expect(isBlocked(8.2, 0, 0.85, true)).toBe(true) // just right of gate
  })

  it('always allows crossing the gate line over the roof (x [-9.2,-5.8])', () => {
    expect(isBlocked(-7, 0, 0.85, false)).toBe(false)
    expect(isBlocked(-9.2, 0, 0.85, false)).toBe(false)
    expect(isBlocked(-5.8, 0, 0.85, false)).toBe(false)
    expect(isBlocked(-5.7, 0, 0.85, false)).toBe(true) // just past the roof gap
  })

  it('lets an elevated hero (playerY >= 2.2) pass the gate line', () => {
    expect(isBlocked(0, 0, 2.2, false)).toBe(false)
    expect(isBlocked(0, 0, 2.19, false)).toBe(true)
  })
})

// Boundary/epsilon probes (Sol-required): pin the exact inclusive/strict edges
// so a data-driven migration cannot shift a threshold by an epsilon.
describe('isBlocked boundary probes (golden)', () => {
  const eps = 0.0001
  it('treats world bounds as inclusive (exactly on the edge is allowed)', () => {
    expect(isBlocked(-9.6, 5, 0.85, false)).toBe(false)
    expect(isBlocked(9.6, 5, 0.85, false)).toBe(false)
    expect(isBlocked(3, -15.2, 0.85, false)).toBe(false)
    expect(isBlocked(3, 15.2, 0.85, false)).toBe(false)
    expect(isBlocked(-9.6 - eps, 5, 0.85, false)).toBe(true)
    expect(isBlocked(9.6 + eps, 5, 0.85, false)).toBe(true)
    expect(isBlocked(3, -15.2 - eps, 0.85, false)).toBe(true)
    expect(isBlocked(3, 15.2 + eps, 0.85, false)).toBe(true)
  })

  it('uses a strict gate line: exactly +-0.62 is open, just inside is blocked', () => {
    expect(isBlocked(3, 0.62, 0.85, false)).toBe(false)
    expect(isBlocked(3, -0.62, 0.85, false)).toBe(false)
    expect(isBlocked(3, 0.62 - eps, 0.85, false)).toBe(true)
    expect(isBlocked(3, -0.62 + eps, 0.85, false)).toBe(true)
  })

  it('uses a strict elevation threshold: exactly 2.2 passes', () => {
    expect(isBlocked(3, 0, 2.2, false)).toBe(false)
    expect(isBlocked(3, 0, 2.2 - eps, false)).toBe(true)
  })

  it('side-gate opening endpoints 5.9/8.1 are inclusive', () => {
    expect(isBlocked(5.9, 0, 0.85, true)).toBe(false)
    expect(isBlocked(8.1, 0, 0.85, true)).toBe(false)
    expect(isBlocked(5.9 - eps, 0, 0.85, true)).toBe(true)
    expect(isBlocked(8.1 + eps, 0, 0.85, true)).toBe(true)
  })

  it('roof opening endpoints -9.2/-5.8 are inclusive and gate-independent', () => {
    expect(isBlocked(-9.2, 0, 0.85, false)).toBe(false)
    expect(isBlocked(-5.8, 0, 0.85, false)).toBe(false)
    expect(isBlocked(-9.2 - eps, 0, 0.85, false)).toBe(true)
    expect(isBlocked(-5.8 + eps, 0, 0.85, false)).toBe(true)
  })

  it('never lets an open side gate bypass the world bounds', () => {
    expect(isBlocked(9.7, 0, 0.85, true)).toBe(true)
  })
})

describe('floorHeightAt boundary probes (golden)', () => {
  const eps = 0.0001
  it('applies roof endpoints inclusively', () => {
    expect(floorHeightAt(-9, -8, )).toBe(2.4)
    expect(floorHeightAt(-6, -1.1)).toBe(2.4)
    expect(floorHeightAt(-6, 1.1)).toBe(2.4)
    expect(floorHeightAt(-9, 8)).toBe(2.4)
    expect(floorHeightAt(-6 + eps, -4)).toBe(0) // just past roof x
    expect(floorHeightAt(-7.5, -1.1 + eps)).toBe(0) // in the gate gap
  })

  it('gives roof precedence over the ramp where they overlap', () => {
    // x in [-6,-3.5] & z in [4,8] is the ramp, but x=-6,z=6 is also south roof.
    expect(floorHeightAt(-6, 6)).toBeCloseTo(2.4, 6)
  })

  it('applies ramp z-boundaries 4/8 inclusively', () => {
    expect(floorHeightAt(-4.75, 4)).toBeCloseTo(1.2, 6)
    expect(floorHeightAt(-4.75, 8)).toBeCloseTo(1.2, 6)
    expect(floorHeightAt(-4.75, 4 - eps)).toBe(0)
    expect(floorHeightAt(-4.75, 8 + eps)).toBe(0)
  })
})
