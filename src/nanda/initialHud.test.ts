import { describe, expect, it } from 'vitest'
import { initialHud } from './initialHud'
import { timberGateDefinition } from './timberGateDefinition'
import type { MissionModifiers } from './types'

const baseModifiers: MissionModifiers = {
  maxHealth: 100,
  attackDamage: 24,
  moveSpeed: 4.6,
  jumpForce: 6.2,
  enemyCount: 6,
  enemyHealth: 30,
  requiredObjectives: 2,
  securedObjectives: 0,
  healingCharges: 2,
  revealObjectives: false,
  sideGateOpen: false,
  routeLabel: 'Unprepared courtyard approach',
}

describe('initialHud (Gate 12)', () => {
  it('sources both boss-health fields from the definition boss maxHealth', () => {
    const boss = timberGateDefinition.encounters.boss
    expect(boss).not.toBeNull()
    const expected = boss?.maxHealth

    const hud = initialHud(baseModifiers)

    expect(hud.bossHealth).toBe(expected)
    expect(hud.bossMaxHealth).toBe(expected)
    // Both readouts must agree so the bar starts full.
    expect(hud.bossHealth).toBe(hud.bossMaxHealth)
  })
})
