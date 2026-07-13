import { describe, expect, it } from 'vitest'
import {
  combinedPlanDelta,
  createActionFirstCampaign,
  createNandaCampaign,
  missionLaunchForecast,
  missionModifiersFor,
  nandaCampaignReducer,
  replayNandaCampaign,
  resolveNandaOutcome,
} from './engine'
import {
  clearNandaCampaign,
  loadNandaCampaign,
  NANDA_SAVE_KEY,
  saveNandaCampaign,
} from './persistence'
import type {
  MissionResult,
  NandaCampaignState,
  NandaCommand,
} from './types'

const planOperation = (state = createNandaCampaign()) => {
  const commands: NandaCommand[] = [
    { type: 'OPEN_PLANNING' },
    {
      type: 'SELECT_PLAN',
      category: 'intelligence',
      planId: 'watch-rotations',
    },
    {
      type: 'SELECT_PLAN',
      category: 'alliance',
      planId: 'guild-network',
    },
    {
      type: 'SELECT_PLAN',
      category: 'logistics',
      planId: 'hidden-caches',
    },
  ]
  return commands.reduce(nandaCampaignReducer, state)
}

const successfulResult = (
  state: NandaCampaignState,
): MissionResult => ({
  success: true,
  healthRemaining: 90,
  maxHealth: state.missionModifiers?.maxHealth ?? 100,
  guardsDefeated: 3,
  objectivesSecured: 2,
  requiredObjectives: 2,
  elapsedSeconds: 150,
  healingUsed: 1,
  routeLabel: 'untrusted client value',
})

describe('Fall of the Nandas campaign engine', () => {
  it('starts the product in a forgiving graphical action mission', () => {
    const state = createActionFirstCampaign(505)

    expect(state.phase).toBe('mission')
    expect(state.selectedPlans).toEqual({
      intelligence: 'watch-rotations',
      alliance: 'frontier-veterans',
      logistics: 'hidden-caches',
    })
    expect(state.missionModifiers).toMatchObject({
      maxHealth: 130,
      attackDamage: 42,
      enemyCount: 4,
      healingCharges: 2,
      revealObjectives: true,
    })
  })

  it('requires one preparation from every strategic category', () => {
    let state = createNandaCampaign(84)
    state = nandaCampaignReducer(state, { type: 'OPEN_PLANNING' })

    expect(missionLaunchForecast(state).allowed).toBe(false)

    state = planOperation(createNandaCampaign(84))
    expect(missionLaunchForecast(state).allowed).toBe(true)
    expect(combinedPlanDelta(state).treasury).toBe(-3)
  })

  it('turns strategy choices into materially different mission modifiers', () => {
    const prepared = planOperation()
    const modifiers = missionModifiersFor(prepared)

    expect(modifiers.enemyCount).toBe(5)
    expect(modifiers.revealObjectives).toBe(true)
    expect(modifiers.sideGateOpen).toBe(true)
    expect(modifiers.securedObjectives).toBe(1)
    expect(modifiers.maxHealth).toBe(130)
    expect(modifiers.healingCharges).toBe(2)
  })

  it('locks preparation costs when the mission begins', () => {
    const prepared = planOperation()
    const started = nandaCampaignReducer(prepared, {
      type: 'BEGIN_MISSION',
    })

    expect(started.phase).toBe('mission')
    expect(started.strategy.treasury).toBe(3)
    expect(started.strategy.popularSupport).toBe(6)
    expect(started.strategy.unrest).toBe(5)
    expect(started.missionModifiers).not.toBeNull()
  })

  it('sanitizes action results and resolves a disciplined success', () => {
    const started = nandaCampaignReducer(planOperation(), {
      type: 'BEGIN_MISSION',
    })
    const result = successfulResult(started)
    result.healthRemaining = 999
    result.guardsDefeated = 999
    const completed = nandaCampaignReducer(started, {
      type: 'COMPLETE_MISSION',
      result,
    })

    expect(completed.phase).toBe('debrief')
    expect(completed.outcome).toBe('coalition-entry')
    expect(completed.missionResult?.healthRemaining).toBe(130)
    expect(completed.missionResult?.guardsDefeated).toBe(5)
    expect(completed.missionResult?.routeLabel).toBe('Supplied courtyard route')
  })

  it('keeps withdrawal and costly entry as distinct outcomes', () => {
    const base: MissionResult = {
      success: true,
      healthRemaining: 20,
      maxHealth: 100,
      guardsDefeated: 2,
      objectivesSecured: 2,
      requiredObjectives: 2,
      elapsedSeconds: 200,
      healingUsed: 0,
      routeLabel: 'route',
    }

    expect(resolveNandaOutcome(base)).toBe('costly-entry')
    expect(resolveNandaOutcome({ ...base, success: false })).toBe('withdrawal')
  })

  it('replays the complete command log to the same strategic state', () => {
    const seed = 91
    const planned = planOperation(createNandaCampaign(seed))
    const started = nandaCampaignReducer(planned, { type: 'BEGIN_MISSION' })
    const commands: NandaCommand[] = [
      ...planned.events.map((event) => event.command),
      { type: 'BEGIN_MISSION' },
      {
        type: 'COMPLETE_MISSION',
        result: successfulResult(started),
      },
      { type: 'FINISH_DEBRIEF' },
    ]
    const played = commands.reduce(nandaCampaignReducer, createNandaCampaign(seed))
    const replayed = replayNandaCampaign(seed, commands)

    expect(replayed).toEqual(played)
    expect(replayed.phase).toBe('complete')
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

describe('Fall of the Nandas persistence', () => {
  it('round-trips a compatible campaign', () => {
    const storage = new MemoryStorage()
    const state = planOperation(createNandaCampaign(55))

    saveNandaCampaign(state, storage)

    expect(loadNandaCampaign(storage).state).toEqual(state)
  })

  it('backs up unreadable saves and starts safely', () => {
    const storage = new MemoryStorage()
    storage.setItem(NANDA_SAVE_KEY, '{broken')

    const loaded = loadNandaCampaign(storage)

    expect(loaded.warning).toContain('unreadable')
    expect(loaded.state.campaignId).toBe('fall-of-nandas')
    expect(loaded.state.phase).toBe('mission')
    expect(storage.getItem(NANDA_SAVE_KEY)).toBeNull()
    clearNandaCampaign(storage)
  })

  it('backs up structurally invalid plan selections', () => {
    const storage = new MemoryStorage()
    const invalid = {
      ...createActionFirstCampaign(),
      phase: 'planning',
      missionModifiers: null,
      selectedPlans: {
        intelligence: 'unknown-network',
        alliance: null,
        logistics: null,
      },
    }
    storage.setItem(NANDA_SAVE_KEY, JSON.stringify(invalid))

    const loaded = loadNandaCampaign(storage)

    expect(loaded.warning).toContain('incompatible')
    expect(loaded.state.phase).toBe('mission')
    expect(loaded.state.selectedPlans.intelligence).toBe('watch-rotations')
  })
})
