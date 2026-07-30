import { describe, expect, it } from 'vitest'
import {
  ARCHETYPE_IDS,
  GUARD_ARCHETYPES,
  archetypeById,
  resolveArchetype,
  validateArchetype,
} from './archetypes'
import {
  GUARD_PERCEPTION,
  createGuardBrain,
  updateGuardBrain,
  type GuardBrain,
  type GuardWorldInput,
} from './guardAi'
import {
  ARROW_POOL,
  advanceArrow,
  arrowHits,
  arrowIsLive,
  createArrowPool,
  fireArrow,
  retireArrow,
} from './arrows'

const dt = 1 / 60

const worldInput = (
  overrides: Partial<GuardWorldInput> = {},
): GuardWorldInput => ({
  guard: { x: 0, z: 0 },
  facingYaw: 0,
  player: { x: 0, z: 1 },
  playerNoise: 1,
  healthFraction: 1,
  ...overrides,
})

/** Run the brain until `predicate` holds, or give up after `seconds`. */
const runUntil = (
  brain: GuardBrain,
  input: GuardWorldInput,
  cfg = GUARD_PERCEPTION,
  behaviour = {},
  predicate: (intent: ReturnType<typeof updateGuardBrain>) => boolean,
  seconds = 12,
) => {
  const steps = Math.round(seconds / dt)
  for (let i = 0; i < steps; i += 1) {
    const intent = updateGuardBrain(brain, input, cfg, dt, behaviour)
    if (predicate(intent)) {
      return intent
    }
  }
  return null
}

describe('the archetype roster', () => {
  it('exposes exactly the four sourced infantry types', () => {
    expect([...ARCHETYPE_IDS].sort()).toEqual([
      'archer',
      'javelineer',
      'sentry',
      'shieldbearer',
    ])
  })

  it('passes its own validation for every archetype', () => {
    for (const id of ARCHETYPE_IDS) {
      expect(validateArchetype(GUARD_ARCHETYPES[id])).toEqual([])
    }
  })

  it('cites a source and labels the reconstruction for every archetype', () => {
    for (const id of ARCHETYPE_IDS) {
      const evidence = GUARD_ARCHETYPES[id].evidence
      expect(evidence.sourceId).toBe('megasthenes-fragments')
      expect(evidence.equipmentClaim.length).toBeGreaterThan(30)
      expect(evidence.reconstruction).toMatch(/gameplay reconstruction/)
    }
  })

  it('keeps the sentry byte-identical to the shipped guard perception', () => {
    // The Timber Gate's existing tuning and golden tests must not move.
    expect(GUARD_ARCHETYPES.sentry.perception).toBe(GUARD_PERCEPTION)
  })

  it('gives every archetype a distinct silhouette kit', () => {
    const kits = ARCHETYPE_IDS.map((id) => GUARD_ARCHETYPES[id].presentation.kit)
    expect(new Set(kits).size).toBe(kits.length)
  })

  it('defaults an unknown or missing archetype to the sentry', () => {
    expect(resolveArchetype(undefined).id).toBe('sentry')
    expect(archetypeById('javelineer').id).toBe('javelineer')
  })

  it('makes each archetype ask a different question of the guard', () => {
    const { sentry, javelineer, shieldbearer, archer } = GUARD_ARCHETYPES
    // Reach: the javelineer outranges the sentry, the archer outranges both.
    expect(javelineer.perception.attackRange).toBeGreaterThan(
      sentry.perception.attackRange,
    )
    expect(archer.perception.attackRange).toBeGreaterThan(
      javelineer.perception.attackRange,
    )
    // Commitment: only the javelineer closes distance as the blow lands.
    expect(javelineer.behaviour.stepIn).toBeGreaterThan(0)
    expect(sentry.behaviour.stepIn).toBe(0)
    // Inversion: only the shieldbearer carries its own guard.
    expect(shieldbearer.behaviour.ownGuard).toBe(true)
    expect(sentry.behaviour.ownGuard).toBe(false)
    // The buckler is narrower than the player's own guard, so it can be flanked.
    expect(shieldbearer.behaviour.guardArc).toBeLessThan(Math.PI * 0.42)
    // The archer's draw is the longest telegraph in the roster.
    expect(archer.perception.windupTime).toBeGreaterThan(
      javelineer.perception.windupTime,
    )
    expect(javelineer.perception.windupTime).toBeGreaterThan(
      sentry.perception.windupTime,
    )
  })

  it('flags an inconsistent archetype', () => {
    const broken = {
      ...GUARD_ARCHETYPES.sentry,
      behaviour: { ...GUARD_ARCHETYPES.sentry.behaviour, ownGuard: true },
    }
    expect(validateArchetype(broken)).toContain(
      'sentry: ownGuard requires a positive guardArc',
    )
  })

  it('flags a melee archetype that sets a projectile speed', () => {
    const broken = {
      ...GUARD_ARCHETYPES.sentry,
      behaviour: { ...GUARD_ARCHETYPES.sentry.behaviour, projectileSpeed: 9 },
    }
    expect(validateArchetype(broken)).toContain(
      'sentry: melee archetypes must not set projectileSpeed',
    )
  })
})

describe('shieldbearer behaviour in the guard brain', () => {
  const behaviour = {
    ownGuard: true,
    guardRecovery: GUARD_ARCHETYPES.shieldbearer.behaviour.guardRecovery,
  }
  const cfg = GUARD_ARCHETYPES.shieldbearer.perception

  it('does not raise the shield while it is unaware', () => {
    const brain = createGuardBrain('s', { x: 0, z: 0 })
    const intent = updateGuardBrain(
      brain,
      worldInput({ player: { x: 0, z: 40 }, playerNoise: 0 }),
      cfg,
      dt,
      behaviour,
    )
    expect(intent.guarding).toBe(false)
  })

  it('raises the shield once it knows the player is there', () => {
    const brain = createGuardBrain('s', { x: 0, z: 0 })
    const raised = runUntil(
      brain,
      worldInput(),
      cfg,
      behaviour,
      (intent) => intent.guarding,
    )
    expect(raised).not.toBeNull()
  })

  it('drops the shield to strike, and keeps it down through the recovery', () => {
    const brain = createGuardBrain('s', { x: 0, z: 0 })
    const input = worldInput()
    const struck = runUntil(
      brain,
      input,
      cfg,
      behaviour,
      (intent) => intent.strike,
    )
    expect(struck).not.toBeNull()
    expect(struck?.guarding).toBe(false)
    expect(brain.guardDownTimer).toBeCloseTo(behaviour.guardRecovery, 5)

    // Still down partway through the recovery window...
    const half = Math.round(behaviour.guardRecovery / 2 / dt)
    let intent = struck!
    for (let i = 0; i < half; i += 1) {
      intent = updateGuardBrain(brain, input, cfg, dt, behaviour)
    }
    expect(intent.guarding).toBe(false)

    // ...and back up once it has passed.
    const backUp = runUntil(
      brain,
      input,
      cfg,
      behaviour,
      (next) => next.guarding,
      4,
    )
    expect(backUp).not.toBeNull()
  })

  it('keeps the shield up through its own wind-up, so it cannot be out-damaged', () => {
    // The shield-and-sword fighter strikes over the shield. If the wind-up were
    // an opening, a player could simply trade hits and never learn to parry.
    const brain = createGuardBrain('s', { x: 0, z: 0 })
    const input = worldInput()
    const windup = runUntil(
      brain,
      input,
      cfg,
      behaviour,
      (intent) => intent.windup,
    )
    expect(windup).not.toBeNull()
    expect(windup?.guarding).toBe(true)
  })

  it('spends most of an attack cycle covered', () => {
    // Sample a long engagement and confirm the shield is up far more than down;
    // the previous tuning had it down for most of the cycle, which let the
    // player ignore the mechanic entirely.
    const brain = createGuardBrain('s', { x: 0, z: 0 })
    const input = worldInput()
    // Warm up to a steady engaged state first.
    runUntil(brain, input, cfg, behaviour, (i) => i.strike)
    let up = 0
    let total = 0
    const steps = Math.round(6 / dt)
    for (let i = 0; i < steps; i += 1) {
      const intent = updateGuardBrain(brain, input, cfg, dt, behaviour)
      total += 1
      if (intent.guarding) {
        up += 1
      }
    }
    expect(up / total).toBeGreaterThan(0.5)
  })

  it('leaves a sentry with no shield at all', () => {
    const brain = createGuardBrain('s', { x: 0, z: 0 })
    const everGuarded = runUntil(
      brain,
      worldInput(),
      GUARD_PERCEPTION,
      {},
      (intent) => intent.guarding,
      6,
    )
    expect(everGuarded).toBeNull()
  })
})

describe('archer behaviour in the guard brain', () => {
  const cfg = GUARD_ARCHETYPES.archer.perception
  const behaviour = { minRange: GUARD_ARCHETYPES.archer.behaviour.minRange }

  it('engages from far outside melee reach', () => {
    const brain = createGuardBrain('a', { x: 0, z: 0 })
    const input = worldInput({ player: { x: 0, z: 6 } })
    const windup = runUntil(
      brain,
      input,
      cfg,
      behaviour,
      (intent) => intent.windup,
    )
    expect(windup).not.toBeNull()
    expect(windup?.state).toBe('attack')
  })

  it('gives ground instead of attacking once the player closes inside minRange', () => {
    const brain = createGuardBrain('a', { x: 0, z: 0 })
    // Wake it up at range first.
    runUntil(brain, worldInput({ player: { x: 0, z: 6 } }), cfg, behaviour, (i) =>
      i.windup,
    )
    const close = worldInput({ player: { x: 0, z: 1 } })
    const backing = runUntil(
      brain,
      close,
      cfg,
      behaviour,
      (intent) =>
        intent.moveTarget !== null && intent.moveTarget.z < 0 && !intent.strike,
      3,
    )
    expect(backing).not.toBeNull()
  })

  it('takes the longest telegraph in the roster to draw', () => {
    expect(cfg.windupTime).toBeGreaterThanOrEqual(1)
  })
})

describe('javelineer behaviour', () => {
  it('commits to a stepping thrust the player cannot simply walk out of', () => {
    const { javelineer } = GUARD_ARCHETYPES
    // The step-in must be a real fraction of the reach it is closing.
    expect(javelineer.behaviour.stepIn).toBeGreaterThan(0.5)
    expect(javelineer.behaviour.heavy).toBe(true)
    expect(javelineer.behaviour.damage).toBeGreaterThan(
      GUARD_ARCHETYPES.sentry.behaviour.damage,
    )
  })

  it('the step-in covers a retreat made during the wind-up', () => {
    // A player who backs off at normal move speed during the wind-up gains
    // roughly moveSpeed * windupTime. The thrust must claw back a real share of
    // that, or "walk backwards" stays the universal answer it was before.
    const { javelineer } = GUARD_ARCHETYPES
    const retreatSpeed = 4.4 // the mission's base moveSpeed
    const retreatGained = retreatSpeed * javelineer.perception.windupTime
    expect(javelineer.behaviour.stepIn).toBeGreaterThan(retreatGained * 0.25)
  })
})

describe('the archer, end to end through the real arrow pool', () => {
  const cfg = GUARD_ARCHETYPES.archer.perception
  const { behaviour } = GUARD_ARCHETYPES.archer

  it('draws, looses, and the arrow reaches a stationary player', () => {
    const brain = createGuardBrain('archer', { x: 0, z: 0 })
    const archerAt = { x: 0, y: 1.25, z: 0 }
    const playerAt = { x: 0, y: 1.1, z: 7 }
    const input = worldInput({ player: { x: playerAt.x, z: playerAt.z } })
    const pool = createArrowPool()

    let released = 0
    let connected = 0
    const steps = Math.round(10 / dt)
    for (let i = 0; i < steps; i += 1) {
      const intent = updateGuardBrain(brain, input, cfg, dt, {
        minRange: behaviour.minRange,
      })
      if (intent.strike) {
        released += 1
        fireArrow(
          pool,
          archerAt,
          playerAt,
          behaviour.projectileSpeed,
          behaviour.damage,
        )
      }
      for (let slot = 0; slot < ARROW_POOL; slot += 1) {
        if (!arrowIsLive(pool, slot)) {
          continue
        }
        advanceArrow(pool, slot, dt)
        if (arrowHits(pool, slot, playerAt)) {
          connected += 1
          retireArrow(pool, slot)
        }
      }
    }

    // It engages from well outside melee reach and actually connects.
    expect(released).toBeGreaterThan(0)
    expect(connected).toBeGreaterThan(0)
  })

  it('cannot be answered by standing still, but can be closed on', () => {
    // The draw is long enough that a player moving at base speed covers the gap
    // between minRange and melee before the shot lands.
    const closingSpeed = 4.4
    expect(closingSpeed * cfg.windupTime).toBeGreaterThan(behaviour.minRange)
  })

  it('carries the roster\u2019s heaviest single hit, so ignoring it is punished', () => {
    for (const id of ARCHETYPE_IDS) {
      if (id === 'archer') {
        continue
      }
      expect(behaviour.damage).toBeGreaterThanOrEqual(
        GUARD_ARCHETYPES[id].behaviour.damage,
      )
    }
  })
})
