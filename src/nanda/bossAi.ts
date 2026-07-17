/**
 * Boss AI brain for The Timber Gate — the Nanda Captain who holds the gate.
 *
 * Like guardAi, this module is engine-agnostic (plain 2D coordinates + scalar
 * yaw) so it can be unit-tested without three.js. The mission feeds it the
 * captain/player positions and its own health each frame and applies the
 * returned intent.
 *
 * The captain is a stationary arena boss rather than a patrolling stealth
 * guard: it stands dormant at the gate until the player comes close or strikes
 * it, then engages permanently. Its aggression escalates through three
 * health-based phases, and it alternates measured telegraphed strikes with
 * longer-range lunges that leave a brief vulnerable recovery window — the
 * player's opening to punish.
 */

import type { Vec2 } from './guardAi'

export type BossState =
  | 'dormant'
  | 'approach'
  | 'strike'
  | 'lunge'
  | 'recover'

/** 1 = measured, 2 = aggressive, 3 = desperate. */
export type BossPhase = 1 | 2 | 3

/** The captain's total health pool — a real fight, far above a guard's. */
export const BOSS_MAX_HEALTH = 240

export type BossConfig = {
  /** Distance at which a dormant captain wakes and engages. */
  engageRange: number
  /** Melee reach for a standard strike. */
  attackRange: number
  /** Reach at which a lunge connects (longer than a strike). */
  lungeRange: number
  /** Distance beyond attackRange within which the captain may start a lunge. */
  lungeStartMax: number
  /** Approach speed per phase (world units/second). */
  approachSpeed: [number, number, number]
  /** Lunge dash speed. */
  lungeSpeed: number
  /** Telegraphed wind-up before a strike lands, per phase. */
  strikeWindup: [number, number, number]
  /** Seconds between strikes/lunges, per phase. */
  attackCooldown: [number, number, number]
  /** Telegraphed wind-up before a lunge fires. */
  lungeWindup: number
  /** How long a lunge dash lasts. */
  lungeDuration: number
  /** Vulnerable recovery window after a lunge (no config per phase; fixed). */
  recoverTime: number
  /** Health fraction below which the captain enters phase 2. */
  phase2Health: number
  /** Health fraction below which the captain enters phase 3. */
  phase3Health: number
  /** Damage a landed strike deals to the player. */
  strikeDamage: number
  /** Damage a landed lunge deals to the player. */
  lungeDamage: number
}

export const BOSS_CONFIG: BossConfig = {
  engageRange: 9,
  attackRange: 1.8,
  lungeRange: 2.3,
  lungeStartMax: 5.5,
  approachSpeed: [1.7, 2.3, 2.9],
  lungeSpeed: 8.5,
  strikeWindup: [0.55, 0.42, 0.32],
  attackCooldown: [1.5, 1.1, 0.8],
  lungeWindup: 0.5,
  lungeDuration: 0.32,
  recoverTime: 1.0,
  phase2Health: 0.6,
  phase3Health: 0.3,
  strikeDamage: 15,
  lungeDamage: 22,
}

export type BossBrain = {
  id: string
  state: BossState
  phase: BossPhase
  engaged: boolean
  /** Countdown for the active wind-up/lunge/recover timer. */
  timer: number
  /** Cooldown before the next attack may begin. */
  cooldownTimer: number
  /** True while telegraphing a lunge, before the dash commits. */
  lungeCharging: boolean
  /** Direction locked in when a lunge dash starts, so it commits to a path. */
  lungeDir: Vec2 | null
  /** Number of attacks performed since engaging (drives strike/lunge cadence). */
  attackCount: number
}

export type BossWorldInput = {
  boss: Vec2
  player: Vec2
  /** Captain health as a fraction of its max (0..1). */
  healthFraction: number
  /** Set true the moment the captain takes a hit, to force engagement. */
  damaged?: boolean
}

export type BossIntent = {
  state: BossState
  phase: BossPhase
  engaged: boolean
  /** Where the captain wants to move, or null to hold position. */
  moveTarget: Vec2 | null
  /** Where the captain wants to face, or null to keep heading. */
  faceTarget: Vec2 | null
  /** Movement speed this tick. */
  speed: number
  /** True on the single tick a strike or lunge connects. */
  strike: boolean
  /** Damage the connecting hit deals (0 when not striking). */
  damage: number
  /** True while winding up a strike or lunge. */
  windup: boolean
  /** True while mid-lunge (fast dash). */
  lunging: boolean
  /** True during the post-lunge recovery — the player's opening. */
  vulnerable: boolean
}

export const createBossBrain = (id: string): BossBrain => ({
  id,
  state: 'dormant',
  phase: 1,
  engaged: false,
  timer: 0,
  cooldownTimer: 0,
  lungeCharging: false,
  lungeDir: null,
  attackCount: 0,
})

const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z)

const phaseFor = (healthFraction: number, cfg: BossConfig): BossPhase => {
  if (healthFraction <= cfg.phase3Health) {
    return 3
  }
  if (healthFraction <= cfg.phase2Health) {
    return 2
  }
  return 1
}

const idleIntent = (brain: BossBrain, face: Vec2 | null): BossIntent => ({
  state: brain.state,
  phase: brain.phase,
  engaged: brain.engaged,
  moveTarget: null,
  faceTarget: face,
  speed: 0,
  strike: false,
  damage: 0,
  windup: false,
  lunging: false,
  vulnerable: false,
})

/**
 * Advance the captain one tick and return its intent. Mutates the brain
 * (state, phase, timers, engagement, attack cadence).
 */
export const updateBossBrain = (
  brain: BossBrain,
  input: BossWorldInput,
  cfg: BossConfig = BOSS_CONFIG,
  dt: number,
): BossIntent => {
  brain.phase = phaseFor(input.healthFraction, cfg)
  brain.cooldownTimer = Math.max(0, brain.cooldownTimer - dt)
  const dist = distance(input.boss, input.player)
  const face = { x: input.player.x, z: input.player.z }
  const phaseIndex = brain.phase - 1

  // Engagement latch: wake on proximity or the first hit, then stay engaged.
  if (!brain.engaged) {
    if (input.damaged || dist <= cfg.engageRange) {
      brain.engaged = true
      brain.state = 'approach'
    } else {
      brain.state = 'dormant'
      return idleIntent(brain, dist <= cfg.engageRange * 1.6 ? face : null)
    }
  }

  // Resolve any in-progress timed action first.
  if (brain.state === 'recover') {
    brain.timer -= dt
    if (brain.timer <= 0) {
      brain.state = 'approach'
    }
    return {
      ...idleIntent(brain, face),
      state: 'recover',
      vulnerable: true,
    }
  }

  if (brain.state === 'lunge') {
    // Telegraph phase: hold and track the player before committing the dash.
    if (brain.lungeCharging) {
      brain.timer -= dt
      if (brain.timer <= 0) {
        // Lock the dash direction toward the player's telegraphed position.
        const dx = input.player.x - input.boss.x
        const dz = input.player.z - input.boss.z
        const length = Math.hypot(dx, dz) || 1
        brain.lungeDir = { x: dx / length, z: dz / length }
        brain.lungeCharging = false
        brain.timer = cfg.lungeDuration
      }
      return {
        state: 'lunge',
        phase: brain.phase,
        engaged: true,
        moveTarget: null,
        faceTarget: face,
        speed: 0,
        strike: false,
        damage: 0,
        windup: true,
        lunging: false,
        vulnerable: false,
      }
    }

    brain.timer -= dt
    const dir = brain.lungeDir ?? { x: 0, z: 0 }
    // A lunge connects if the player is within lunge reach during the dash.
    const hit = dist <= cfg.lungeRange
    if (hit || brain.timer <= 0) {
      const landed = hit
      brain.state = 'recover'
      brain.timer = cfg.recoverTime
      brain.lungeDir = null
      return {
        state: 'lunge',
        phase: brain.phase,
        engaged: true,
        moveTarget: null,
        faceTarget: face,
        speed: 0,
        strike: landed,
        damage: landed ? cfg.lungeDamage : 0,
        windup: false,
        lunging: true,
        vulnerable: false,
      }
    }
    return {
      state: 'lunge',
      phase: brain.phase,
      engaged: true,
      moveTarget: {
        x: input.boss.x + dir.x * 2,
        z: input.boss.z + dir.z * 2,
      },
      faceTarget: face,
      speed: cfg.lungeSpeed,
      strike: false,
      damage: 0,
      windup: false,
      lunging: true,
      vulnerable: false,
    }
  }

  if (brain.state === 'strike') {
    brain.timer -= dt
    if (brain.timer <= 0) {
      // The blow lands only if the player is still in reach.
      const landed = dist <= cfg.attackRange + 0.35
      brain.state = 'approach'
      brain.cooldownTimer = cfg.attackCooldown[phaseIndex]
      return {
        state: 'strike',
        phase: brain.phase,
        engaged: true,
        moveTarget: null,
        faceTarget: face,
        speed: 0,
        strike: landed,
        damage: landed ? cfg.strikeDamage : 0,
        windup: false,
        lunging: false,
        vulnerable: false,
      }
    }
    return {
      state: 'strike',
      phase: brain.phase,
      engaged: true,
      moveTarget: null,
      faceTarget: face,
      speed: 0,
      strike: false,
      damage: 0,
      windup: true,
      lunging: false,
      vulnerable: false,
    }
  }

  // Approach: decide whether to strike, lunge, or close the distance.
  if (brain.cooldownTimer <= 0) {
    if (dist <= cfg.attackRange) {
      brain.state = 'strike'
      brain.timer = cfg.strikeWindup[phaseIndex]
      brain.attackCount += 1
      return {
        state: 'strike',
        phase: brain.phase,
        engaged: true,
        moveTarget: null,
        faceTarget: face,
        speed: 0,
        strike: false,
        damage: 0,
        windup: true,
        lunging: false,
        vulnerable: false,
      }
    }
    // Lunge is a gap-closer: from phase 2 onward, when the player is at
    // mid-range (out of melee reach), the captain dashes in rather than walking.
    const canLunge =
      brain.phase >= 2 &&
      dist > cfg.attackRange &&
      dist <= cfg.lungeStartMax
    if (canLunge) {
      brain.state = 'lunge'
      brain.lungeCharging = true
      brain.timer = cfg.lungeWindup
      brain.lungeDir = null
      brain.cooldownTimer = cfg.attackCooldown[phaseIndex]
      brain.attackCount += 1
      return {
        state: 'lunge',
        phase: brain.phase,
        engaged: true,
        moveTarget: null,
        faceTarget: face,
        speed: 0,
        strike: false,
        damage: 0,
        windup: true,
        lunging: false,
        vulnerable: false,
      }
    }
  }

  // Default: walk toward the player at the current phase's pace.
  brain.state = 'approach'
  return {
    state: 'approach',
    phase: brain.phase,
    engaged: true,
    moveTarget: face,
    faceTarget: face,
    speed: cfg.approachSpeed[phaseIndex],
    strike: false,
    damage: 0,
    windup: false,
    lunging: false,
    vulnerable: false,
  }
}
