import { vikramaActions } from './content'
import type {
  ActionForecast,
  ActionId,
  CampaignEnding,
  CoinageShares,
  EvidenceArtifact,
  ResourceDelta,
  ResourceValues,
  VikramaCommand,
  VikramaState,
} from './types'
/**
 * The Western Horizon engine.
 *
 * Fully deterministic: no randomness anywhere, so a command log replays to an
 * identical state (see replayCampaign). Every rule here is gameplay
 * reconstruction; the evidence categories it produces are the sourced part.
 */

/** The campaign opens in Gupta era 76 and runs eight seasons to GE 96. */
export const START_GUPTA_YEAR = 76
export const YEARS_PER_TURN = 3
export const MAX_TURNS = 8

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

/** Gupta era year to an approximate Common Era year, as a display convenience. */
export const guptaYearToCe = (guptaYear: number) => guptaYear + 320

export const createVikramaCampaign = (seed = 892): VikramaState => ({
  schemaVersion: 1,
  contentVersion: '0.10.0',
  campaignId: 'western-horizon',
  seed,
  phase: 'briefing',
  guptaYear: START_GUPTA_YEAR,
  turn: 0,
  maxTurns: MAX_TURNS,
  resources: {
    treasury: 60,
    legitimacy: 52,
    alliance: 10,
    reach: 12,
    acceptance: 24,
  },
  coinage: { kshatrapa: 92, gupta: 0 },
  coinageHistory: [
    { guptaYear: START_GUPTA_YEAR, kshatrapa: 92, gupta: 0 },
  ],
  usedActions: [],
  evidence: [],
  ending: null,
  report: [
    'The western provinces are held by the Kshatrapas, and their silver is the coin the markets trust.',
  ],
  events: [],
})

const applyDelta = (
  resources: ResourceValues,
  delta: ResourceDelta,
): ResourceValues => ({
  treasury: clamp(resources.treasury + (delta.treasury ?? 0), 0, 100),
  legitimacy: clamp(resources.legitimacy + (delta.legitimacy ?? 0), 0, 100),
  alliance: clamp(resources.alliance + (delta.alliance ?? 0), 0, 100),
  reach: clamp(resources.reach + (delta.reach ?? 0), 0, 100),
  acceptance: clamp(resources.acceptance + (delta.acceptance ?? 0), 0, 100),
})

/**
 * Advance the two coinages one season.
 *
 * Gupta silver only displaces Kshatrapa silver to the extent that markets
 * actually accept it, so minting without acceptance stalls. Meanwhile Kshatrapa
 * silver decays slowly on its own once imperial reach is established: dies wear
 * out and are not recut in a province that has lost its mint authority.
 */
export const advanceCoinage = (
  coinage: CoinageShares,
  resources: ResourceValues,
  direct: Partial<CoinageShares> = {},
): CoinageShares => {
  const acceptance = resources.acceptance / 100
  const reach = resources.reach / 100

  const guptaGain = (direct.gupta ?? 0) * (0.35 + acceptance * 0.65)
  const kshatrapaDirect = (direct.kshatrapa ?? 0) * (0.4 + reach * 0.6)
  // Attrition: an unsupported coinage fades once the province is held.
  const attrition = reach > 0.45 ? 2.5 + reach * 3.5 : 0

  return {
    kshatrapa: clamp(coinage.kshatrapa + kshatrapaDirect - attrition, 0, 100),
    gupta: clamp(coinage.gupta + guptaGain, 0, 100),
  }
}

export const actionForecast = (
  state: VikramaState,
  actionId: ActionId,
): ActionForecast => {
  const action = vikramaActions[actionId]
  const coinage = advanceCoinage(state.coinage, state.resources, action.coinage)
  const recordNote =
    action.artifact?.kind === 'absence'
      ? 'Leaves no datable trace.'
      : action.artifact
        ? `Leaves ${action.artifact.title.toLowerCase()}.`
        : 'Leaves no datable trace.'

  if (action.onceOnly && state.usedActions.includes(actionId)) {
    return {
      allowed: false,
      reason: 'Already done once, and it cannot be done again.',
      delta: action.delta,
      coinage,
      recordNote,
    }
  }

  if (action.requires) {
    for (const [key, needed] of Object.entries(action.requires) as [
      keyof ResourceValues,
      number,
    ][]) {
      if (state.resources[key] < needed) {
        return {
          allowed: false,
          reason: `Requires ${key} of at least ${needed}.`,
          delta: action.delta,
          coinage,
          recordNote,
        }
      }
    }
  }

  return { allowed: true, delta: action.delta, coinage, recordNote }
}

/**
 * Decide the campaign's ending from the final state.
 *
 * The test is deliberately not "did you hold the ground": it is whether the
 * reign left a record a historian could read. Absorbing the west means the old
 * coinage stopped, yours replaced it, and the province accepted imperial rule.
 */
export const determineEnding = (state: VikramaState): CampaignEnding => {
  const { resources, coinage } = state
  if (resources.treasury <= 8 || resources.legitimacy <= 15) {
    return 'overreach'
  }
  const displaced = coinage.kshatrapa <= 20
  const established = coinage.gupta >= 45
  const settled = resources.acceptance >= 50 && resources.reach >= 50
  if (displaced && established && settled) {
    return 'absorbed-west'
  }
  return 'hollow-conquest'
}

/** How many artifacts of real evidential weight the reign produced. */
export const durableArtifacts = (evidence: readonly EvidenceArtifact[]) =>
  evidence.filter((artifact) => artifact.kind !== 'absence')

const summarise = (state: VikramaState, actionId: ActionId): string => {
  const action = vikramaActions[actionId]
  return `${guptaYearToCe(state.guptaYear)} CE — ${action.title}`
}

export const vikramaCampaignReducer = (
  state: VikramaState,
  command: VikramaCommand,
): VikramaState => {
  if (command.type === 'BEGIN_CAMPAIGN') {
    if (state.phase !== 'briefing') {
      return state
    }
    return {
      ...state,
      phase: 'campaign',
      turn: 1,
      events: [
        ...state.events,
        {
          index: state.events.length,
          command,
          summary: 'The western campaign opens.',
        },
      ],
    }
  }

  if (command.type === 'TAKE_ACTION') {
    if (state.phase !== 'campaign') {
      return state
    }
    const forecast = actionForecast(state, command.actionId)
    if (!forecast.allowed) {
      return state
    }
    const action = vikramaActions[command.actionId]
    const resources = applyDelta(state.resources, action.delta)
    const coinage = advanceCoinage(state.coinage, resources, action.coinage)
    const evidence: EvidenceArtifact[] = action.artifact
      ? [...state.evidence, { ...action.artifact, guptaYear: state.guptaYear }]
      : [...state.evidence]

    const nextTurn = state.turn + 1
    const finished = nextTurn > state.maxTurns
    const advanced: VikramaState = {
      ...state,
      resources,
      coinage,
      coinageHistory: [
        ...state.coinageHistory,
        {
          guptaYear: state.guptaYear + YEARS_PER_TURN,
          kshatrapa: coinage.kshatrapa,
          gupta: coinage.gupta,
        },
      ],
      evidence,
      usedActions: action.onceOnly
        ? [...state.usedActions, action.id]
        : state.usedActions,
      turn: finished ? state.turn : nextTurn,
      guptaYear: finished
        ? state.guptaYear
        : state.guptaYear + YEARS_PER_TURN,
      report: [action.summary, forecast.recordNote],
      events: [
        ...state.events,
        {
          index: state.events.length,
          command,
          summary: summarise(state, command.actionId),
          delta: action.delta,
        },
      ],
    }

    if (!finished) {
      return advanced
    }
    return {
      ...advanced,
      phase: 'dossier',
      ending: determineEnding(advanced),
    }
  }

  if (command.type === 'CLOSE_DOSSIER') {
    if (state.phase !== 'dossier') {
      return state
    }
    return {
      ...state,
      events: [
        ...state.events,
        {
          index: state.events.length,
          command,
          summary: 'The dossier is closed.',
        },
      ],
    }
  }

  return state
}

/** Replay an ordered command log from a fresh campaign. Used by the save tests. */
export const replayCampaign = (
  commands: readonly VikramaCommand[],
  seed = 892,
): VikramaState =>
  commands.reduce(vikramaCampaignReducer, createVikramaCampaign(seed))
