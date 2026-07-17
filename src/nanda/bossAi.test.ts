import { describe, expect, it } from 'vitest'
import {
  BOSS_CONFIG,
  createBossBrain,
  updateBossBrain,
  type BossBrain,
  type BossIntent,
  type BossWorldInput,
} from './bossAi'

const input = (overrides: Partial<BossWorldInput> = {}): BossWorldInput => ({
  boss: { x: 0, z: 0 },
  player: { x: 0, z: 3 },
  healthFraction: 1,
  ...overrides,
})

const tick = (brain: BossBrain, world: BossWorldInput, dt = 1 / 30) =>
  updateBossBrain(brain, world, BOSS_CONFIG, dt)

/** Run the sim for `seconds`, returning every intent produced. */
const run = (
  brain: BossBrain,
  world: (t: number) => BossWorldInput,
  seconds: number,
  dt = 1 / 30,
): BossIntent[] => {
  const out: BossIntent[] = []
  const steps = Math.round(seconds / dt)
  for (let i = 0; i < steps; i += 1) {
    out.push(updateBossBrain(brain, world(i * dt), BOSS_CONFIG, dt))
  }
  return out
}

describe('boss phases', () => {
  it('reports phase 1 / 2 / 3 by health fraction', () => {
    const brain = createBossBrain('b')
    expect(tick(brain, input({ healthFraction: 1 })).phase).toBe(1)
    expect(tick(brain, input({ healthFraction: 0.5 })).phase).toBe(2)
    expect(tick(brain, input({ healthFraction: 0.2 })).phase).toBe(3)
  })
})

describe('boss engagement', () => {
  it('stays dormant while the player is far and unharmed', () => {
    const brain = createBossBrain('b')
    const intent = tick(brain, input({ player: { x: 0, z: 40 } }))
    expect(intent.state).toBe('dormant')
    expect(intent.engaged).toBe(false)
  })

  it('engages when the player comes within range', () => {
    const brain = createBossBrain('b')
    const intent = tick(brain, input({ player: { x: 0, z: 5 } }))
    expect(brain.engaged).toBe(true)
    expect(intent.engaged).toBe(true)
    expect(intent.state).not.toBe('dormant')
  })

  it('engages immediately when struck from range', () => {
    const brain = createBossBrain('b')
    const intent = tick(
      brain,
      input({ player: { x: 0, z: 40 }, damaged: true }),
    )
    expect(brain.engaged).toBe(true)
    expect(intent.engaged).toBe(true)
  })

  it('stays engaged even if the player later backs away', () => {
    const brain = createBossBrain('b')
    tick(brain, input({ player: { x: 0, z: 5 } }))
    const intent = tick(brain, input({ player: { x: 0, z: 60 } }))
    expect(brain.engaged).toBe(true)
    expect(intent.state).not.toBe('dormant')
  })
})

describe('boss strikes', () => {
  it('telegraphs a wind-up before a melee strike lands', () => {
    const brain = createBossBrain('b')
    const world = () => input({ player: { x: 0, z: 1.2 } })
    const intents = run(brain, world, 3)
    const firstWindup = intents.findIndex((i) => i.windup)
    const firstStrike = intents.findIndex((i) => i.strike)
    expect(firstWindup).toBeGreaterThanOrEqual(0)
    expect(firstStrike).toBeGreaterThan(firstWindup)
    expect(intents[firstStrike].damage).toBe(BOSS_CONFIG.strikeDamage)
  })

  it('misses if the player leaves reach during the wind-up', () => {
    const brain = createBossBrain('b')
    // In reach until the wind-up starts, then dodge far away.
    let dodged = false
    const world = () => {
      if (brain.state === 'strike') {
        dodged = true
      }
      return input({ player: { x: 0, z: dodged ? 20 : 1.2 } })
    }
    const intents = run(brain, world, 3)
    const strike = intents.find((i) => i.strike)
    // Either no strike connected, or the recorded strikes all dealt 0 damage.
    expect(intents.filter((i) => i.strike && i.damage > 0).length).toBe(0)
    expect(strike === undefined || strike.damage === 0).toBe(true)
  })
})

describe('boss lunge', () => {
  it('does not lunge in phase 1', () => {
    const brain = createBossBrain('b')
    const world = () => input({ player: { x: 0, z: 4.5 }, healthFraction: 1 })
    const intents = run(brain, world, 4)
    expect(intents.some((i) => i.lunging)).toBe(false)
  })

  it('lunges from mid-range in phase 3 and then becomes vulnerable', () => {
    const brain = createBossBrain('b')
    const world = () => input({ player: { x: 0, z: 4.5 }, healthFraction: 0.2 })
    const intents = run(brain, world, 5)
    expect(intents.some((i) => i.windup)).toBe(true)
    expect(intents.some((i) => i.lunging)).toBe(true)
    // A vulnerable recovery window follows a lunge.
    expect(intents.some((i) => i.vulnerable)).toBe(true)
  })

  it('recovers (vulnerable) with no damage output during the window', () => {
    const brain = createBossBrain('b')
    const world = () => input({ player: { x: 0, z: 4.5 }, healthFraction: 0.2 })
    const intents = run(brain, world, 5)
    expect(intents.some((i) => i.vulnerable)).toBe(true)
    for (const intent of intents) {
      if (intent.vulnerable) {
        expect(intent.strike).toBe(false)
        expect(intent.speed).toBe(0)
      }
    }
  })
})
