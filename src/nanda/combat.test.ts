import { describe, expect, it } from 'vitest'
import {
  COMBAT_CONFIG,
  HITSTOP,
  createGuardStance,
  isWithinArc,
  resolveIncomingAttack,
  resolveOutgoingStrike,
  selectMeleeTarget,
  updateGuardStance,
  type GuardStance,
} from './combat'

const dt = 1 / 60

/** Hold (or release) the guard for `seconds` of simulated frames. */
const hold = (stance: GuardStance, seconds: number, guardHeld: boolean) => {
  const steps = Math.max(1, Math.round(seconds / dt))
  for (let i = 0; i < steps; i += 1) {
    updateGuardStance(stance, guardHeld, COMBAT_CONFIG, dt)
  }
}

/** A stance with the guard freshly raised this frame. */
const raisedStance = () => {
  const stance = createGuardStance()
  updateGuardStance(stance, true, COMBAT_CONFIG, dt)
  return stance
}

const frontalBlow = (damage = 12, heavy = false) => ({
  damage,
  frontal: true,
  heavy,
})

describe('guard stance timers', () => {
  it('opens a parry window on the frame the guard goes up', () => {
    const stance = createGuardStance()
    expect(stance.parryFor).toBe(0)
    updateGuardStance(stance, true, COMBAT_CONFIG, dt)
    expect(stance.raised).toBe(true)
    expect(stance.parryFor).toBeGreaterThan(0)
    expect(stance.parryFor).toBeLessThanOrEqual(COMBAT_CONFIG.parryWindow)
  })

  it('closes the window while the guard stays up, but keeps guarding', () => {
    const stance = raisedStance()
    hold(stance, COMBAT_CONFIG.parryWindow + 0.05, true)
    expect(stance.raised).toBe(true)
    expect(stance.parryFor).toBe(0)
    expect(stance.raisedFor).toBeGreaterThan(0)
  })

  it('arms the re-raise lock when an unspent window expires', () => {
    const stance = raisedStance()
    hold(stance, COMBAT_CONFIG.parryWindow + 0.02, true)
    expect(stance.reraiseLock).toBeGreaterThan(0)
  })

  it('arms the re-raise lock when the guard is dropped mid-window', () => {
    const stance = raisedStance()
    updateGuardStance(stance, false, COMBAT_CONFIG, dt)
    expect(stance.raised).toBe(false)
    expect(stance.parryFor).toBe(0)
    expect(stance.reraiseLock).toBeGreaterThan(0)
  })

  it('refuses to open a second window while the lock runs, so mashing fails', () => {
    const stance = raisedStance()
    updateGuardStance(stance, false, COMBAT_CONFIG, dt)
    updateGuardStance(stance, true, COMBAT_CONFIG, dt)
    expect(stance.raised).toBe(true)
    expect(stance.parryFor).toBe(0)

    // The mashed guard blocks rather than parries.
    const result = resolveIncomingAttack(stance, frontalBlow())
    expect(result.outcome).toBe('block')
  })

  it('opens a fresh window once the lock has expired', () => {
    const stance = raisedStance()
    updateGuardStance(stance, false, COMBAT_CONFIG, dt)
    hold(stance, COMBAT_CONFIG.parryCooldown + 0.05, false)
    updateGuardStance(stance, true, COMBAT_CONFIG, dt)
    expect(stance.parryFor).toBeGreaterThan(0)
  })

  it('regenerates Resolve faster with the guard down than up', () => {
    const down = createGuardStance()
    const up = createGuardStance()
    down.resolve = 0.2
    up.resolve = 0.2
    hold(down, 1, false)
    hold(up, 1, true)
    expect(down.resolve).toBeGreaterThan(up.resolve)
    expect(down.resolve).toBeLessThanOrEqual(1)
  })

  it('never lets Resolve exceed full', () => {
    const stance = createGuardStance()
    hold(stance, 5, false)
    expect(stance.resolve).toBe(1)
  })

  it('expires the riposte window and resets its multiplier', () => {
    const stance = raisedStance()
    const parry = resolveIncomingAttack(stance, frontalBlow())
    expect(parry.outcome).toBe('perfect-parry')
    expect(stance.riposteMultiplier).toBeGreaterThan(1)
    hold(stance, COMBAT_CONFIG.perfectParryRiposte + 0.1, false)
    expect(stance.riposteFor).toBe(0)
    expect(stance.riposteMultiplier).toBe(1)
  })
})

describe('incoming attack resolution', () => {
  it('lands in full on an unguarded player', () => {
    const stance = createGuardStance()
    const result = resolveIncomingAttack(stance, frontalBlow(15))
    expect(result.outcome).toBe('hit')
    expect(result.damage).toBe(15)
    expect(result.staggerTime).toBe(0)
  })

  it('lands in full when struck from outside the guard arc', () => {
    const stance = raisedStance()
    const result = resolveIncomingAttack(stance, {
      damage: 15,
      frontal: false,
    })
    expect(result.outcome).toBe('hit')
    expect(result.damage).toBe(15)
    // A flanking blow must not be converted into a parry.
    expect(stance.riposteFor).toBe(0)
  })

  it('perfect-parries inside the leading slice of the window', () => {
    const stance = raisedStance()
    const result = resolveIncomingAttack(stance, frontalBlow())
    expect(result.outcome).toBe('perfect-parry')
    expect(result.damage).toBe(0)
    expect(result.staggerTime).toBe(COMBAT_CONFIG.perfectParryStagger)
    expect(result.riposteTime).toBe(COMBAT_CONFIG.perfectParryRiposte)
  })

  it('parries in the later part of the window', () => {
    const stance = raisedStance()
    hold(stance, COMBAT_CONFIG.perfectWindow + 0.03, true)
    expect(stance.parryFor).toBeGreaterThan(0)
    const result = resolveIncomingAttack(stance, frontalBlow())
    expect(result.outcome).toBe('parry')
    expect(result.damage).toBe(0)
    expect(result.staggerTime).toBe(COMBAT_CONFIG.parryStagger)
  })

  it('restores Resolve on a parry', () => {
    const stance = raisedStance()
    stance.resolve = 0.5
    const result = resolveIncomingAttack(stance, frontalBlow())
    expect(result.resolve).toBeCloseTo(0.5 + COMBAT_CONFIG.parryResolveGain, 5)
  })

  it('spends the window so one press cannot answer two blows', () => {
    const stance = raisedStance()
    expect(resolveIncomingAttack(stance, frontalBlow()).outcome).toBe(
      'perfect-parry',
    )
    expect(resolveIncomingAttack(stance, frontalBlow()).outcome).toBe('block')
  })

  it('blocks for reduced damage once the window has closed', () => {
    const stance = raisedStance()
    hold(stance, COMBAT_CONFIG.parryWindow + 0.05, true)
    const result = resolveIncomingAttack(stance, frontalBlow(20))
    expect(result.outcome).toBe('block')
    expect(result.damage).toBeCloseTo(20 * COMBAT_CONFIG.blockDamageFraction, 5)
    expect(result.damage).toBeLessThan(20)
  })

  it('charges more Resolve for a heavy blow than a light one', () => {
    const light = raisedStance()
    const heavy = raisedStance()
    hold(light, COMBAT_CONFIG.parryWindow + 0.05, true)
    hold(heavy, COMBAT_CONFIG.parryWindow + 0.05, true)
    const lightResult = resolveIncomingAttack(light, frontalBlow(20, false))
    const heavyResult = resolveIncomingAttack(heavy, frontalBlow(20, true))
    expect(heavyResult.resolve).toBeLessThan(lightResult.resolve)
  })

  it('breaks the guard when a block cannot be paid for', () => {
    const stance = raisedStance()
    hold(stance, COMBAT_CONFIG.parryWindow + 0.05, true)
    stance.resolve = 0.05
    const result = resolveIncomingAttack(stance, frontalBlow(20))
    expect(result.outcome).toBe('guard-break')
    expect(result.damage).toBeCloseTo(
      20 * COMBAT_CONFIG.guardBreakDamageFraction,
      5,
    )
    expect(stance.resolve).toBe(0)
    expect(stance.raised).toBe(false)
    expect(stance.brokenFor).toBe(COMBAT_CONFIG.guardBreakLockout)
  })

  it('refuses to re-raise during the guard-break lockout', () => {
    const stance = raisedStance()
    hold(stance, COMBAT_CONFIG.parryWindow + 0.05, true)
    stance.resolve = 0.05
    resolveIncomingAttack(stance, frontalBlow(20))

    updateGuardStance(stance, true, COMBAT_CONFIG, dt)
    expect(stance.raised).toBe(false)

    hold(stance, COMBAT_CONFIG.guardBreakLockout + 0.05, true)
    updateGuardStance(stance, true, COMBAT_CONFIG, dt)
    expect(stance.raised).toBe(true)
  })

  it('turtling through repeated blows eventually breaks the guard', () => {
    const stance = raisedStance()
    let broke = false
    for (let i = 0; i < 12; i += 1) {
      hold(stance, COMBAT_CONFIG.parryWindow + 0.05, true)
      const result = resolveIncomingAttack(stance, frontalBlow(22, true))
      if (result.outcome === 'guard-break') {
        broke = true
        break
      }
    }
    expect(broke).toBe(true)
  })

  it('treats zero and negative damage safely', () => {
    const stance = createGuardStance()
    expect(resolveIncomingAttack(stance, { damage: -5, frontal: true }).damage).toBe(0)
  })
})

describe('outgoing strike resolution', () => {
  it('deals base damage with no bonus available', () => {
    const stance = createGuardStance()
    const result = resolveOutgoingStrike(stance, { baseDamage: 20 })
    expect(result.kind).toBe('normal')
    expect(result.damage).toBe(20)
    expect(result.consumedRiposte).toBe(false)
  })

  it('applies the vulnerability bonus as a punish', () => {
    const stance = createGuardStance()
    const result = resolveOutgoingStrike(stance, {
      baseDamage: 20,
      targetVulnerable: true,
    })
    expect(result.kind).toBe('punish')
    expect(result.damage).toBeCloseTo(
      20 * COMBAT_CONFIG.vulnerableDamageMultiplier,
      5,
    )
  })

  it('applies the riposte bonus after a parry and spends the window', () => {
    const stance = raisedStance()
    hold(stance, COMBAT_CONFIG.perfectWindow + 0.03, true)
    resolveIncomingAttack(stance, frontalBlow())
    const result = resolveOutgoingStrike(stance, { baseDamage: 20 })
    expect(result.kind).toBe('riposte')
    expect(result.damage).toBeCloseTo(
      20 * COMBAT_CONFIG.riposteDamageMultiplier,
      5,
    )
    expect(result.consumedRiposte).toBe(true)
    expect(stance.riposteFor).toBe(0)

    // A second swing gets nothing.
    expect(resolveOutgoingStrike(stance, { baseDamage: 20 }).kind).toBe('normal')
  })

  it('applies the larger perfect-riposte bonus', () => {
    const stance = raisedStance()
    resolveIncomingAttack(stance, frontalBlow())
    const result = resolveOutgoingStrike(stance, { baseDamage: 20 })
    expect(result.kind).toBe('perfect-riposte')
    expect(result.damage).toBeCloseTo(
      20 * COMBAT_CONFIG.perfectRiposteDamageMultiplier,
      5,
    )
  })

  it('takes the larger bonus instead of stacking riposte with vulnerability', () => {
    const stance = raisedStance()
    resolveIncomingAttack(stance, frontalBlow())
    const result = resolveOutgoingStrike(stance, {
      baseDamage: 20,
      targetVulnerable: true,
    })
    const stacked =
      20 *
      COMBAT_CONFIG.perfectRiposteDamageMultiplier *
      COMBAT_CONFIG.vulnerableDamageMultiplier
    expect(result.damage).toBeLessThan(stacked)
    expect(result.damage).toBeCloseTo(
      20 * COMBAT_CONFIG.perfectRiposteDamageMultiplier,
      5,
    )
  })
})

describe('honest melee targeting', () => {
  const origin = { x: 0, z: 0 }

  it('hits a target directly ahead', () => {
    const target = selectMeleeTarget(0, origin, [{ x: 0, z: 1.5 }])
    expect(target?.index).toBe(0)
    expect(target?.distance).toBeCloseTo(1.5, 5)
    expect(target?.yaw).toBeCloseTo(0, 5)
  })

  it('refuses a target directly behind the player', () => {
    expect(selectMeleeTarget(0, origin, [{ x: 0, z: -1.5 }])).toBeNull()
  })

  it('refuses a target beyond reach', () => {
    expect(
      selectMeleeTarget(0, origin, [
        { x: 0, z: COMBAT_CONFIG.strikeReach + 0.2 },
      ]),
    ).toBeNull()
  })

  it('picks the nearest of several valid targets', () => {
    const target = selectMeleeTarget(0, origin, [
      { x: 0, z: 2 },
      { x: 0.4, z: 1 },
    ])
    expect(target?.index).toBe(1)
  })

  it('skips null candidates so defeated guards cannot be hit', () => {
    const target = selectMeleeTarget(0, origin, [null, { x: 0, z: 1.2 }])
    expect(target?.index).toBe(1)
  })

  it('returns the yaw needed to turn onto an off-axis target', () => {
    const target = selectMeleeTarget(0, origin, [{ x: 1, z: 1 }])
    expect(target?.yaw).toBeCloseTo(Math.PI / 4, 5)
  })

  it('honours a shorter reach when one is supplied', () => {
    const candidates = [{ x: 0, z: 2 }]
    expect(selectMeleeTarget(0, origin, candidates, COMBAT_CONFIG, 1.5)).toBeNull()
    expect(selectMeleeTarget(0, origin, candidates, COMBAT_CONFIG, 2.5)).not.toBeNull()
  })
})

describe('arc helper', () => {
  it('accepts an attacker in front and rejects one behind', () => {
    expect(
      isWithinArc(0, { x: 0, z: 0 }, { x: 0, z: 2 }, COMBAT_CONFIG.guardArc),
    ).toBe(true)
    expect(
      isWithinArc(0, { x: 0, z: 0 }, { x: 0, z: -2 }, COMBAT_CONFIG.guardArc),
    ).toBe(false)
  })
})

describe('hit-stop budget', () => {
  it('makes a perfect parry the heaviest beat in the fight', () => {
    expect(HITSTOP['perfect-parry']).toBeGreaterThan(HITSTOP.parry)
    expect(HITSTOP.parry).toBeGreaterThan(HITSTOP.block)
    expect(HITSTOP['perfect-riposte']).toBeGreaterThan(HITSTOP.riposte)
    expect(HITSTOP.riposte).toBeGreaterThan(HITSTOP.normal)
  })

  it('keeps every value short enough to read as impact, not lag', () => {
    for (const value of Object.values(HITSTOP)) {
      expect(value).toBeGreaterThan(0)
      expect(value).toBeLessThanOrEqual(0.2)
    }
  })
})
