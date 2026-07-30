/**
 * Nanda infantry archetypes for The Timber Gate.
 *
 * Pure data + a behaviour descriptor per archetype, engine-agnostic like
 * guardAi/bossAi/combat so every rule is unit-testable without three.js.
 *
 * Why these four: the equipment comes from the chapter's already-cited source,
 * Arrian's summary of Megasthenes on Indian foot-soldiers (`megasthenes-fragments`,
 * Indica Cap. XVI) — a bow "made of equal length with the man who bears it" that
 * is braced against the ground to draw, "bucklers made of undressed ox-hide,
 * which are not so broad as those who carry them, but are about as long", "some
 * are equipped with javelins instead of bows", and a broad sword that "when they
 * engage in close fight ... they wield with both hands, to fetch down a lustier
 * blow".
 *
 * Each archetype then asks a different question of the player's single Guard
 * verb, and in the shieldbearer's case the source detail *is* the mechanic: a
 * buckler that is long but explicitly **not broad** covers its bearer's front
 * and not his flanks, so flanking is the answer.
 *
 * Evidence labelling follows project-docs/HISTORICAL_METHOD.md: the equipment is
 * a **claim in a source**, applying it to Nanda-era gate guards is a **scholarly
 * inference** (Megasthenes described the Mauryan army a little later), and every
 * timing, range and behaviour below is **gameplay reconstruction**.
 */

import { GUARD_PERCEPTION, type GuardPerception } from './guardAi'

export type GuardArchetypeId =
  | 'sentry'
  | 'javelineer'
  | 'shieldbearer'
  | 'archer'

/** How an archetype fights, beyond the shared perception/timing numbers. */
export type ArchetypeBehaviour = {
  /**
   * The archetype carries its own guard. While raised, the player's frontal
   * strikes are deflected — it has to be flanked or punished in recovery.
   */
  readonly ownGuard: boolean
  /** Half-angle of that guard's frontal cover, in radians (0 when none). */
  readonly guardArc: number
  /** Seconds after its own strike during which the guard is down. */
  readonly guardRecovery: number
  /**
   * Distance the attacker closes as the blow lands, so backing out of range
   * during the wind-up is not a free answer.
   */
  readonly stepIn: number
  /** Attacks at range with a travelling projectile instead of a melee blow. */
  readonly ranged: boolean
  /** Projectile speed in world units per second (0 for melee). */
  readonly projectileSpeed: number
  /**
   * Distance below which the archetype gives ground instead of attacking, so a
   * bowman who has been rushed backs off rather than fighting toe to toe.
   */
  readonly minRange: number
  /** The archetype cannot move while winding up. */
  readonly rootedWindup: boolean
  /** Damage a landed blow deals to the player. */
  readonly damage: number
  /** Heavy blows cost the player extra Resolve to block. */
  readonly heavy: boolean
  /** Multiplier on the mission's base guard health. */
  readonly healthScale: number
}

/** Purely visual identity, so the roster reads at a glance on a phone. */
export type ArchetypePresentation = {
  readonly displayName: string
  /** Which bone-attached kit the figure renders. */
  readonly kit: 'sword' | 'javelin' | 'buckler' | 'longbow'
  /** Cloth accent, distinct per archetype against the shared guard palette. */
  readonly accent: string
  /** Scale applied to the shared guard model. */
  readonly scale: number
}

export type ArchetypeEvidence = {
  readonly sourceId: string
  readonly equipmentClaim: string
  readonly reconstruction: string
}

export type GuardArchetype = {
  readonly id: GuardArchetypeId
  readonly perception: GuardPerception
  readonly behaviour: ArchetypeBehaviour
  readonly presentation: ArchetypePresentation
  readonly evidence: ArchetypeEvidence
}

const MEGASTHENES = 'megasthenes-fragments'

/**
 * The baseline. Identical perception to the shipped GUARD_PERCEPTION so the
 * existing golden tests and mission tuning are untouched — a sentry is exactly
 * the guard the chapter already had.
 */
const sentry: GuardArchetype = {
  id: 'sentry',
  perception: GUARD_PERCEPTION,
  behaviour: {
    ownGuard: false,
    guardArc: 0,
    guardRecovery: 0,
    stepIn: 0,
    ranged: false,
    projectileSpeed: 0,
    minRange: 0,
    rootedWindup: true,
    damage: 9,
    heavy: false,
    healthScale: 1,
  },
  presentation: {
    displayName: 'Nanda sentry',
    kit: 'sword',
    accent: '#7a6038',
    scale: 0.6,
  },
  evidence: {
    sourceId: MEGASTHENES,
    equipmentClaim:
      'Arrian, summarising Megasthenes, says every Indian foot-soldier wore a broad-bladed sword wielded with both hands in close fight.',
    reconstruction:
      'The sentry\u2019s patrol route, reach, wind-up and recovery timings are gameplay reconstruction.',
  },
}

/**
 * Reach and commitment. A longer wind-up that is easy to read, but the thrust
 * closes distance as it lands, so retreating out of range — the answer that
 * worked on every guard before the roster — no longer saves you. Stand and
 * parry, or take it.
 */
const javelineer: GuardArchetype = {
  id: 'javelineer',
  perception: {
    ...GUARD_PERCEPTION,
    attackRange: 2.35,
    windupTime: 0.62,
    attackCooldown: 1.45,
    chaseSpeed: 2.0,
    patrolSpeed: 0.9,
    flankOffset: 2.1,
  },
  behaviour: {
    ownGuard: false,
    guardArc: 0,
    guardRecovery: 0,
    stepIn: 0.85,
    ranged: false,
    projectileSpeed: 0,
    minRange: 0,
    rootedWindup: true,
    damage: 13,
    heavy: true,
    healthScale: 0.9,
  },
  presentation: {
    displayName: 'Nanda javelineer',
    kit: 'javelin',
    accent: '#6d7a4a',
    scale: 0.6,
  },
  evidence: {
    sourceId: MEGASTHENES,
    equipmentClaim:
      'The same passage notes that some Indian foot-soldiers were "equipped with javelins instead of bows".',
    reconstruction:
      'The stepping thrust, its reach and its recovery window are gameplay reconstruction.',
  },
}

/**
 * The inversion. He carries the player's own mechanic: a raised guard that
 * deflects frontal strikes. The source says the ox-hide buckler is "not so
 * broad as those who carry them, but about as long" — long, narrow, and
 * therefore covering the front rather than the flanks. So the answer is to get
 * around him, or to strike in the window after his own blow when the shield is
 * down.
 */
const shieldbearer: GuardArchetype = {
  id: 'shieldbearer',
  perception: {
    ...GUARD_PERCEPTION,
    attackRange: 1.5,
    windupTime: 0.5,
    attackCooldown: 1.25,
    chaseSpeed: 1.85,
    patrolSpeed: 0.8,
    retreatHealthFraction: 0.12,
  },
  behaviour: {
    ownGuard: true,
    // Deliberately narrower than the player's own guard arc: a long, narrow
    // buckler is beatable by footwork.
    guardArc: Math.PI * 0.33,
    // The only window in which the shield is down. It follows his own blow, so
    // the punish is precise and learnable — long enough to land two swings,
    // short enough that the shield is up for most of the exchange.
    guardRecovery: 0.7,
    stepIn: 0,
    ranged: false,
    projectileSpeed: 0,
    minRange: 0,
    rootedWindup: true,
    damage: 10,
    heavy: false,
    healthScale: 1.35,
  },
  presentation: {
    displayName: 'Nanda shieldbearer',
    kit: 'buckler',
    accent: '#8a5a34',
    scale: 0.62,
  },
  evidence: {
    sourceId: MEGASTHENES,
    equipmentClaim:
      'Arrian describes bucklers "made of undressed ox-hide, which are not so broad as those who carry them, but are about as long".',
    reconstruction:
      'That the narrow buckler covers the front but not the flanks, and every timing around it, is gameplay reconstruction built on the described shape.',
  },
}

/**
 * The pressure. He outranges everything and cannot be parried from across the
 * courtyard — but Arrian describes the Indian bow as man-height and drawn by
 * bracing it against the ground with the foot, which makes the draw long,
 * stationary and extremely readable. Close the distance during it, break the
 * line of sight, or time the guard to deflect the arrow itself.
 */
const archer: GuardArchetype = {
  id: 'archer',
  perception: {
    ...GUARD_PERCEPTION,
    visionRange: 11,
    visionHalfAngle: Math.PI * 0.3,
    attackRange: 9.5,
    windupTime: 1.15,
    attackCooldown: 2.1,
    chaseSpeed: 1.5,
    patrolSpeed: 0.75,
    retreatHealthFraction: 0.4,
    flankOffset: 0.6,
  },
  behaviour: {
    ownGuard: false,
    guardArc: 0,
    guardRecovery: 0,
    stepIn: 0,
    ranged: true,
    projectileSpeed: 14,
    minRange: 3.4,
    rootedWindup: true,
    damage: 14,
    heavy: false,
    healthScale: 0.7,
  },
  presentation: {
    displayName: 'Nanda archer',
    kit: 'longbow',
    accent: '#4d5f77',
    scale: 0.6,
  },
  evidence: {
    sourceId: MEGASTHENES,
    equipmentClaim:
      'Arrian reports a bow "made of equal length with the man who bears it", braced against the ground and steadied with the left foot to draw.',
    reconstruction:
      'The draw time, arrow speed, damage and the fact that a timed guard deflects the shaft are gameplay reconstruction.',
  },
}

export const GUARD_ARCHETYPES: Readonly<
  Record<GuardArchetypeId, GuardArchetype>
> = { sentry, javelineer, shieldbearer, archer }

export const ARCHETYPE_IDS = Object.keys(
  GUARD_ARCHETYPES,
) as readonly GuardArchetypeId[]

export const archetypeById = (id: GuardArchetypeId): GuardArchetype =>
  GUARD_ARCHETYPES[id]

/**
 * Resolve an archetype id that may be missing (older definitions and any
 * chapter that does not care about the roster default to the sentry).
 */
export const resolveArchetype = (
  id: GuardArchetypeId | undefined,
): GuardArchetype => (id ? GUARD_ARCHETYPES[id] ?? sentry : sentry)

/**
 * Validate the roster's internal consistency. Returns human-readable problems
 * (empty when valid) so a definition's composition can be gated in tests.
 */
export const validateArchetype = (archetype: GuardArchetype): string[] => {
  const errors: string[] = []
  const { behaviour: b, perception: p } = archetype
  if (b.damage <= 0) {
    errors.push(`${archetype.id}: damage must be positive`)
  }
  if (b.healthScale <= 0) {
    errors.push(`${archetype.id}: healthScale must be positive`)
  }
  if (b.ownGuard && b.guardArc <= 0) {
    errors.push(`${archetype.id}: ownGuard requires a positive guardArc`)
  }
  if (b.ownGuard && b.guardRecovery <= 0) {
    errors.push(`${archetype.id}: ownGuard requires a positive guardRecovery`)
  }
  if (b.ranged && b.projectileSpeed <= 0) {
    errors.push(`${archetype.id}: ranged requires a positive projectileSpeed`)
  }
  if (!b.ranged && b.projectileSpeed !== 0) {
    errors.push(`${archetype.id}: melee archetypes must not set projectileSpeed`)
  }
  if (b.ranged && p.attackRange <= GUARD_PERCEPTION.attackRange) {
    errors.push(`${archetype.id}: a ranged archetype needs real reach`)
  }
  if (b.minRange < 0) {
    errors.push(`${archetype.id}: minRange cannot be negative`)
  }
  if (b.minRange >= p.attackRange) {
    errors.push(`${archetype.id}: minRange must sit inside attackRange`)
  }
  if (p.windupTime <= 0) {
    errors.push(`${archetype.id}: windupTime must be positive`)
  }
  if (p.attackCooldown <= p.windupTime) {
    errors.push(`${archetype.id}: attackCooldown must exceed windupTime`)
  }
  if (!archetype.evidence.sourceId) {
    errors.push(`${archetype.id}: every archetype needs a cited source`)
  }
  return errors
}
