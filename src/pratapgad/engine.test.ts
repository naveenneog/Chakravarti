import { describe, expect, it } from 'vitest'
import {
  MAX_TURNS,
  READINESS_KEYS,
  actionForecast,
  assessReadiness,
  createPratapgadCampaign,
  pratapgadReducer,
  replayPratapgad,
} from './engine'
import {
  disputedPoints,
  endingCopy,
  pratapgadActionOrder,
  pratapgadActions,
  pratapgadSources,
} from './content'
import type { ActionId, PratapgadCommand, PratapgadState } from './types'

const begin = (): PratapgadState =>
  pratapgadReducer(createPratapgadCampaign(), { type: 'BEGIN_PREPARATION' })

const take = (state: PratapgadState, actionId: ActionId) =>
  pratapgadReducer(state, { type: 'TAKE_ACTION', actionId })

const playOut = (script: ActionId[]): PratapgadState => {
  let state = begin()
  for (const actionId of script) {
    state = take(state, actionId)
  }
  if (state.phase === 'preparation') {
    state = pratapgadReducer(state, { type: 'COMMIT' })
  }
  return state
}

describe('setup', () => {
  it('opens with nothing arranged', () => {
    const state = createPratapgadCampaign()
    expect(state.phase).toBe('briefing')
    for (const key of READINESS_KEYS) {
      expect(state.resources[key]).toBe(0)
    }
  })

  it('ignores actions before preparation begins', () => {
    const state = createPratapgadCampaign()
    expect(take(state, 'scout-approach')).toBe(state)
  })
})

describe('the chapter never lets the player fight', () => {
  it('exposes no action that strikes, kills or attacks', () => {
    for (const actionId of pratapgadActionOrder) {
      const action = pratapgadActions[actionId]
      const text = `${action.id} ${action.title} ${action.summary} ${action.rationale}`
      expect(text).not.toMatch(/\battack\b|\bstrike\b|\bkill\b|\bassassinat/i)
    }
  })

  it('never names the opposing commander as a target', () => {
    const everything = pratapgadActionOrder
      .map((id) => JSON.stringify(pratapgadActions[id]))
      .join(' ')
    expect(everything).not.toMatch(/afzal/i)
  })

  it('has no combat resolution at all: readiness is the only outcome', () => {
    const state = playOut(['scout-approach'])
    expect(state.ending).toBeTruthy()
    // No health, no casualties, no enemy strength anywhere in the state.
    expect(JSON.stringify(state)).not.toMatch(/health|casualt|enemyStrength/i)
  })
})

describe('arranging the ground', () => {
  it('requires knowing the ground before placing anything on it', () => {
    const state = begin()
    expect(actionForecast(state, 'place-lookouts').allowed).toBe(false)
    expect(actionForecast(state, 'conceal-reserve').allowed).toBe(false)
    const scouted = take(state, 'scout-approach')
    expect(actionForecast(scouted, 'place-lookouts').allowed).toBe(true)
  })

  it('requires observation before a signal chain is worth laying', () => {
    let state = begin()
    state = take(state, 'scout-approach')
    expect(actionForecast(state, 'lay-signal-line').allowed).toBe(false)
    state = take(state, 'place-lookouts')
    expect(actionForecast(state, 'lay-signal-line').allowed).toBe(true)
  })

  it('allows the meeting ground to be prepared exactly once', () => {
    let state = begin()
    state = take(state, 'clear-the-ground')
    expect(actionForecast(state, 'clear-the-ground').allowed).toBe(false)
  })

  it('records a preparation entry for every action taken', () => {
    let state = begin()
    state = take(state, 'scout-approach')
    state = take(state, 'hold-withdrawal')
    expect(state.preparations).toHaveLength(2)
  })
})

describe('readiness', () => {
  it('is gated on the weakest element, not the average', () => {
    const base = createPratapgadCampaign()
    // A high average with one element at zero must not read as ready: a plan in
    // broken country fails at its weakest link rather than averaging out.
    const lopsided = assessReadiness({
      ...base,
      resources: {
        intelligence: 100,
        lookouts: 100,
        reserve: 100,
        signal: 100,
        withdrawal: 0,
      },
    })
    expect(lopsided.score).toBeGreaterThan(55)
    expect(lopsided.weakest).toBe('withdrawal')
    expect(lopsided.ending).not.toBe('ground-prepared')
  })

  it('rescales the displayed percentage against what is achievable', () => {
    const base = createPratapgadCampaign()
    // A fully prepared ground should not read as "35 out of 100" to a player.
    const prepared = assessReadiness({
      ...base,
      resources: {
        intelligence: 36,
        lookouts: 36,
        reserve: 30,
        signal: 40,
        withdrawal: 32,
      },
    })
    expect(prepared.ending).toBe('ground-prepared')
    expect(prepared.percent).toBeGreaterThan(75)
    expect(prepared.percent).toBeLessThanOrEqual(100)
  })

  it('names the weakest element', () => {
    const base = createPratapgadCampaign()
    const assessed = assessReadiness({
      ...base,
      resources: {
        intelligence: 50,
        lookouts: 50,
        reserve: 10,
        signal: 50,
        withdrawal: 50,
      },
    })
    expect(assessed.weakest).toBe('reserve')
  })

  it('reaches a fully prepared ground through a coherent line', () => {
    const state = playOut([
      'scout-approach',
      'place-lookouts',
      'conceal-reserve',
      'lay-signal-line',
      'hold-withdrawal',
      'clear-the-ground',
    ])
    expect(state.ending).toBe('ground-prepared')
  })

  it('is exposed when almost nothing is arranged', () => {
    const state = playOut(['send-envoy'])
    expect(state.ending).toBe('exposed')
  })

  it('narrates each element specifically', () => {
    const prepared = assessReadiness({
      ...createPratapgadCampaign(),
      resources: {
        intelligence: 60,
        lookouts: 60,
        reserve: 60,
        signal: 60,
        withdrawal: 60,
      },
    })
    expect(prepared.lines).toHaveLength(4)
    expect(prepared.lines.join(' ')).toMatch(/watchers/i)
  })

  it('ends after the last turn even without committing', () => {
    const state = playOut([
      'scout-approach',
      'send-envoy',
      'send-envoy',
      'send-envoy',
      'send-envoy',
      'send-envoy',
    ])
    expect(state.phase).toBe('aftermath')
    expect(state.turn).toBeLessThanOrEqual(MAX_TURNS)
  })

  it('can be committed early', () => {
    const state = pratapgadReducer(begin(), { type: 'COMMIT' })
    expect(state.phase).toBe('aftermath')
  })

  it('ignores further actions after the aftermath', () => {
    const state = playOut(['scout-approach'])
    expect(take(state, 'place-lookouts')).toBe(state)
  })
})

describe('the irreconcilable record', () => {
  it('presents the central question without answering it', () => {
    const first = disputedPoints.find((p) => p.id === 'who-struck-first')
    expect(first).toBeDefined()
    expect(first!.accounts.length).toBeGreaterThanOrEqual(2)
    expect(first!.unresolved).toMatch(/cannot be settled/i)
  })

  it('gives every disputed point at least two traditions and a reason it is open', () => {
    for (const point of disputedPoints) {
      expect(point.accounts.length).toBeGreaterThanOrEqual(2)
      expect(point.unresolved.length).toBeGreaterThan(40)
    }
  })

  it('never asserts a verdict on who struck first anywhere in the copy', () => {
    const copy = [
      ...Object.values(endingCopy).map((c) => `${c.title} ${c.verdict} ${c.summary}`),
      ...pratapgadSources.map((s) => s.detail),
    ].join(' ')
    // The endings turn on the player's preparation, never on the disputed act.
    expect(copy).not.toMatch(/struck first was|in fact attacked|truth is that/i)
  })

  it('uses no chronicle numbers as game quantities', () => {
    const numbers = disputedPoints.find((p) => p.id === 'numbers')
    expect(numbers?.unresolved).toMatch(/uses none of them as game quantities/i)
  })

  it('labels the bakhar tradition as late and literary', () => {
    const bakhar = pratapgadSources.find((s) => s.id === 'bakhar-tradition')
    expect(bakhar?.detail).toMatch(/late, literary/i)
  })

  it('describes the episode as contested up front', () => {
    const contested = pratapgadSources.find((s) => s.id === 'contested-event')
    expect(contested?.detail).toMatch(/does not choose between them/i)
  })
})

describe('determinism', () => {
  it('replays a command log to an identical state', () => {
    const commands: PratapgadCommand[] = [
      { type: 'BEGIN_PREPARATION' },
      { type: 'TAKE_ACTION', actionId: 'scout-approach' },
      { type: 'TAKE_ACTION', actionId: 'place-lookouts' },
      { type: 'COMMIT' },
    ]
    expect(replayPratapgad(commands)).toEqual(replayPratapgad(commands))
  })
})
