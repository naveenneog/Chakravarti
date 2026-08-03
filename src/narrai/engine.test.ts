import { describe, expect, it } from 'vitest'
import {
  MAX_TURNS,
  actionForecast,
  createNarraiCampaign,
  determineEnding,
  isSpent,
  narraiReducer,
  replayNarrai,
} from './engine'
import {
  endingCopy,
  narraiActionOrder,
  narraiActions,
  narraiSources,
  survivingAccount,
} from './content'
import type { ActionId, NarraiCommand, NarraiState } from './types'

const begin = (): NarraiState =>
  narraiReducer(createNarraiCampaign(), { type: 'BEGIN_CAMPAIGN' })

const take = (state: NarraiState, actionId: ActionId) =>
  narraiReducer(state, { type: 'TAKE_ACTION', actionId })

const playOut = (script: ActionId[]): NarraiState => {
  let state = begin()
  for (const actionId of script) {
    state = take(state, actionId)
  }
  while (state.phase === 'campaign') {
    state = take(state, 'hold-defile')
  }
  return state
}

describe('setup', () => {
  it('opens outmatched, with a few bends to give', () => {
    const state = createNarraiCampaign()
    expect(state.phase).toBe('briefing')
    expect(state.resources.ground).toBe(4)
    expect(state.costImposed).toBe(0)
    expect(state.ending).toBeNull()
  })

  it('ignores actions before the defence forms up', () => {
    const state = createNarraiCampaign()
    expect(take(state, 'hold-defile')).toBe(state)
  })
})

describe('the trade', () => {
  it('makes holding expensive for both sides', () => {
    const state = begin()
    const held = take(state, 'hold-defile')
    expect(held.costImposed).toBeGreaterThan(state.costImposed)
    expect(held.resources.warriors).toBeLessThan(state.resources.warriors)
  })

  it('preserves the force when ground is given instead', () => {
    const state = begin()
    const gave = take(state, 'give-ground')
    expect(gave.resources.warriors).toBeGreaterThan(state.resources.warriors)
    expect(gave.resources.ground).toBe(state.resources.ground - 1)
  })

  it('spends a bend of ground to empty the villages', () => {
    const state = begin()
    const moved = take(state, 'evacuate')
    expect(moved.resources.sheltered).toBeGreaterThan(0)
    expect(moved.resources.ground).toBe(state.resources.ground - 1)
  })

  it('refuses to give ground that is not there', () => {
    let state = begin()
    state = { ...state, resources: { ...state.resources, ground: 0 } }
    const forecast = actionForecast(state, 'give-ground')
    expect(forecast.allowed).toBe(false)
    expect(forecast.reason).toMatch(/no ground left/i)
  })

  it('gates the night attack behind resolve', () => {
    let state = begin()
    state = { ...state, resources: { ...state.resources, resolve: 10 } }
    expect(actionForecast(state, 'night-attack').allowed).toBe(false)
  })

  it('gates the elephants behind having elephants', () => {
    let state = begin()
    state = { ...state, resources: { ...state.resources, elephants: 5 } }
    expect(actionForecast(state, 'elephants-forward').allowed).toBe(false)
  })

  it('allows the appeal for help exactly once, and it changes nothing but resolve', () => {
    let state = begin()
    const before = state.costImposed
    state = take(state, 'call-for-help')
    expect(state.costImposed).toBe(before)
    expect(actionForecast(state, 'call-for-help').allowed).toBe(false)
  })
})

describe('the ending', () => {
  it('offers no victory: every ending is a form of defeat', () => {
    for (const ending of Object.keys(endingCopy) as (keyof typeof endingCopy)[]) {
      const copy = endingCopy[ending]
      expect(copy.verdict).not.toMatch(/\bvictor|\bwon\b|\btriumph/i)
    }
  })

  it('scores a price paid and a people sheltered as the best outcome', () => {
    const state = determineEnding({
      ...createNarraiCampaign(),
      costImposed: 70,
      resources: {
        warriors: 10,
        elephants: 0,
        ground: 0,
        sheltered: 60,
        resolve: 20,
      },
    })
    expect(state).toBe('remembered')
  })

  it('separates a costly defence from a sheltered people', () => {
    const base = createNarraiCampaign()
    expect(
      determineEnding({
        ...base,
        costImposed: 70,
        resources: { ...base.resources, sheltered: 10 },
      }),
    ).toBe('costly')
    expect(
      determineEnding({
        ...base,
        costImposed: 10,
        resources: { ...base.resources, sheltered: 60 },
      }),
    ).toBe('sheltered')
  })

  it('is overrun when neither was achieved', () => {
    const base = createNarraiCampaign()
    expect(
      determineEnding({
        ...base,
        costImposed: 5,
        resources: { ...base.resources, sheltered: 0 },
      }),
    ).toBe('overrun')
  })

  it('ends when the last bend is gone', () => {
    const state = playOut([
      'give-ground',
      'give-ground',
      'give-ground',
      'give-ground',
    ])
    expect(isSpent(state)).toBe(true)
    expect(state.phase).toBe('epilogue')
  })

  it('ends after the last turn even with ground to spare', () => {
    const state = playOut([])
    expect(state.phase).toBe('epilogue')
    expect(state.turn).toBeLessThanOrEqual(MAX_TURNS)
    expect(state.ending).not.toBeNull()
  })

  it('reaches the best ending through a coherent line of play', () => {
    // Both axes at once is deliberately demanding: three of seven seasons must
    // go to moving people, and the rest must be spent making them pay.
    const state = playOut([
      'refuse-summons',
      'hold-defile',
      'evacuate',
      'night-attack',
      'evacuate',
      'elephants-forward',
      'evacuate',
    ])
    expect(state.costImposed).toBeGreaterThanOrEqual(55)
    expect(state.resources.sheltered).toBeGreaterThanOrEqual(50)
    expect(state.ending).toBe('remembered')
  })

  it('punishes spending every season fighting with nobody moved out', () => {
    const state = playOut([
      'hold-defile',
      'hold-defile',
      'hold-defile',
      'hold-defile',
    ])
    expect(state.resources.sheltered).toBe(0)
    expect(state.ending).toBe('costly')
  })

  it('ignores further actions once the epilogue is reached', () => {
    const state = playOut([])
    expect(take(state, 'hold-defile')).toBe(state)
  })
})

describe('the hostile record', () => {
  it('states plainly that no Gond account survives', () => {
    const absent = narraiSources.find((s) => s.id === 'no-gond-account')
    expect(absent?.detail).toMatch(/no contemporary gond/i)
  })

  it('keeps the surviving account short and self-serving', () => {
    // The whole point is the gap between what the player did and what is left.
    expect(survivingAccount.length).toBeLessThanOrEqual(5)
    expect(survivingAccount.join(' ')).toMatch(/imperial/i)
  })

  it('marks the queen\u2019s death as a single source with no independent account', () => {
    const death = narraiSources.find((s) => s.id === 'the-death')
    expect(death?.detail).toMatch(/no independent account/i)
    expect(death?.detail).toMatch(/never as a mechanic/i)
  })

  it('never exposes the death as a playable action', () => {
    for (const actionId of narraiActionOrder) {
      const action = narraiActions[actionId]
      expect(`${action.title} ${action.summary}`).not.toMatch(
        /own life|suicide|jauhar/i,
      )
    }
  })

  it('labels victor-side figures rather than using them as balance numbers', () => {
    const asymmetry = narraiSources.find((s) => s.id === 'asymmetry')
    expect(asymmetry?.detail).toMatch(/victor-side claims/i)
    expect(asymmetry?.detail).toMatch(/not use them as balance figures/i)
  })

  it('records for every deed whether the surviving account preserves it', () => {
    const sourceIds = new Set(narraiSources.map((s) => s.id))
    for (const actionId of narraiActionOrder) {
      const deed = narraiActions[actionId].deed
      expect(typeof deed.preserved).toBe('boolean')
      expect(sourceIds.has(deed.sourceId)).toBe(true)
    }
  })

  it('leaves most of what the defender did unpreserved', () => {
    const unpreserved = narraiActionOrder.filter(
      (id) => !narraiActions[id].deed.preserved,
    )
    expect(unpreserved.length).toBeGreaterThan(0)
  })
})

describe('determinism', () => {
  it('replays a command log to an identical state', () => {
    const commands: NarraiCommand[] = [
      { type: 'BEGIN_CAMPAIGN' },
      { type: 'TAKE_ACTION', actionId: 'refuse-summons' },
      { type: 'TAKE_ACTION', actionId: 'hold-defile' },
      { type: 'TAKE_ACTION', actionId: 'evacuate' },
    ]
    expect(replayNarrai(commands)).toEqual(replayNarrai(commands))
  })
})
