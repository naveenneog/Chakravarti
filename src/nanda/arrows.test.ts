import { describe, expect, it } from 'vitest'
import {
  ARROW_GRAVITY,
  ARROW_HIT_RADIUS,
  ARROW_LIFETIME,
  ARROW_POOL,
  advanceArrow,
  arrowHits,
  arrowIsLive,
  createArrowPool,
  fireArrow,
  liveArrowCount,
  retireArrow,
} from './arrows'

const origin = { x: 0, y: 1.25, z: 0 }

describe('the arrow pool', () => {
  it('starts empty', () => {
    const pool = createArrowPool()
    expect(liveArrowCount(pool)).toBe(0)
    expect(arrowIsLive(pool, 0)).toBe(false)
  })

  it('looses an arrow toward the target at the requested speed', () => {
    const pool = createArrowPool()
    const slot = fireArrow(pool, origin, { x: 0, y: 1.25, z: 10 }, 14, 12)
    expect(arrowIsLive(pool, slot)).toBe(true)
    expect(pool.vz[slot]).toBeCloseTo(14, 4)
    expect(pool.vx[slot]).toBeCloseTo(0, 4)
    expect(pool.damage[slot]).toBe(12)
    expect(pool.life[slot]).toBeCloseTo(ARROW_LIFETIME, 5)
    expect(liveArrowCount(pool)).toBe(1)
  })

  it('normalises a diagonal shot so speed is direction-independent', () => {
    const pool = createArrowPool()
    const slot = fireArrow(pool, origin, { x: 6, y: 1.25, z: 6 }, 14, 10)
    const speed = Math.hypot(pool.vx[slot], pool.vy[slot], pool.vz[slot])
    expect(speed).toBeCloseTo(14, 4)
  })

  it('survives a zero-length shot without producing NaN', () => {
    const pool = createArrowPool()
    const slot = fireArrow(pool, origin, { ...origin }, 14, 10)
    expect(Number.isNaN(pool.vx[slot])).toBe(false)
    expect(Number.isNaN(pool.vy[slot])).toBe(false)
    expect(Number.isNaN(pool.vz[slot])).toBe(false)
  })

  it('travels forward and drops under gravity', () => {
    const pool = createArrowPool()
    const slot = fireArrow(pool, origin, { x: 0, y: 1.25, z: 10 }, 14, 10)
    advanceArrow(pool, slot, 0.1)
    expect(pool.z[slot]).toBeCloseTo(1.4, 4)
    expect(pool.vy[slot]).toBeCloseTo(-ARROW_GRAVITY * 0.1, 4)
    expect(pool.y[slot]).toBeLessThanOrEqual(1.25)
  })

  it('expires on its own after the lifetime', () => {
    const pool = createArrowPool()
    const slot = fireArrow(pool, origin, { x: 0, y: 1.25, z: 10 }, 14, 10)
    const steps = Math.ceil(ARROW_LIFETIME / 0.05) + 1
    for (let i = 0; i < steps; i += 1) {
      advanceArrow(pool, slot, 0.05)
    }
    expect(arrowIsLive(pool, slot)).toBe(false)
  })

  it('connects only inside the hit radius', () => {
    const pool = createArrowPool()
    const slot = fireArrow(pool, origin, { x: 0, y: 1.25, z: 10 }, 14, 10)
    expect(
      arrowHits(pool, slot, { x: 0, y: 1.25, z: ARROW_HIT_RADIUS - 0.05 }),
    ).toBe(true)
    expect(
      arrowHits(pool, slot, { x: 0, y: 1.25, z: ARROW_HIT_RADIUS + 0.05 }),
    ).toBe(false)
  })

  it('frees a slot when retired', () => {
    const pool = createArrowPool()
    const slot = fireArrow(pool, origin, { x: 0, y: 1.25, z: 10 }, 14, 10)
    retireArrow(pool, slot)
    expect(arrowIsLive(pool, slot)).toBe(false)
    expect(liveArrowCount(pool)).toBe(0)
  })

  it('recycles oldest-first and never exceeds the pool budget', () => {
    const pool = createArrowPool()
    for (let i = 0; i < ARROW_POOL * 3; i += 1) {
      fireArrow(pool, origin, { x: 0, y: 1.25, z: 10 }, 14, 10)
    }
    expect(liveArrowCount(pool)).toBe(ARROW_POOL)
    expect(pool.cursor).toBeGreaterThanOrEqual(0)
    expect(pool.cursor).toBeLessThan(ARROW_POOL)
  })

  it('keeps every buffer exactly pool-sized, so rendering can trust the budget', () => {
    const pool = createArrowPool()
    for (const buffer of [
      pool.x,
      pool.y,
      pool.z,
      pool.vx,
      pool.vy,
      pool.vz,
      pool.life,
      pool.damage,
    ]) {
      expect(buffer.length).toBe(ARROW_POOL)
    }
  })
})
