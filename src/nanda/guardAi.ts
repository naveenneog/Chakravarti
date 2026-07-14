/**
 * Guard AI brain for The Timber Gate.
 *
 * This module is deliberately engine-agnostic: it works on plain 2D coordinates
 * and scalar yaw so it can be unit-tested without three.js. The mission scene
 * feeds it guard/player positions each frame and applies the returned intent.
 *
 * Behaviour: guards patrol a route, notice the player through a forward vision
 * cone or by hearing noise (running, landing, and especially attacking), grow
 * suspicious, investigate a last-known position, chase with flanking so they do
 * not clump, telegraph a wind-up before striking, and retreat when badly hurt.
 */

export type Vec2 = { x: number; z: number }

export type GuardState =
  | 'patrol'
  | 'suspicious'
  | 'chase'
  | 'attack'
  | 'retreat'

export type GuardAlert = 'calm' | 'suspicious' | 'alerted'

export type GuardPerception = {
  /** How far the forward vision cone reaches. */
  visionRange: number
  /** Half of the field-of-view, in radians. */
  visionHalfAngle: number
  /** Omnidirectional hearing radius at zero player noise. */
  hearingRange: number
  /** How much louder a fully-noisy player is heard (multiplier at noise = 1). */
  hearingNoiseBoost: number
  /** Awareness gained per second while the player is seen. */
  awarenessGainSeen: number
  /** Awareness gained per second while the player is only heard. */
  awarenessGainHeard: number
  /** Awareness lost per second with no perception. */
  awarenessDecay: number
  /** Awareness at or above which the guard is fully alerted. */
  detectThreshold: number
  /** Awareness at or above which the guard becomes suspicious. */
  suspicionThreshold: number
  /** Distance at which the guard can land a strike. */
  attackRange: number
  /** Seconds of telegraphed wind-up before a strike lands. */
  windupTime: number
  /** Seconds between strikes. */
  attackCooldown: number
  /** Guard health fraction at or below which it retreats. */
  retreatHealthFraction: number
  /** Seconds a guard investigates a last-known position before giving up. */
  investigateTime: number
  /** Patrol / investigate movement speed (world units per second). */
  patrolSpeed: number
  /** Chase movement speed (world units per second). */
  chaseSpeed: number
  /** Lateral offset used to flank the player during a chase. */
  flankOffset: number
}

export const GUARD_PERCEPTION: GuardPerception = {
  visionRange: 7.6,
  visionHalfAngle: Math.PI * 0.4,
  hearingRange: 2.0,
  hearingNoiseBoost: 2.6,
  awarenessGainSeen: 2.4,
  awarenessGainHeard: 1.1,
  awarenessDecay: 0.5,
  detectThreshold: 0.85,
  suspicionThreshold: 0.32,
  attackRange: 1.55,
  windupTime: 0.45,
  attackCooldown: 1.05,
  retreatHealthFraction: 0.26,
  investigateTime: 3.2,
  patrolSpeed: 0.95,
  chaseSpeed: 2.2,
  flankOffset: 1.7,
}

export type GuardBrain = {
  id: string
  state: GuardState
  alert: GuardAlert
  awareness: number
  lastKnownPlayer: Vec2 | null
  patrol: Vec2[]
  patrolIndex: number
  investigateTimer: number
  windupTimer: number
  cooldownTimer: number
  flankSign: 1 | -1
}

export type GuardWorldInput = {
  guard: Vec2
  /** Guard facing yaw, using the atan2(forwardX, forwardZ) convention. */
  facingYaw: number
  player: Vec2
  /** 0 (still/sneaking) .. 1 (running + attacking). */
  playerNoise: number
  /** Guard health as a fraction of its max (0..1). */
  healthFraction: number
  /** Set false when a wall blocks the sightline. Defaults to true. */
  hasLineOfSight?: boolean
}

export type GuardIntent = {
  state: GuardState
  alert: GuardAlert
  awareness: number
  /** Where the guard wants to move, or null to hold position. */
  moveTarget: Vec2 | null
  /** Where the guard wants to look, or null to keep its heading. */
  faceTarget: Vec2 | null
  /** Movement speed for this tick (world units per second). */
  speed: number
  /** True on the single tick a telegraphed strike lands. */
  strike: boolean
  /** True while the guard is winding up a strike. */
  windup: boolean
  /** True when the guard perceives the player this tick. */
  senses: boolean
}

export const createGuardBrain = (
  id: string,
  start: Vec2,
  patrol: Vec2[] = [],
  flankSign: 1 | -1 = 1,
): GuardBrain => ({
  id,
  state: 'patrol',
  alert: 'calm',
  awareness: 0,
  lastKnownPlayer: null,
  patrol: patrol.length > 0 ? patrol : [{ x: start.x, z: start.z }],
  patrolIndex: 0,
  investigateTimer: 0,
  windupTimer: 0,
  cooldownTimer: 0,
  flankSign,
})

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z)

/** Angle between the guard's forward vector and the direction to a point. */
export const angleToTarget = (
  facingYaw: number,
  from: Vec2,
  to: Vec2,
): number => {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const length = Math.hypot(dx, dz)
  if (length < 1e-5) {
    return 0
  }
  const forwardX = Math.sin(facingYaw)
  const forwardZ = Math.cos(facingYaw)
  const dot = clamp((dx * forwardX + dz * forwardZ) / length, -1, 1)
  return Math.acos(dot)
}

export type Perception = { canSee: boolean; canHear: boolean }

/** Update awareness/last-known from perception. Mutates the brain. */
export const perceive = (
  brain: GuardBrain,
  input: GuardWorldInput,
  cfg: GuardPerception,
  dt: number,
): Perception => {
  const dist = distance(input.guard, input.player)
  const hasLos = input.hasLineOfSight !== false
  const canSee =
    hasLos &&
    dist <= cfg.visionRange &&
    angleToTarget(input.facingYaw, input.guard, input.player) <=
      cfg.visionHalfAngle
  const hearingRadius =
    cfg.hearingRange * (1 + input.playerNoise * cfg.hearingNoiseBoost)
  const canHear = dist <= hearingRadius

  if (canSee) {
    const proximity = 1 + (1 - clamp(dist / cfg.visionRange, 0, 1)) * 0.8
    brain.awareness += cfg.awarenessGainSeen * proximity * dt
    brain.lastKnownPlayer = { x: input.player.x, z: input.player.z }
  } else if (canHear) {
    brain.awareness += cfg.awarenessGainHeard * dt
    brain.lastKnownPlayer = { x: input.player.x, z: input.player.z }
  } else {
    brain.awareness -= cfg.awarenessDecay * dt
  }
  brain.awareness = clamp(brain.awareness, 0, 1)

  return { canSee, canHear }
}

const flankTarget = (
  brain: GuardBrain,
  guard: Vec2,
  player: Vec2,
  cfg: GuardPerception,
): Vec2 => {
  const dx = player.x - guard.x
  const dz = player.z - guard.z
  const length = Math.hypot(dx, dz) || 1
  const dist = length
  // Perpendicular to the line to the player; fades out as the guard closes in
  // so multiple guards spread wide, then converge to strike.
  const perpX = -dz / length
  const perpZ = dx / length
  const spread = clamp((dist - cfg.attackRange) / cfg.visionRange, 0, 1)
  return {
    x: player.x + perpX * cfg.flankOffset * brain.flankSign * spread,
    z: player.z + perpZ * cfg.flankOffset * brain.flankSign * spread,
  }
}

const idle = (
  brain: GuardBrain,
  faceTarget: Vec2 | null,
): GuardIntent => ({
  state: brain.state,
  alert: brain.alert,
  awareness: brain.awareness,
  moveTarget: null,
  faceTarget,
  speed: 0,
  strike: false,
  windup: false,
  senses: false,
})

/**
 * Advance the brain one tick and return the movement/combat intent. Mutates the
 * brain (state, timers, awareness, patrol progress).
 */
export const updateGuardBrain = (
  brain: GuardBrain,
  input: GuardWorldInput,
  cfg: GuardPerception = GUARD_PERCEPTION,
  dt: number,
): GuardIntent => {
  brain.cooldownTimer = Math.max(0, brain.cooldownTimer - dt)

  const { canSee, canHear } = perceive(brain, input, cfg, dt)
  const senses = canSee || canHear
  const dist = distance(input.guard, input.player)

  // Resolve the alert label from awareness and any active investigation.
  if (brain.awareness >= cfg.detectThreshold) {
    brain.alert = 'alerted'
  } else if (
    brain.awareness >= cfg.suspicionThreshold ||
    brain.investigateTimer > 0
  ) {
    brain.alert = 'suspicious'
  } else {
    brain.alert = 'calm'
  }

  // Retreat overrides everything while badly wounded and threatened.
  if (
    input.healthFraction <= cfg.retreatHealthFraction &&
    brain.awareness >= cfg.suspicionThreshold
  ) {
    brain.state = 'retreat'
    brain.windupTimer = 0
    const dx = input.guard.x - input.player.x
    const dz = input.guard.z - input.player.z
    const length = Math.hypot(dx, dz) || 1
    return {
      state: 'retreat',
      alert: brain.alert,
      awareness: brain.awareness,
      moveTarget: {
        x: input.guard.x + (dx / length) * 4,
        z: input.guard.z + (dz / length) * 4,
      },
      faceTarget: { x: input.player.x, z: input.player.z },
      speed: cfg.chaseSpeed * 0.85,
      strike: false,
      windup: false,
      senses,
    }
  }

  // Confirmed detection: chase or attack.
  if (brain.awareness >= cfg.detectThreshold) {
    brain.investigateTimer = cfg.investigateTime

    if (dist <= cfg.attackRange) {
      // Telegraphed strike: hold, wind up, then land damage on completion.
      brain.state = 'attack'
      const face = { x: input.player.x, z: input.player.z }
      if (brain.windupTimer > 0) {
        brain.windupTimer = Math.max(0, brain.windupTimer - dt)
        if (brain.windupTimer <= 0) {
          brain.cooldownTimer = cfg.attackCooldown
          return {
            state: 'attack',
            alert: brain.alert,
            awareness: brain.awareness,
            moveTarget: null,
            faceTarget: face,
            speed: 0,
            strike: true,
            windup: false,
            senses,
          }
        }
        return {
          state: 'attack',
          alert: brain.alert,
          awareness: brain.awareness,
          moveTarget: null,
          faceTarget: face,
          speed: 0,
          strike: false,
          windup: true,
          senses,
        }
      }
      if (brain.cooldownTimer <= 0) {
        brain.windupTimer = cfg.windupTime
      }
      return {
        state: 'attack',
        alert: brain.alert,
        awareness: brain.awareness,
        moveTarget: null,
        faceTarget: face,
        speed: 0,
        strike: false,
        windup: brain.windupTimer > 0,
        senses,
      }
    }

    brain.state = 'chase'
    brain.windupTimer = 0
    return {
      state: 'chase',
      alert: brain.alert,
      awareness: brain.awareness,
      moveTarget:
        dist <= cfg.attackRange + 0.6
          ? { x: input.player.x, z: input.player.z }
          : flankTarget(brain, input.guard, input.player, cfg),
      faceTarget: { x: input.player.x, z: input.player.z },
      speed: cfg.chaseSpeed,
      strike: false,
      windup: false,
      senses,
    }
  }

  // Suspicious: investigate the last-known position.
  if (
    brain.lastKnownPlayer &&
    (brain.awareness >= cfg.suspicionThreshold || brain.investigateTimer > 0)
  ) {
    brain.state = 'suspicious'
    brain.windupTimer = 0
    brain.investigateTimer = Math.max(0, brain.investigateTimer - dt)
    const target = brain.lastKnownPlayer
    if (distance(input.guard, target) <= 0.6) {
      // Arrived at the last-known spot; look around, then give up.
      if (brain.investigateTimer <= 0) {
        brain.lastKnownPlayer = null
        brain.state = 'patrol'
      }
      return idle(brain, target)
    }
    return {
      state: 'suspicious',
      alert: brain.alert,
      awareness: brain.awareness,
      moveTarget: { x: target.x, z: target.z },
      faceTarget: { x: target.x, z: target.z },
      speed: cfg.patrolSpeed * 1.35,
      strike: false,
      windup: false,
      senses,
    }
  }

  // Patrol: walk the route.
  brain.state = 'patrol'
  brain.windupTimer = 0
  brain.investigateTimer = 0
  brain.lastKnownPlayer = null
  const waypoint = brain.patrol[brain.patrolIndex] ?? brain.patrol[0]
  if (!waypoint) {
    return idle(brain, null)
  }
  if (distance(input.guard, waypoint) <= 0.6) {
    brain.patrolIndex = (brain.patrolIndex + 1) % brain.patrol.length
  }
  if (brain.patrol.length <= 1) {
    return idle(brain, waypoint)
  }
  return {
    state: 'patrol',
    alert: brain.alert,
    awareness: brain.awareness,
    moveTarget: { x: waypoint.x, z: waypoint.z },
    faceTarget: { x: waypoint.x, z: waypoint.z },
    speed: cfg.patrolSpeed,
    strike: false,
    windup: false,
    senses,
  }
}

/** Estimate how loud the player is this frame (0 still .. 1 running + fighting). */
export const playerNoiseLevel = (motion: {
  moving: boolean
  attacking: boolean
  airborne: boolean
  landed: boolean
}): number => {
  let noise = motion.moving ? 0.5 : 0.04
  if (motion.airborne) {
    noise = Math.max(noise, 0.35)
  }
  if (motion.landed) {
    noise = Math.max(noise, 0.85)
  }
  if (motion.attacking) {
    noise = 1
  }
  return noise
}
