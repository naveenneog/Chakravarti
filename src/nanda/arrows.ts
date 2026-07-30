/**
 * Arrows in flight for The Timber Gate.
 *
 * Pure and engine-agnostic like the rest of the mission's rules modules. The
 * pool is preallocated typed arrays so a volley costs no allocation, and the
 * mission loop owns the simulation while the renderer only reads from it.
 *
 * The archer exists because Arrian, summarising Megasthenes, describes an Indian
 * bow "made of equal length with the man who bears it" braced against the ground
 * to draw — a long, stationary, extremely readable telegraph. Everything here
 * (speed, drop, lifetime, hit radius) is gameplay reconstruction.
 */

export const ARROW_POOL = 16

/** Downward acceleration, so a long shot reads as an arc rather than a laser. */
export const ARROW_GRAVITY = 2.6

/** How close an arrow must pass to the player's centre to connect. */
export const ARROW_HIT_RADIUS = 0.62

/** Seconds an arrow survives before it is spent. */
export const ARROW_LIFETIME = 2.6

export type ArrowPool = {
  readonly x: Float32Array
  readonly y: Float32Array
  readonly z: Float32Array
  readonly vx: Float32Array
  readonly vy: Float32Array
  readonly vz: Float32Array
  readonly life: Float32Array
  readonly damage: Float32Array
  /** Next slot to reuse; the pool deliberately recycles oldest-first. */
  cursor: number
}

export const createArrowPool = (): ArrowPool => ({
  x: new Float32Array(ARROW_POOL),
  y: new Float32Array(ARROW_POOL),
  z: new Float32Array(ARROW_POOL),
  vx: new Float32Array(ARROW_POOL),
  vy: new Float32Array(ARROW_POOL),
  vz: new Float32Array(ARROW_POOL),
  life: new Float32Array(ARROW_POOL),
  damage: new Float32Array(ARROW_POOL),
  cursor: 0,
})

export type Point3 = { x: number; y: number; z: number }

/**
 * Loose one arrow from `from` toward `to`. Returns the slot used. Mutates the
 * pool; allocates nothing.
 */
export const fireArrow = (
  pool: ArrowPool,
  from: Point3,
  to: Point3,
  speed: number,
  damage: number,
): number => {
  const slot = pool.cursor
  pool.cursor = (pool.cursor + 1) % ARROW_POOL
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dz = to.z - from.z
  const length = Math.hypot(dx, dy, dz) || 1
  pool.x[slot] = from.x
  pool.y[slot] = from.y
  pool.z[slot] = from.z
  pool.vx[slot] = (dx / length) * speed
  pool.vy[slot] = (dy / length) * speed
  pool.vz[slot] = (dz / length) * speed
  pool.damage[slot] = damage
  pool.life[slot] = ARROW_LIFETIME
  return slot
}

/** Advance one live arrow by `dt`. Mutates the pool. */
export const advanceArrow = (
  pool: ArrowPool,
  slot: number,
  dt: number,
): void => {
  pool.life[slot] -= dt
  pool.x[slot] += pool.vx[slot] * dt
  pool.y[slot] += pool.vy[slot] * dt
  pool.z[slot] += pool.vz[slot] * dt
  pool.vy[slot] -= ARROW_GRAVITY * dt
}

/** Retire an arrow's slot. */
export const retireArrow = (pool: ArrowPool, slot: number): void => {
  pool.life[slot] = 0
}

export const arrowIsLive = (pool: ArrowPool, slot: number): boolean =>
  pool.life[slot] > 0

/** True when the arrow at `slot` is close enough to `target` to connect. */
export const arrowHits = (
  pool: ArrowPool,
  slot: number,
  target: Point3,
  radius: number = ARROW_HIT_RADIUS,
): boolean =>
  Math.hypot(
    pool.x[slot] - target.x,
    pool.y[slot] - target.y,
    pool.z[slot] - target.z,
  ) <= radius

/** How many arrows are currently in the air. */
export const liveArrowCount = (pool: ArrowPool): number => {
  let count = 0
  for (let i = 0; i < ARROW_POOL; i += 1) {
    if (pool.life[i] > 0) {
      count += 1
    }
  }
  return count
}
