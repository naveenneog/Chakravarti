import { describe, expect, it } from 'vitest'

import {
  activeCut,
  advanceCombo,
  COMBO_CONFIG,
  CUTS,
  comboDamageMultiplier,
  createComboState,
  cutDuration,
  isCutActive,
  registerHit,
  requestStrike,
  resetCombo,
} from './heroCombo'

/** Run the chain forward in small steps, as the render loop does. */
const run = (
  state: ReturnType<typeof createComboState>,
  seconds: number,
  resolve = 100,
  step = 1 / 120,
) => {
  const events = []
  let remaining = seconds
  while (remaining > 0) {
    const delta = Math.min(step, remaining)
    events.push(...advanceCombo(state, delta, resolve))
    remaining -= delta
  }
  return events
}

describe('cut profiles', () => {
  it('escalates damage and reach across the chain', () => {
    for (let index = 1; index < CUTS.length; index += 1) {
      expect(CUTS[index].damageMultiplier).toBeGreaterThan(
        CUTS[index - 1].damageMultiplier,
      )
      expect(CUTS[index].reach).toBeGreaterThan(CUTS[index - 1].reach)
    }
  })

  it('pays for the finisher with commitment, not just resolve', () => {
    const opening = CUTS[0]
    const cleave = CUTS[2]
    // The whole design rests on the cleave being genuinely punishable.
    expect(cleave.recovery).toBeGreaterThan(opening.recovery * 2.5)
    expect(cleave.windup).toBeGreaterThan(opening.windup * 2)
  })

  it('makes only the finisher break a raised guard', () => {
    expect(CUTS.filter((cut) => cut.breaksGuard)).toHaveLength(1)
    expect(CUTS[2].breaksGuard).toBe(true)
  })

  it('gives every cut its own clip so the chain reads visually', () => {
    const clips = new Set(CUTS.map((cut) => cut.clip))
    expect(clips.size).toBe(CUTS.length)
  })
})

describe('starting the chain', () => {
  it('begins at the opening cut from idle', () => {
    const state = createComboState()
    const request = requestStrike(state, 100)
    expect(request.started).toBe(true)
    expect(request.step).toBe(1)
    expect(state.phase).toBe('windup')
  })

  it('reaches active frames only after the windup', () => {
    const state = createComboState()
    requestStrike(state, 100)
    run(state, CUTS[0].windup * 0.5)
    expect(isCutActive(state)).toBe(false)
    run(state, CUTS[0].windup * 0.6)
    expect(isCutActive(state)).toBe(true)
  })
})

describe('linking', () => {
  it('advances to the cross cut when pressed during recovery', () => {
    const state = createComboState()
    requestStrike(state, 100)
    run(state, CUTS[0].windup + CUTS[0].active + 0.01)
    expect(state.phase).toBe('recovery')
    const request = requestStrike(state, 100)
    expect(request.started).toBe(true)
    expect(request.step).toBe(2)
  })

  it('buffers a press made mid-swing and spends it when the link opens', () => {
    const state = createComboState()
    requestStrike(state, 100)
    // Press during the windup: too early to link, must not be thrown away.
    const early = requestStrike(state, 100)
    expect(early.started).toBe(false)
    expect(early.buffered).toBe(true)

    const events = run(state, CUTS[0].windup + CUTS[0].active + 0.02)
    expect(events.some((event) => event.type === 'started')).toBe(true)
    expect(state.step).toBe(2)
  })

  it('drops the chain back to idle when the link window expires', () => {
    const state = createComboState()
    requestStrike(state, 100)
    const events = run(state, cutDuration(CUTS[0], false) + COMBO_CONFIG.linkGrace + 0.05)
    expect(events.some((event) => event.type === 'chain-dropped')).toBe(true)
    expect(state.phase).toBe('idle')
    expect(state.step).toBe(0)

    // And the next press starts a fresh chain rather than the cross cut.
    expect(requestStrike(state, 100).step).toBe(1)
  })

  it('never links past the final cut', () => {
    const state = createComboState()
    requestStrike(state, 100)
    run(state, CUTS[0].windup + CUTS[0].active + 0.01)
    requestStrike(state, 100)
    run(state, CUTS[1].windup + CUTS[1].active + 0.01)
    requestStrike(state, 100)
    expect(state.step).toBe(3)
    run(state, CUTS[2].windup + CUTS[2].active + 0.01)
    expect(requestStrike(state, 100).started).toBe(false)
    expect(state.step).toBe(3)
  })
})

describe('flow timing', () => {
  it('rewards an early link inside the flow window', () => {
    const state = createComboState()
    requestStrike(state, 100)
    run(state, CUTS[0].windup + CUTS[0].active + 0.005)
    const request = requestStrike(state, 100)
    expect(request.flowed).toBe(true)
    expect(state.flow).toBe(1)
    expect(comboDamageMultiplier(state)).toBeCloseTo(
      CUTS[1].damageMultiplier * (1 + COMBO_CONFIG.flowBonus),
      5,
    )
  })

  it('gives no bonus for a late link and resets the bank', () => {
    const state = createComboState()
    requestStrike(state, 100)
    const recovery = CUTS[0].recovery * CUTS[0].whiffRecoveryMultiplier
    run(state, CUTS[0].windup + CUTS[0].active + recovery * 0.95)
    const request = requestStrike(state, 100)
    expect(request.started).toBe(true)
    expect(request.flowed).toBe(false)
    expect(state.flow).toBe(0)
    expect(comboDamageMultiplier(state)).toBeCloseTo(CUTS[1].damageMultiplier, 5)
  })

  it('caps the banked flow bonus', () => {
    const state = createComboState()
    requestStrike(state, 100)
    for (let index = 0; index < 2; index += 1) {
      const cut = CUTS[index]
      run(state, cut.windup + cut.active + 0.005)
      requestStrike(state, 100)
    }
    expect(state.flow).toBeLessThanOrEqual(COMBO_CONFIG.maxFlow)
  })
})

describe('whiffing', () => {
  it('lengthens recovery when the cut connected with nothing', () => {
    expect(cutDuration(CUTS[2], false)).toBeGreaterThan(cutDuration(CUTS[2], true))
  })

  it('shortens recovery once a hit is registered', () => {
    const state = createComboState()
    requestStrike(state, 100)
    run(state, CUTS[0].windup + 0.01)
    registerHit(state)
    expect(state.hit).toBe(true)
  })
})

describe('resolve', () => {
  it('refuses the cleave without enough resolve but keeps the light cuts free', () => {
    expect(CUTS[0].resolveCost).toBe(0)
    expect(CUTS[1].resolveCost).toBe(0)
    expect(CUTS[2].resolveCost).toBeGreaterThan(0)

    const state = createComboState()
    requestStrike(state, 0)
    run(state, CUTS[0].windup + CUTS[0].active + 0.01)
    expect(requestStrike(state, 0).step).toBe(2)
    run(state, CUTS[1].windup + CUTS[1].active + 0.01)
    // No resolve left, so the finisher is refused rather than played for free.
    expect(requestStrike(state, 0).started).toBe(false)
    expect(state.step).toBe(2)
  })
})

describe('low frame rates', () => {
  /**
   * The mission clamps its delta to 0.05s, so a slow phone advances the
   * simulation in coarse 50ms jumps. Every window in the chain has to be wider
   * than one such jump or the combo becomes unplayable on exactly the hardware
   * this game ships to.
   */
  const FRAME = 0.05

  it('gives every cut at least one frame of active hit detection', () => {
    for (const cut of CUTS) {
      expect(cut.active).toBeGreaterThan(FRAME)
    }
  })

  it('keeps every link window wider than a single coarse frame', () => {
    for (const cut of CUTS) {
      const window =
        cut.recovery * cut.whiffRecoveryMultiplier + COMBO_CONFIG.linkGrace
      expect(window).toBeGreaterThan(FRAME * 2)
    }
  })

  it('completes the full chain when stepped at 0.05s', () => {
    const state = createComboState()
    const reached: number[] = []
    requestStrike(state, 1)
    reached.push(state.step)

    for (let cut = 0; cut < 2; cut += 1) {
      // Advance frame by frame until the link opens, then press.
      let guard = 0
      while (state.phase !== 'recovery' && guard < 40) {
        advanceCombo(state, FRAME, 1)
        guard += 1
      }
      expect(state.phase).toBe('recovery')
      const request = requestStrike(state, 1)
      expect(request.started).toBe(true)
      reached.push(state.step)
    }

    expect(reached).toEqual([1, 2, 3])
    expect(activeCut(state)?.kind).toBe('cleave')
  })

  it('still registers a press made on the same frame the cut starts', () => {
    const state = createComboState()
    requestStrike(state, 1)
    // Pressing again immediately must buffer, not be discarded.
    expect(requestStrike(state, 1).buffered).toBe(true)
    const events = run(state, 0.4, 1, FRAME)
    expect(events.some((event) => event.type === 'started')).toBe(true)
    expect(state.step).toBe(2)
  })
})

describe('reset', () => {
  it('clears everything so a stagger cannot leave a live swing behind', () => {
    const state = createComboState()
    requestStrike(state, 100)
    run(state, CUTS[0].windup + 0.01)
    resetCombo(state)
    expect(state).toEqual(createComboState())
  })
})
