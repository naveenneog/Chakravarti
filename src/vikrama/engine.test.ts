import { describe, expect, it } from 'vitest'
import {
  MAX_TURNS,
  YEARS_PER_TURN,
  actionForecast,
  advanceCoinage,
  createVikramaCampaign,
  determineEnding,
  durableArtifacts,
  guptaYearToCe,
  replayCampaign,
  vikramaCampaignReducer,
} from './engine'
import { vikramaActionOrder, vikramaActions, vikramaSources } from './content'
import type { ActionId, VikramaCommand, VikramaState } from './types'

const begin = (): VikramaState =>
  vikramaCampaignReducer(createVikramaCampaign(), { type: 'BEGIN_CAMPAIGN' })

const take = (state: VikramaState, actionId: ActionId) =>
  vikramaCampaignReducer(state, { type: 'TAKE_ACTION', actionId })

/** Play a whole campaign from a script, padding with a legal filler action. */
const playOut = (script: ActionId[]): VikramaState => {
  let state = begin()
  for (const actionId of script) {
    state = take(state, actionId)
  }
  while (state.phase === 'campaign') {
    state = take(state, 'winter-court')
  }
  return state
}

describe('campaign setup', () => {
  it('opens in the briefing with Kshatrapa silver dominant', () => {
    const state = createVikramaCampaign()
    expect(state.phase).toBe('briefing')
    expect(state.coinage.kshatrapa).toBeGreaterThan(80)
    expect(state.coinage.gupta).toBe(0)
    expect(state.evidence).toEqual([])
    expect(state.ending).toBeNull()
  })

  it('converts Gupta era years to the Common Era for display', () => {
    // The Udayagiri inscription is GE 82, conventionally c. 401-402 CE.
    expect(guptaYearToCe(82)).toBe(402)
    expect(guptaYearToCe(93)).toBe(413)
  })

  it('ignores actions before the campaign has begun', () => {
    const state = createVikramaCampaign()
    expect(take(state, 'malwa-road')).toBe(state)
  })

  it('begins the campaign exactly once', () => {
    const started = begin()
    expect(started.phase).toBe('campaign')
    expect(started.turn).toBe(1)
    expect(
      vikramaCampaignReducer(started, { type: 'BEGIN_CAMPAIGN' }),
    ).toBe(started)
  })
})

describe('action gating', () => {
  it('blocks minting until the army can reach the province', () => {
    const state = begin()
    const forecast = actionForecast(state, 'strike-silver')
    expect(forecast.allowed).toBe(false)
    expect(forecast.reason).toMatch(/reach/)
    expect(take(state, 'strike-silver')).toBe(state)
  })

  it('unlocks minting once reach is established', () => {
    let state = begin()
    state = take(state, 'malwa-road')
    state = take(state, 'malwa-road')
    expect(actionForecast(state, 'strike-silver').allowed).toBe(true)
  })

  it('allows a once-only action exactly once', () => {
    let state = begin()
    expect(actionForecast(state, 'vakataka-marriage').allowed).toBe(true)
    state = take(state, 'vakataka-marriage')
    expect(state.usedActions).toContain('vakataka-marriage')
    const forecast = actionForecast(state, 'vakataka-marriage')
    expect(forecast.allowed).toBe(false)
    expect(forecast.reason).toMatch(/again/)
    const blocked = take(state, 'vakataka-marriage')
    expect(blocked).toBe(state)
  })

  it('keeps repeatable actions repeatable', () => {
    let state = begin()
    const before = state.turn
    state = take(state, 'winter-court')
    state = take(state, 'winter-court')
    expect(state.turn).toBe(before + 2)
  })
})

describe('resources and time', () => {
  it('advances the year by a fixed span each turn', () => {
    const state = begin()
    const next = take(state, 'winter-court')
    expect(next.guptaYear).toBe(state.guptaYear + YEARS_PER_TURN)
  })

  it('clamps every resource to 0..100', () => {
    let state = begin()
    for (let i = 0; i < 12; i += 1) {
      state = { ...state, phase: 'campaign', turn: 1 }
      state = take(state, 'hold-ports')
    }
    for (const value of Object.values(state.resources)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  })

  it('never lets a coinage share leave 0..100', () => {
    const shares = advanceCoinage(
      { kshatrapa: 4, gupta: 98 },
      { treasury: 50, legitimacy: 50, alliance: 50, reach: 99, acceptance: 99 },
      { kshatrapa: -60, gupta: 60 },
    )
    expect(shares.kshatrapa).toBeGreaterThanOrEqual(0)
    expect(shares.gupta).toBeLessThanOrEqual(100)
  })
})

describe('the coinage handover', () => {
  it('needs acceptance, not just a mint, to displace the old silver', () => {
    const base = {
      treasury: 50,
      legitimacy: 50,
      alliance: 50,
      reach: 60,
      acceptance: 5,
    }
    const resisted = advanceCoinage({ kshatrapa: 80, gupta: 0 }, base, {
      kshatrapa: -22,
      gupta: 26,
    })
    const welcomed = advanceCoinage(
      { kshatrapa: 80, gupta: 0 },
      { ...base, acceptance: 90 },
      { kshatrapa: -22, gupta: 26 },
    )
    expect(welcomed.gupta).toBeGreaterThan(resisted.gupta)
  })

  it('lets an unsupported coinage decay once the province is genuinely held', () => {
    const held = advanceCoinage(
      { kshatrapa: 80, gupta: 0 },
      { treasury: 50, legitimacy: 50, alliance: 50, reach: 80, acceptance: 40 },
    )
    expect(held.kshatrapa).toBeLessThan(80)
  })

  it('leaves the old coinage untouched while reach is negligible', () => {
    const untouched = advanceCoinage(
      { kshatrapa: 80, gupta: 0 },
      { treasury: 50, legitimacy: 50, alliance: 50, reach: 10, acceptance: 40 },
    )
    expect(untouched.kshatrapa).toBe(80)
  })
})

describe('the evidence ledger', () => {
  it('records an artifact dated to the year the action was taken', () => {
    let state = begin()
    const year = state.guptaYear
    state = take(state, 'vakataka-marriage')
    const artifact = state.evidence.at(-1)
    expect(artifact?.id).toBe('vakataka-charters')
    expect(artifact?.guptaYear).toBe(year)
  })

  it('records marches and idle seasons as pointed absences', () => {
    let state = begin()
    state = take(state, 'malwa-road')
    state = take(state, 'winter-court')
    expect(state.evidence.map((a) => a.kind)).toEqual(['absence', 'absence'])
    expect(durableArtifacts(state.evidence)).toHaveLength(0)
  })

  it('separates durable artifacts from absences', () => {
    let state = begin()
    state = take(state, 'malwa-road')
    state = take(state, 'vakataka-marriage')
    expect(state.evidence).toHaveLength(2)
    expect(durableArtifacts(state.evidence)).toHaveLength(1)
  })

  it('labels and cites every artifact the campaign can produce', () => {
    const sourceIds = new Set(vikramaSources.map((source) => source.id))
    for (const actionId of vikramaActionOrder) {
      const artifact = vikramaActions[actionId].artifact
      expect(artifact, `${actionId} must declare what it leaves`).toBeDefined()
      expect(sourceIds.has(artifact!.sourceId)).toBe(true)
      expect(artifact!.label).toBeTruthy()
    }
  })

  it('cites a real source on every action, not just every artifact', () => {
    const sourceIds = new Set(vikramaSources.map((source) => source.id))
    for (const actionId of vikramaActionOrder) {
      expect(sourceIds.has(vikramaActions[actionId].evidence.sourceId)).toBe(
        true,
      )
    }
  })

  it('never puts a real historical year in an artifact title', () => {
    // Artifacts are dated by the player's own reign, which is reconstruction.
    // Asserting a real regnal year in the title would display two conflicting
    // dates for the same object; real dates belong in the source records.
    for (const actionId of vikramaActionOrder) {
      const artifact = vikramaActions[actionId].artifact!
      expect(artifact.title).not.toMatch(/\d{3}/)
      expect(artifact.title).not.toMatch(/Gupta year/i)
    }
  })

  it('keeps the real inscription dates in the source records', () => {
    const udayagiri = vikramaSources.find((s) => s.id === 'udayagiri-virasena')
    const sanchi = vikramaSources.find((s) => s.id === 'sanchi-amrakardava')
    expect(udayagiri?.detail).toMatch(/82/)
    expect(sanchi?.detail).toMatch(/93/)
  })
})

describe('endings', () => {
  it('ends the campaign after the last turn and opens the dossier', () => {
    const state = playOut([])
    expect(state.phase).toBe('dossier')
    expect(state.ending).not.toBeNull()
    expect(state.events.filter((e) => e.command.type === 'TAKE_ACTION')).toHaveLength(
      MAX_TURNS,
    )
  })

  it('absorbs the west when the coinage actually changes hands', () => {
    const state = playOut([
      'malwa-road',
      'malwa-road',
      'hold-ports',
      'strike-silver',
      'confirm-officers',
      'strike-silver',
      'strike-silver',
      'strike-silver',
    ])
    expect(state.ending).toBe('absorbed-west')
    expect(state.coinage.kshatrapa).toBeLessThanOrEqual(20)
    expect(state.coinage.gupta).toBeGreaterThanOrEqual(45)
  })

  it('leaves a hollow conquest when the ground is held but nothing is minted', () => {
    const state = playOut([
      'malwa-road',
      'malwa-road',
      'malwa-road',
      'hold-ports',
      'hold-ports',
    ])
    expect(state.ending).toBe('hollow-conquest')
    expect(durableArtifacts(state.evidence)).toHaveLength(0)
  })

  it('calls overreach when the treasury or standing collapses', () => {
    const broke = determineEnding({
      ...createVikramaCampaign(),
      resources: {
        treasury: 4,
        legitimacy: 60,
        alliance: 40,
        reach: 70,
        acceptance: 70,
      },
      coinage: { kshatrapa: 5, gupta: 70 },
    })
    expect(broke).toBe('overreach')

    const discredited = determineEnding({
      ...createVikramaCampaign(),
      resources: {
        treasury: 60,
        legitimacy: 9,
        alliance: 40,
        reach: 70,
        acceptance: 70,
      },
      coinage: { kshatrapa: 5, gupta: 70 },
    })
    expect(discredited).toBe('overreach')
  })

  it('does not accept a conquest where the old silver still circulates', () => {
    const ending = determineEnding({
      ...createVikramaCampaign(),
      resources: {
        treasury: 60,
        legitimacy: 60,
        alliance: 40,
        reach: 80,
        acceptance: 80,
      },
      coinage: { kshatrapa: 55, gupta: 60 },
    })
    expect(ending).toBe('hollow-conquest')
  })

  it('ignores further actions once the dossier is open', () => {
    const state = playOut([])
    expect(take(state, 'winter-court')).toBe(state)
  })

  it('closes the dossier only from the dossier phase', () => {
    const started = begin()
    expect(
      vikramaCampaignReducer(started, { type: 'CLOSE_DOSSIER' }),
    ).toBe(started)
    const finished = playOut([])
    const closed = vikramaCampaignReducer(finished, { type: 'CLOSE_DOSSIER' })
    expect(closed.events.at(-1)?.command.type).toBe('CLOSE_DOSSIER')
  })
})

describe('the dossier chart series', () => {
  it('records a coinage sample for every resolved season', () => {
    const state = playOut([])
    expect(state.coinageHistory).toHaveLength(MAX_TURNS + 1)
    expect(state.coinageHistory[0].guptaYear).toBe(createVikramaCampaign().guptaYear)
    expect(state.coinageHistory.at(-1)?.gupta).toBe(state.coinage.gupta)
  })

  it('charts a real handover when the west is absorbed', () => {
    const state = playOut([
      'malwa-road',
      'malwa-road',
      'hold-ports',
      'strike-silver',
      'confirm-officers',
      'strike-silver',
      'strike-silver',
      'strike-silver',
    ])
    const first = state.coinageHistory[0]
    const last = state.coinageHistory.at(-1)!
    expect(last.kshatrapa).toBeLessThan(first.kshatrapa)
    expect(last.gupta).toBeGreaterThan(first.gupta)
  })

  it('never emits a sample outside 0..100', () => {
    const state = playOut([
      'malwa-road',
      'hold-ports',
      'hold-ports',
      'strike-silver',
    ])
    for (const sample of state.coinageHistory) {
      expect(sample.kshatrapa).toBeGreaterThanOrEqual(0)
      expect(sample.kshatrapa).toBeLessThanOrEqual(100)
      expect(sample.gupta).toBeGreaterThanOrEqual(0)
      expect(sample.gupta).toBeLessThanOrEqual(100)
    }
  })
})

describe('determinism', () => {
  it('replays an ordered command log to an identical state', () => {
    const commands: VikramaCommand[] = [
      { type: 'BEGIN_CAMPAIGN' },
      { type: 'TAKE_ACTION', actionId: 'malwa-road' },
      { type: 'TAKE_ACTION', actionId: 'vakataka-marriage' },
      { type: 'TAKE_ACTION', actionId: 'malwa-road' },
      { type: 'TAKE_ACTION', actionId: 'strike-silver' },
      { type: 'TAKE_ACTION', actionId: 'endow-udayagiri' },
      { type: 'TAKE_ACTION', actionId: 'hold-ports' },
      { type: 'TAKE_ACTION', actionId: 'strike-silver' },
      { type: 'TAKE_ACTION', actionId: 'confirm-officers' },
    ]
    expect(replayCampaign(commands)).toEqual(replayCampaign(commands))
  })

  it('produces the same outcome for the same script every time', () => {
    const script: ActionId[] = [
      'malwa-road',
      'malwa-road',
      'strike-silver',
      'strike-silver',
    ]
    expect(playOut(script)).toEqual(playOut(script))
  })
})
