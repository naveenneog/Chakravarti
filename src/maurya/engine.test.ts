import { describe, expect, it } from 'vitest'
import {
  buildingForecast,
  createMauryaCampaign,
  determineEnding,
  formationForecast,
  mauryaCampaignReducer,
  replayCampaign,
  resolveWarResult,
} from './engine'
import {
  clearMauryaCampaign,
  loadMauryaCampaign,
  MAURYA_SAVE_KEY,
  saveMauryaCampaign,
} from './persistence'
import type {
  CampaignCommand,
  CampaignState,
  Formation,
} from './types'

const chooseSeason = (
  state: CampaignState,
  optionId: string,
): CampaignState => {
  const opened = mauryaCampaignReducer(state, { type: 'OPEN_COUNCIL' })
  const chosen = mauryaCampaignReducer(opened, {
    type: 'CHOOSE_COUNCIL',
    debateId: opened.pendingDebateId ?? '',
    optionId,
  })
  return mauryaCampaignReducer(chosen, { type: 'ADVANCE_SEASON' })
}

describe('Mauryan Rise campaign engine', () => {
  it('starts as a bounded six-season deterministic campaign', () => {
    const state = createMauryaCampaign(77)

    expect(state.seed).toBe(77)
    expect(state.phase).toBe('planning')
    expect(state.maxSeasons).toBe(6)
    expect(state.army).toEqual({
      infantry: 2,
      archers: 1,
      cavalry: 0,
      elephants: 0,
    })
  })

  it('allows only one affordable construction project per season', () => {
    const initial = createMauryaCampaign()
    const built = mauryaCampaignReducer(initial, {
      type: 'BUILD',
      building: 'farm',
    })
    const ignored = mauryaCampaignReducer(built, {
      type: 'BUILD',
      building: 'market',
    })

    expect(built.buildings.farm).toBe(1)
    expect(buildingForecast(built, 'market').allowed).toBe(false)
    expect(ignored).toBe(built)
  })

  it('keeps advanced units gated by support buildings and legitimacy', () => {
    const initial = createMauryaCampaign()

    expect(
      mauryaCampaignReducer(initial, {
        type: 'RECRUIT',
        unit: 'elephants',
      }),
    ).toBe(initial)
  })

  it('applies barracks readiness during seasonal resolution', () => {
    let state = mauryaCampaignReducer(createMauryaCampaign(), {
      type: 'BUILD',
      building: 'barracks',
    })
    state = chooseSeason(state, 'secure-stores')

    expect(state.readiness).toBe(6)
  })

  it('fixes the war result before animation completion', () => {
    let state = createMauryaCampaign()
    state = {
      ...state,
      phase: 'war-planning',
      army: { infantry: 3, archers: 2, cavalry: 1, elephants: 0 },
      buildings: { ...state.buildings, fort: 1, barracks: 1, market: 1 },
      readiness: 9,
      threat: 4,
    }
    const formation: Formation = 'cavalry-flank'
    state = mauryaCampaignReducer(state, {
      type: 'SET_FORMATION',
      formation,
    })
    const expected = resolveWarResult(state, formation)
    const started = mauryaCampaignReducer(state, { type: 'BEGIN_WAR' })

    expect(formationForecast(state, formation).allowed).toBe(true)
    expect(started.phase).toBe('war')
    expect(started.warResult).toBe(expected)
    expect(
      mauryaCampaignReducer(started, { type: 'COMPLETE_WAR' }).warResult,
    ).toBe(expected)
  })

  it('replays an ordered command log to the same state', () => {
    const commands: CampaignCommand[] = [
      { type: 'BUILD', building: 'farm' },
      { type: 'RECRUIT', unit: 'infantry' },
      { type: 'OPEN_COUNCIL' },
      {
        type: 'CHOOSE_COUNCIL',
        debateId: 'grain-and-momentum',
        optionId: 'secure-stores',
      },
      { type: 'ADVANCE_SEASON' },
    ]
    const played = commands.reduce(
      mauryaCampaignReducer,
      createMauryaCampaign(91),
    )
    const replayed = replayCampaign(91, commands)

    expect(replayed).toEqual(played)
  })

  it('can reach each of the three ending predicates', () => {
    const base = createMauryaCampaign()

    expect(
      determineEnding({
        ...base,
        resources: { food: 8, treasury: 4, legitimacy: 9 },
        threat: 2,
      }),
    ).toBe('steward-of-magadh')
    expect(
      determineEnding({
        ...base,
        resources: { food: 2, treasury: 8, legitimacy: 4 },
        readiness: 12,
      }),
    ).toBe('sword-without-granary')
    expect(determineEnding(base)).toBe('fragile-mandala')
  })

  it('completes six seasons without a resource soft lock', () => {
    let state = createMauryaCampaign()
    state = chooseSeason(state, 'secure-stores')
    state = chooseSeason(state, 'open-envoys')
    state = chooseSeason(state, 'fortify-crossings')
    state = {
      ...state,
      phase: 'war-planning',
    }
    state = mauryaCampaignReducer(state, { type: 'BEGIN_WAR' })
    state = mauryaCampaignReducer(state, { type: 'COMPLETE_WAR' })
    state = chooseSeason(state, 'retain-local-officers')
    state = chooseSeason(state, 'reduce-campaign-burden')
    state = chooseSeason(state, 'settlement')

    expect(state.phase).toBe('complete')
    expect(state.ending).not.toBeNull()
    expect(state.resources.food).toBeGreaterThanOrEqual(0)
    expect(state.resources.treasury).toBeGreaterThanOrEqual(0)
  })
})

class MemoryStorage {
  private values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

describe('Mauryan Rise persistence', () => {
  it('round-trips a compatible campaign', () => {
    const storage = new MemoryStorage()
    const state = createMauryaCampaign(45)

    saveMauryaCampaign(state, storage)

    expect(loadMauryaCampaign(storage).state).toEqual(state)
  })

  it('backs up corrupt saves and starts safely', () => {
    const storage = new MemoryStorage()
    storage.setItem(MAURYA_SAVE_KEY, '{bad json')

    const loaded = loadMauryaCampaign(storage)

    expect(loaded.warning).toContain('unreadable')
    expect(loaded.state.campaignId).toBe('mauryan-rise')
    expect(storage.getItem(MAURYA_SAVE_KEY)).toBeNull()
    clearMauryaCampaign(storage)
  })

  it('backs up structurally incompatible saves', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      MAURYA_SAVE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        contentVersion: '0.3.0',
        campaignId: 'mauryan-rise',
      }),
    )

    const loaded = loadMauryaCampaign(storage)

    expect(loaded.warning).toContain('incompatible')
    expect(loaded.state.season).toBe(1)
  })
})
