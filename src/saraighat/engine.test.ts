import { describe, expect, it } from 'vitest'
import {
  MAX_TURNS,
  actionForecast,
  createSaraighatCampaign,
  decideGround,
  replaySaraighat,
  resolveBattle,
  saraighatReducer,
} from './engine'
import {
  saraighatActionOrder,
  saraighatActions,
  saraighatSources,
} from './content'
import type { ActionId, SaraighatCommand, SaraighatState } from './types'

const begin = (): SaraighatState =>
  saraighatReducer(createSaraighatCampaign(), { type: 'BEGIN_CAMPAIGN' })

const take = (state: SaraighatState, actionId: ActionId) =>
  saraighatReducer(state, { type: 'TAKE_ACTION', actionId })

const playOut = (script: ActionId[]): SaraighatState => {
  let state = begin()
  for (const actionId of script) {
    state = take(state, actionId)
  }
  while (state.phase === 'campaign') {
    state = take(state, 'guerrilla-raids')
  }
  return state
}

describe('setup', () => {
  it('opens depleted, in the year the campaign began', () => {
    const state = createSaraighatCampaign()
    expect(state.phase).toBe('briefing')
    expect(state.year).toBe(1667)
    expect(state.resources.embankments).toBe(0)
    expect(state.ending).toBeNull()
    expect(state.record).toEqual([])
  })

  it('ignores actions before the campaign opens', () => {
    const state = createSaraighatCampaign()
    expect(take(state, 'rebuild-khels')).toBe(state)
  })
})

describe('choosing the ground', () => {
  it('defaults to the open field with nothing prepared', () => {
    expect(decideGround(begin())).toBe('open-field')
  })

  it('reaches the hills once the earthworks are begun', () => {
    let state = begin()
    state = take(state, 'raise-embankments')
    expect(decideGround(state)).toBe('guwahati-hills')
  })

  it('earns the narrows only with the land shut AND a river force', () => {
    let state = begin()
    state = take(state, 'rebuild-khels')
    state = take(state, 'rebuild-khels')
    state = take(state, 'raise-embankments')
    state = take(state, 'raise-embankments')
    state = take(state, 'raise-embankments')
    // The land is shut, but there is nothing to fight on the water with.
    expect(state.resources.embankments).toBeGreaterThanOrEqual(55)
    expect(state.resources.riverCraft).toBeLessThan(40)
    expect(decideGround(state)).toBe('guwahati-hills')

    state = take(state, 'build-boats')
    state = take(state, 'build-boats')
    expect(state.resources.riverCraft).toBeGreaterThanOrEqual(40)
    expect(decideGround(state)).toBe('saraighat-narrows')
  })

  it('cannot lay down boats without men on the rolls', () => {
    // Earthworks consume manpower, so digging first and recruiting later is a
    // trap the player has to notice.
    let state = begin()
    state = take(state, 'raise-embankments')
    state = take(state, 'raise-embankments')
    state = take(state, 'raise-embankments')
    expect(actionForecast(state, 'build-boats').allowed).toBe(false)
  })

  it('throws the whole arrangement away if open battle is accepted', () => {
    let state = begin()
    state = take(state, 'rebuild-khels')
    state = take(state, 'rebuild-khels')
    state = take(state, 'raise-embankments')
    state = take(state, 'raise-embankments')
    state = take(state, 'raise-embankments')
    state = take(state, 'build-boats')
    state = take(state, 'build-boats')
    expect(decideGround(state)).toBe('saraighat-narrows')
    // decideGround is pure, so the reversal can be checked without spending a turn.
    expect(
      decideGround({
        ...state,
        usedActions: [...state.usedActions, 'accept-open-battle'],
      }),
    ).toBe('open-field')
  })
})

describe('action gating', () => {
  it('needs men on the rolls before boats can be laid down', () => {
    const state = begin()
    const forecast = actionForecast(state, 'build-boats')
    expect(forecast.allowed).toBe(false)
    expect(forecast.reason).toMatch(/manpower/)
    expect(take(state, 'build-boats')).toBe(state)
  })

  it('unlocks boats once the khels are rebuilt', () => {
    let state = begin()
    state = take(state, 'rebuild-khels')
    expect(actionForecast(state, 'build-boats').allowed).toBe(true)
  })

  it('allows a once-only action exactly once', () => {
    let state = begin()
    state = take(state, 'renew-alliances')
    expect(actionForecast(state, 'renew-alliances').allowed).toBe(false)
    expect(take(state, 'renew-alliances')).toBe(state)
  })
})

describe('imperial pressure', () => {
  it('rises every season on its own', () => {
    const state = begin()
    const next = take(state, 'rebuild-khels')
    expect(next.mughalPressure).toBeGreaterThan(state.mughalPressure)
  })

  it('is bought down by negotiating in bad faith', () => {
    const state = begin()
    const talked = take(state, 'sham-negotiation')
    const worked = take(state, 'rebuild-khels')
    expect(talked.mughalPressure).toBeLessThan(worked.mughalPressure)
  })

  it('forces the decision early if it reaches its limit', () => {
    let state = begin()
    state = { ...state, mughalPressure: 95 }
    state = take(state, 'rebuild-khels')
    expect(state.phase).toBe('debrief')
    expect(state.turn).toBeLessThan(MAX_TURNS)
  })
})

describe('the decisive engagement', () => {
  it('holds the river when the narrows are properly prepared', () => {
    const state = playOut([
      'rebuild-khels',
      'rebuild-khels',
      'raise-embankments',
      'raise-embankments',
      'raise-embankments',
      'build-boats',
      'build-boats',
      'renew-alliances',
    ])
    expect(state.battle?.ground).toBe('saraighat-narrows')
    expect(state.ending).toBe('river-holds')
  })

  it('loses Guwahati when the open field is accepted', () => {
    const state = playOut([
      'rebuild-khels',
      'rebuild-khels',
      'raise-embankments',
      'raise-embankments',
      'raise-embankments',
      'build-boats',
      'build-boats',
      'accept-open-battle',
    ])
    expect(state.battle?.ground).toBe('open-field')
    expect(state.ending).toBe('guwahati-falls')
  })

  it('loses Guwahati when nothing is prepared at all', () => {
    const state = playOut(['sham-negotiation', 'sham-negotiation'])
    expect(state.battle?.ground).toBe('open-field')
    expect(state.ending).toBe('guwahati-falls')
  })

  it('lets the ground decide how much of each army can be used', () => {
    const prepared = playOut([
      'rebuild-khels',
      'rebuild-khels',
      'raise-embankments',
      'raise-embankments',
      'raise-embankments',
      'build-boats',
      'build-boats',
      'renew-alliances',
    ])
    // The same army on the wrong ground faces a far stronger enemy.
    const openField = resolveBattle({
      ...prepared,
      usedActions: [...prepared.usedActions, 'accept-open-battle'],
    })
    expect(openField.mughalStrength).toBeGreaterThan(
      prepared.battle!.mughalStrength,
    )
    expect(openField.ahomStrength).toBeLessThan(prepared.battle!.ahomStrength)
  })

  it('narrates the reason the ground mattered', () => {
    const state = playOut([
      'rebuild-khels',
      'rebuild-khels',
      'raise-embankments',
      'raise-embankments',
      'raise-embankments',
      'build-boats',
      'build-boats',
    ])
    expect(state.battle?.lines[0]).toMatch(/narrows|land approach/i)
  })
})

describe('accepting terms', () => {
  it('ends the campaign without a battle', () => {
    const state = saraighatReducer(begin(), { type: 'ACCEPT_TERMS' })
    expect(state.phase).toBe('debrief')
    expect(state.ending).toBe('terms-accepted')
    expect(state.battle).toBeNull()
  })

  it('cannot be taken after the campaign has resolved', () => {
    const finished = playOut([])
    expect(saraighatReducer(finished, { type: 'ACCEPT_TERMS' })).toBe(finished)
  })
})

describe('the two-tradition record', () => {
  it('adds an entry for every season played', () => {
    let state = begin()
    state = take(state, 'rebuild-khels')
    state = take(state, 'raise-embankments')
    expect(state.record).toHaveLength(2)
  })

  it('gives every action both traditions and a cited source', () => {
    const sourceIds = new Set(saraighatSources.map((s) => s.id))
    for (const actionId of saraighatActionOrder) {
      const c = saraighatActions[actionId].corroboration
      expect(c.buranji.length).toBeGreaterThan(20)
      expect(c.mughal.length).toBeGreaterThan(20)
      expect(sourceIds.has(c.sourceId)).toBe(true)
      expect(c.label).toBeTruthy()
    }
  })

  it('treats the buranjis as a source tradition in their own right', () => {
    const buranji = saraighatSources.find((s) => s.id === 'buranji-tradition')
    expect(buranji?.detail).toMatch(/not folklore/i)
  })

  it('marks the transmitted quotation as chronicle tradition, not transcript', () => {
    const illness = saraighatSources.find((s) => s.id === 'lachit-illness')
    expect(illness?.detail).toMatch(/transmitted, not contemporary transcript/i)
  })
})

describe('determinism', () => {
  it('replays a command log to an identical state', () => {
    const commands: SaraighatCommand[] = [
      { type: 'BEGIN_CAMPAIGN' },
      { type: 'TAKE_ACTION', actionId: 'rebuild-khels' },
      { type: 'TAKE_ACTION', actionId: 'raise-embankments' },
      { type: 'TAKE_ACTION', actionId: 'build-boats' },
      { type: 'TAKE_ACTION', actionId: 'sham-negotiation' },
    ]
    expect(replaySaraighat(commands)).toEqual(replaySaraighat(commands))
  })
})
