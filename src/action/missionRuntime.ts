/**
 * Pure runtime projections from an ActionMissionDefinition.
 *
 * These convert immutable definition data into the plain shapes the mission
 * runtime consumes, so the projection can be unit-tested without three.js. The
 * mission component then wraps each projected guard's spawn in a THREE.Vector3.
 */

import type {
  ActionMissionDefinition,
  CompletionRule,
  ExitAnchor,
  ObjectiveCollection,
  Vec2,
  Vec3,
} from './missionDefinition'

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

/**
 * Whether the player is close enough to collect an objective, using the
 * definition's `proximity-or-axis-box-v1` policy: a full 3D Euclidean distance
 * within `radius`, OR within the per-axis tolerances. Mirrors the legacy inline
 * predicate exactly (radius 1.35; axis tolerances x/z 1.2, y 1.8).
 */
export const isObjectiveInRange = (
  objective: Vec3,
  player: Vec3,
  collection: ObjectiveCollection,
): boolean => {
  const dx = objective.x - player.x
  const dy = objective.y - player.y
  const dz = objective.z - player.z
  if (Math.hypot(dx, dy, dz) <= collection.radius) {
    return true
  }
  return (
    Math.abs(dx) <= collection.axisTolerance.x &&
    Math.abs(dy) <= collection.axisTolerance.y &&
    Math.abs(dz) <= collection.axisTolerance.z
  )
}

/** A single frame's completion outcome: emit success, emit failure, or nothing. */
export type CompletionOutcome = 'success' | 'failure' | null

export type ExitCompletionInput = {
  readonly objectivesSecured: number
  readonly requiredObjectives: number
  readonly bossAlive: boolean
  readonly player: Vec2
  /** Interact pressed this frame. */
  readonly interactPressed: boolean
  /** Interact was already pressed last frame (for rising-edge detection). */
  readonly interactWasPressed: boolean
  /** Player health has reached zero this frame. */
  readonly zeroHealth: boolean
}

/**
 * Resolve a frame's mission completion for the `interact-at-exit-v1` rule,
 * reading its parameters (exit anchor position/radius, `requireBossDefeated`)
 * from the definition. Mirrors the legacy inline logic exactly:
 *
 * - Success requires a rising-edge interact press while enough objectives are
 *   secured, the boss is cleared (when required), and the player is within the
 *   exit's interaction radius (inclusive).
 * - A same-frame success suppresses a same-frame death (success wins), matching
 *   the once-only `emitResult` ordering in the runtime.
 * - Otherwise, zero health resolves to failure.
 *
 * The caller keeps the once-only `completionSent` latch, so this only decides a
 * single frame in isolation. Unsupported completion kinds fail fast rather than
 * silently never completing.
 */
export const evaluateExitCompletion = (
  rule: CompletionRule,
  exit: ExitAnchor,
  input: ExitCompletionInput,
): CompletionOutcome => {
  if (rule.kind !== 'interact-at-exit-v1') {
    throw new Error(`unsupported completion kind "${rule.kind}"`)
  }
  const risingEdge = input.interactPressed && !input.interactWasPressed
  const objectivesDone = input.objectivesSecured >= input.requiredObjectives
  const bossCleared = !rule.requireBossDefeated || !input.bossAlive
  const dx = input.player.x - exit.position.x
  const dz = input.player.z - exit.position.z
  const atExit = Math.hypot(dx, dz) <= exit.interactionRadius
  if (risingEdge && objectivesDone && bossCleared && atExit) {
    return 'success'
  }
  if (input.zeroHealth) {
    return 'failure'
  }
  return null
}
