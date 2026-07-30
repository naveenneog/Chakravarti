/**
 * Close-combat resolution for The Timber Gate.
 *
 * Like guardAi/bossAi this module is deliberately engine-agnostic: plain 2D
 * coordinates and scalar yaw, no three.js, so every branch is unit-testable.
 * The mission scene feeds it the player's guard input each frame and asks it to
 * resolve incoming and outgoing blows.
 *
 * Why it exists: the guards and the captain already *telegraph* every attack —
 * guards hold a wind-up, the captain winds up strikes and charges lunges — but
 * the player had no verb to answer a telegraph with, so retreating was the only
 * counterplay. This turns each telegraph into a question:
 *
 * - Raise the guard on time and the blow is **parried**: no damage, the attacker
 *   is staggered, and a riposte window opens.
 * - Raise it in the first sliver of the window and it is a **perfect parry**:
 *   longer stagger, bigger riposte.
 * - Hold the guard up early and the blow is **blocked**: reduced damage, paid
 *   for out of Resolve. Turtling drains Resolve to zero and the guard **breaks**.
 * - Take a blow from outside the guard's frontal arc and it lands in full, so
 *   the guards' existing flanking behaviour finally matters.
 *
 * Mashing is not a strategy: opening a parry window locks the next one behind
 * `parryCooldown`, whether the window was spent, cancelled by lowering the
 * guard, or allowed to expire.
 */

import { angleToTarget, type Vec2 } from './guardAi'

/** How an incoming blow resolved against the player's guard. */
export type GuardOutcome =
  | 'perfect-parry'
  | 'parry'
  | 'block'
  | 'guard-break'
  | 'hit'

/** Which bonus, if any, an outgoing swing carried. */
export type StrikeKind =
  | 'normal'
  | 'punish'
  | 'riposte'
  | 'perfect-riposte'
  | 'deflected'

export type CombatConfig = {
  /** Seconds a freshly raised guard can parry for. */
  parryWindow: number
  /** Leading slice of `parryWindow` that upgrades a parry to perfect. */
  perfectWindow: number
  /** Seconds before another parry window may be opened. */
  parryCooldown: number
  /** Half-angle of the frontal arc a raised guard covers, in radians. */
  guardArc: number
  /** Fraction of damage that gets through a block. */
  blockDamageFraction: number
  /** Fraction of damage that gets through the blow that breaks the guard. */
  guardBreakDamageFraction: number
  /** Damage a block of `blockResolveCost` is priced against. */
  referenceDamage: number
  /** Resolve spent blocking one `referenceDamage` blow. */
  blockResolveCost: number
  /** Extra Resolve multiplier for heavy blows (the captain's lunge). */
  heavyBlockMultiplier: number
  /** Resolve returned by a parry. */
  parryResolveGain: number
  /** Resolve regained per second with the guard down. */
  resolveRegen: number
  /** Resolve regained per second with the guard up. */
  resolveRegenGuarding: number
  /** Seconds the guard is unusable after it breaks. */
  guardBreakLockout: number
  /** Seconds an attacker is staggered by a parry / perfect parry. */
  parryStagger: number
  perfectParryStagger: number
  /** Seconds the riposte window stays open after a parry / perfect parry. */
  parryRiposte: number
  perfectParryRiposte: number
  /** Damage multiplier of a riposte / perfect riposte. */
  riposteDamageMultiplier: number
  perfectRiposteDamageMultiplier: number
  /** Damage multiplier against an attacker in its vulnerable recovery. */
  vulnerableDamageMultiplier: number
  /** Movement speed multiplier while the guard is raised. */
  guardMoveScale: number
  /** Reach of the player's swing. */
  strikeReach: number
  /** Half-angle within which a swing may acquire and turn onto a target. */
  strikeAcquireArc: number
  /** Seconds the player is locked out of attacking after a deflected swing. */
  deflectRecoil: number
}

/**
 * Tuned so a first exchange teaches the loop: a guard's 0.45s wind-up is long
 * enough to read, the 0.30s window is generous enough to hit on the first try,
 * and the 0.13s perfect slice gives skilled play somewhere to go. Blocking two
 * captain lunges empties Resolve, so the fight cannot be turtled.
 */
export const COMBAT_CONFIG: CombatConfig = {
  parryWindow: 0.3,
  perfectWindow: 0.13,
  parryCooldown: 0.45,
  guardArc: Math.PI * 0.42,
  blockDamageFraction: 0.34,
  guardBreakDamageFraction: 0.85,
  referenceDamage: 12,
  blockResolveCost: 0.26,
  heavyBlockMultiplier: 1.35,
  parryResolveGain: 0.22,
  resolveRegen: 0.34,
  resolveRegenGuarding: 0.06,
  guardBreakLockout: 1.15,
  parryStagger: 0.9,
  perfectParryStagger: 1.55,
  parryRiposte: 1.6,
  perfectParryRiposte: 2.2,
  riposteDamageMultiplier: 2.2,
  perfectRiposteDamageMultiplier: 3.2,
  vulnerableDamageMultiplier: 1.8,
  guardMoveScale: 0.45,
  strikeReach: 2.25,
  strikeAcquireArc: Math.PI * 0.58,
  deflectRecoil: 0.55,
}

export type GuardStance = {
  /** True while the guard is actually up (input held and not broken). */
  raised: boolean
  /** Seconds the guard has been continuously raised. */
  raisedFor: number
  /** Seconds left in the current parry window (0 when there is none). */
  parryFor: number
  /** Seconds until a new parry window may be opened. */
  reraiseLock: number
  /** 0..1. Blocking drains it, parries and rest restore it. */
  resolve: number
  /** Seconds of guard-break lockout remaining. */
  brokenFor: number
  /** Seconds left in the riposte window opened by a parry. */
  riposteFor: number
  /** Damage multiplier the pending riposte will apply. */
  riposteMultiplier: number
}

export const createGuardStance = (): GuardStance => ({
  raised: false,
  raisedFor: 0,
  parryFor: 0,
  reraiseLock: 0,
  resolve: 1,
  brokenFor: 0,
  riposteFor: 0,
  riposteMultiplier: 1,
})

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

/** True when `target` sits inside a frontal cone of `halfAngle` around `facingYaw`. */
export const isWithinArc = (
  facingYaw: number,
  origin: Vec2,
  target: Vec2,
  halfAngle: number,
): boolean => angleToTarget(facingYaw, origin, target) <= halfAngle

/**
 * Advance the stance one tick. Mutates it (timers, resolve, raised edge).
 *
 * The parry window opens only on the frame the guard goes up, and only when no
 * re-raise lock is running. Lowering the guard cancels an unspent window and
 * arms the lock, so tapping the button quickly is strictly worse than reading
 * the telegraph.
 */
export const updateGuardStance = (
  stance: GuardStance,
  guardHeld: boolean,
  cfg: CombatConfig = COMBAT_CONFIG,
  dt: number,
): void => {
  stance.brokenFor = Math.max(0, stance.brokenFor - dt)
  stance.reraiseLock = Math.max(0, stance.reraiseLock - dt)

  const hadWindow = stance.parryFor > 0
  stance.parryFor = Math.max(0, stance.parryFor - dt)
  if (hadWindow && stance.parryFor <= 0) {
    // An unspent window still costs the cooldown.
    stance.reraiseLock = cfg.parryCooldown
  }

  stance.riposteFor = Math.max(0, stance.riposteFor - dt)
  if (stance.riposteFor <= 0) {
    stance.riposteMultiplier = 1
  }

  const wantsGuard = guardHeld && stance.brokenFor <= 0
  if (wantsGuard && !stance.raised) {
    stance.raised = true
    stance.raisedFor = 0
    stance.parryFor = stance.reraiseLock > 0 ? 0 : cfg.parryWindow
  } else if (wantsGuard) {
    stance.raisedFor += dt
  } else {
    if (stance.raised && stance.parryFor > 0) {
      // Dropping the guard early throws the window away and arms the lock.
      stance.reraiseLock = cfg.parryCooldown
    }
    stance.raised = false
    stance.raisedFor = 0
    stance.parryFor = 0
  }

  stance.resolve = clamp01(
    stance.resolve +
      (stance.raised ? cfg.resolveRegenGuarding : cfg.resolveRegen) * dt,
  )
}

export type IncomingAttack = {
  /** Damage an unguarded player would take. */
  damage: number
  /** True when the attacker is inside the guard's frontal arc. */
  frontal: boolean
  /** Heavy blows (the captain's lunge) cost extra Resolve to block. */
  heavy?: boolean
}

export type GuardResolution = {
  outcome: GuardOutcome
  /** Damage actually dealt to the player. */
  damage: number
  /** Seconds the attacker should be staggered (0 when it should not be). */
  staggerTime: number
  /** Seconds of riposte window granted (0 when none). */
  riposteTime: number
  /** 0..1 feedback intensity for shake, hitstop and sparks. */
  impact: number
  /** Resolve remaining after the exchange. */
  resolve: number
}

/**
 * Resolve one incoming blow against the stance. Mutates the stance (resolve,
 * windows, break state).
 */
export const resolveIncomingAttack = (
  stance: GuardStance,
  attack: IncomingAttack,
  cfg: CombatConfig = COMBAT_CONFIG,
): GuardResolution => {
  const damage = Math.max(0, attack.damage)

  // Unguarded, or struck from outside the arc: it lands in full.
  if (!stance.raised || !attack.frontal) {
    return {
      outcome: 'hit',
      damage,
      staggerTime: 0,
      riposteTime: 0,
      impact: 0.62,
      resolve: stance.resolve,
    }
  }

  if (stance.parryFor > 0) {
    const perfect = stance.parryFor > cfg.parryWindow - cfg.perfectWindow
    stance.resolve = clamp01(stance.resolve + cfg.parryResolveGain)
    stance.riposteFor = perfect ? cfg.perfectParryRiposte : cfg.parryRiposte
    stance.riposteMultiplier = perfect
      ? cfg.perfectRiposteDamageMultiplier
      : cfg.riposteDamageMultiplier
    // One press answers one blow; the next parry pays the cooldown.
    stance.parryFor = 0
    stance.reraiseLock = cfg.parryCooldown
    return {
      outcome: perfect ? 'perfect-parry' : 'parry',
      damage: 0,
      staggerTime: perfect ? cfg.perfectParryStagger : cfg.parryStagger,
      riposteTime: stance.riposteFor,
      impact: perfect ? 1 : 0.78,
      resolve: stance.resolve,
    }
  }

  const cost =
    cfg.blockResolveCost *
    (damage / cfg.referenceDamage) *
    (attack.heavy ? cfg.heavyBlockMultiplier : 1)

  if (stance.resolve - cost <= 0) {
    stance.resolve = 0
    stance.brokenFor = cfg.guardBreakLockout
    stance.raised = false
    stance.raisedFor = 0
    stance.parryFor = 0
    stance.riposteFor = 0
    stance.riposteMultiplier = 1
    return {
      outcome: 'guard-break',
      damage: damage * cfg.guardBreakDamageFraction,
      staggerTime: 0,
      riposteTime: 0,
      impact: 0.9,
      resolve: 0,
    }
  }

  stance.resolve = clamp01(stance.resolve - cost)
  return {
    outcome: 'block',
    damage: damage * cfg.blockDamageFraction,
    staggerTime: 0,
    riposteTime: 0,
    impact: 0.45,
    resolve: stance.resolve,
  }
}

export type OutgoingContext = {
  /** The player's base swing damage before any bonus. */
  baseDamage: number
  /** True when the target is in a vulnerable recovery window. */
  targetVulnerable?: boolean
  /**
   * True when the target has its own shield up and the swing came from inside
   * the arc that shield covers. The blow is deflected entirely.
   */
  targetDeflects?: boolean
}

export type StrikeResolution = {
  kind: StrikeKind
  damage: number
  /** 0..1 feedback intensity. */
  impact: number
  /** True when this swing spent a riposte window. */
  consumedRiposte: boolean
  /** Seconds the player is locked out of attacking (only on a deflection). */
  recoil: number
}

/**
 * Resolve one of the player's landed swings. Mutates the stance because a
 * riposte window is spent by the swing that uses it.
 *
 * Riposte and vulnerability deliberately do **not** multiply together — the
 * larger bonus wins — so parrying the captain's lunge and then hitting it in
 * recovery stays strong without turning into a one-shot.
 *
 * A deflection short-circuits everything: no damage, no bonus consumed, and the
 * player eats a recoil. The shieldbearer answers the player with the player's
 * own mechanic, so the correct reply is footwork or patience, not more swings.
 */
export const resolveOutgoingStrike = (
  stance: GuardStance,
  context: OutgoingContext,
  cfg: CombatConfig = COMBAT_CONFIG,
): StrikeResolution => {
  if (context.targetDeflects) {
    return {
      kind: 'deflected',
      damage: 0,
      impact: 0.5,
      consumedRiposte: false,
      recoil: cfg.deflectRecoil,
    }
  }

  const riposte = stance.riposteFor > 0 ? stance.riposteMultiplier : 1
  const vulnerable = context.targetVulnerable
    ? cfg.vulnerableDamageMultiplier
    : 1
  const multiplier = Math.max(riposte, vulnerable)
  const consumedRiposte = stance.riposteFor > 0
  if (consumedRiposte) {
    stance.riposteFor = 0
    stance.riposteMultiplier = 1
  }

  let kind: StrikeKind = 'normal'
  if (riposte >= cfg.perfectRiposteDamageMultiplier) {
    kind = 'perfect-riposte'
  } else if (riposte > 1) {
    kind = 'riposte'
  } else if (vulnerable > 1) {
    kind = 'punish'
  }

  return {
    kind,
    damage: Math.max(0, context.baseDamage) * multiplier,
    impact:
      kind === 'perfect-riposte'
        ? 1
        : kind === 'riposte'
          ? 0.8
          : kind === 'punish'
            ? 0.66
            : 0.42,
    consumedRiposte,
    recoil: 0,
  }
}

export type MeleeTarget = {
  /** Index into the candidate list. */
  index: number
  distance: number
  /** Yaw the player should snap to in order to face the target. */
  yaw: number
}

/**
 * Pick the swing's target honestly: the nearest candidate that is both within
 * reach and inside the acquisition arc. Returns the yaw to turn onto, so a
 * stationary player still faces what they hit — while an enemy genuinely behind
 * the player is not hit at all.
 */
export const selectMeleeTarget = (
  facingYaw: number,
  origin: Vec2,
  candidates: readonly (Vec2 | null)[],
  cfg: CombatConfig = COMBAT_CONFIG,
  reach: number = cfg.strikeReach,
): MeleeTarget | null => {
  let best: MeleeTarget | null = null
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]
    if (!candidate) {
      continue
    }
    const dx = candidate.x - origin.x
    const dz = candidate.z - origin.z
    const distance = Math.hypot(dx, dz)
    if (distance > reach) {
      continue
    }
    if (
      distance > 1e-4 &&
      angleToTarget(facingYaw, origin, candidate) > cfg.strikeAcquireArc
    ) {
      continue
    }
    if (!best || distance < best.distance) {
      best = {
        index,
        distance,
        yaw: distance > 1e-4 ? Math.atan2(dx, dz) : facingYaw,
      }
    }
  }
  return best
}

/**
 * Seconds of hit-stop each event is worth. Hit-stop is applied as a hard slow
 * of the simulation rather than a freeze, so animation mixers and timers stay
 * coherent. Ordered so a perfect parry is the heaviest beat in the fight.
 */
export const HITSTOP: Readonly<Record<GuardOutcome | StrikeKind | 'kill', number>> = {
  hit: 0.05,
  block: 0.05,
  'guard-break': 0.13,
  parry: 0.11,
  'perfect-parry': 0.17,
  normal: 0.045,
  punish: 0.08,
  riposte: 0.1,
  'perfect-riposte': 0.15,
  deflected: 0.09,
  kill: 0.09,
}

/** How much slower the simulation runs while hit-stop is active. */
export const HITSTOP_TIME_SCALE = 0.08
