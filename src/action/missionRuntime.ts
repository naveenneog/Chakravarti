/**
 * Pure runtime projections from an ActionMissionDefinition.
 *
 * These convert immutable definition data into the plain shapes the mission
 * runtime consumes, so the projection can be unit-tested without three.js. The
 * mission component then wraps each projected guard's spawn in a THREE.Vector3.
 */

import type { ActionMissionDefinition, Vec2, Vec3 } from './missionDefinition'

export type ProjectedGuard = {
  readonly id: string
  readonly spawn: Vec3
  /** Fresh, mutable patrol waypoints (the brain accepts a mutable array). */
  readonly patrol: Vec2[]
  readonly flankSign: 1 | -1
}

/**
 * The first `count` guards, in definition order, with their ids, spawns, fresh
 * patrol copies, and flank signs. Mirrors the legacy "first N of enemyStarts"
 * selection exactly.
 */
export const projectGuards = (
  def: ActionMissionDefinition,
  count: number,
): ProjectedGuard[] =>
  def.encounters.guards.slice(0, Math.max(0, count)).map((guard) => ({
    id: guard.id,
    spawn: { x: guard.spawn.x, y: guard.spawn.y, z: guard.spawn.z },
    patrol: guard.patrol.map((point) => ({ x: point.x, z: point.z })),
    flankSign: guard.flankSign,
  }))
