import { saraighatActions } from './content'
import type {
  ActionForecast,
  ActionId,
  BattleReport,
  CampaignEnding,
  Ground,
  ResourceDelta,
  ResourceValues,
  SaraighatCommand,
  SaraighatState,
} from './types'

/**
 * The Brahmaputra Holds engine.
 *
 * Deterministic throughout: no randomness, so a command log replays exactly.
 * Every threshold is gameplay reconstruction; the corroboration entries the
 * actions produce are the sourced part.
 */

export const START_YEAR = 1667
export const MAX_TURNS = 8

/** Pressure the imperial advance gains every season on its own. */
export const PRESSURE_PER_TURN = 11

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export const createSaraighatCampaign = (seed = 1671): SaraighatState => ({
  schemaVersion: 1,
  contentVersion: '0.11.0',
  campaignId: 'brahmaputra-holds',
  seed,
  phase: 'briefing',
  year: START_YEAR,
  turn: 0,
  maxTurns: MAX_TURNS,
  resources: {
    manpower: 22,
    embankments: 0,
    riverCraft: 8,
    alliances: 6,
    cohesion: 30,
  },
  mughalPressure: 18,
  usedActions: [],
  record: [],
  ending: null,
  battle: null,
  report: [
    'The treaty left the kingdom stripped, the forts thrown down, and the road from the Manas to Guwahati in imperial hands.',
  ],
  events: [],
})

const applyDelta = (
  resources: ResourceValues,
  delta: ResourceDelta,
): ResourceValues => ({
  manpower: clamp(resources.manpower + (delta.manpower ?? 0), 0, 100),
  embankments: clamp(resources.embankments + (delta.embankments ?? 0), 0, 100),
  riverCraft: clamp(resources.riverCraft + (delta.riverCraft ?? 0), 0, 100),
  alliances: clamp(resources.alliances + (delta.alliances ?? 0), 0, 100),
  cohesion: clamp(resources.cohesion + (delta.cohesion ?? 0), 0, 100),
})

/**
 * Where the decisive engagement ends up being fought.
 *
 * This is the chapter's central rule and it is deliberately not a menu choice.
 * The narrows are only available if the land approach has genuinely been closed
 * *and* there is a river force to fight there with. Accepting an open battle
 * throws the whole arrangement away, exactly as it did at Alaboi.
 */
export const decideGround = (state: SaraighatState): Ground => {
  if (state.usedActions.includes('accept-open-battle')) {
    return 'open-field'
  }
  const { embankments, riverCraft } = state.resources
  if (embankments >= 55 && riverCraft >= 40) {
    return 'saraighat-narrows'
  }
  if (embankments >= 25) {
    return 'guwahati-hills'
  }
  return 'open-field'
}

/**
 * How much of each side's strength the ground actually lets it use.
 *
 * The Mughal army is stronger everywhere; the only variable the Ahom side
 * controls is how much of that strength the terrain permits.
 */
const GROUND_MODIFIERS: Record<
  Ground,
  { ahom: number; mughal: number }
> = {
  'open-field': { ahom: 0.55, mughal: 1 },
  'guwahati-hills': { ahom: 0.85, mughal: 0.72 },
  'saraighat-narrows': { ahom: 1.05, mughal: 0.45 },
}

export const actionForecast = (
  state: SaraighatState,
  actionId: ActionId,
): ActionForecast => {
  const action = saraighatActions[actionId]
  const pressureDelta = action.pressureDelta ?? 0

  if (action.onceOnly && state.usedActions.includes(actionId)) {
    return {
      allowed: false,
      reason: 'Already done, and it cannot be undone.',
      delta: action.delta,
      pressureDelta,
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
          pressureDelta,
        }
      }
    }
  }
  return { allowed: true, delta: action.delta, pressureDelta }
}

/** Resolve the decisive engagement from the prepared position. */
export const resolveBattle = (state: SaraighatState): BattleReport => {
  const ground = decideGround(state)
  const mod = GROUND_MODIFIERS[ground]
  const { manpower, riverCraft, alliances, cohesion, embankments } =
    state.resources

  const base =
    manpower * 0.3 + riverCraft * 0.32 + alliances * 0.18 + cohesion * 0.2
  const ahomStrength = clamp(base * mod.ahom, 0, 100)
  const mughalStrength = clamp(
    (58 + state.mughalPressure * 0.42) * mod.mughal,
    0,
    100,
  )

  const lines: string[] = []
  lines.push(
    ground === 'saraighat-narrows'
      ? 'The land approach is shut, so the fleet must come up the narrows, where it cannot deploy its weight.'
      : ground === 'guwahati-hills'
        ? 'The hills blunt their horse, but the land approach is still open and they can choose how to come.'
        : 'The decision is fought on level ground, where their cavalry and artillery can both be used at once.',
  )
  if (cohesion < 30) {
    lines.push(
      'Boats fall back without orders; the command has to be rebuilt in the middle of the fight.',
    )
  }
  if (embankments >= 55 && ground !== 'open-field') {
    lines.push('The earthworks hold along their whole length.')
  }

  const ending: CampaignEnding =
    ahomStrength >= mughalStrength ? 'river-holds' : 'guwahati-falls'
  lines.push(
    ending === 'river-holds'
      ? 'The imperial fleet is broken in the channel and the campaign withdraws west.'
      : 'The position is carried, and Guwahati passes out of Ahom hands.',
  )

  return { ground, ahomStrength, mughalStrength, ending, lines }
}

export const saraighatReducer = (
  state: SaraighatState,
  command: SaraighatCommand,
): SaraighatState => {
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
          summary: 'The army moves downstream to retake Guwahati.',
          year: state.year,
        },
      ],
    }
  }

  if (command.type === 'ACCEPT_TERMS') {
    if (state.phase !== 'campaign') {
      return state
    }
    return {
      ...state,
      phase: 'debrief',
      ending: 'terms-accepted',
      battle: null,
      report: [
        'The council accepts the imperial proposal and Guwahati is given up by agreement.',
      ],
      events: [
        ...state.events,
        {
          index: state.events.length,
          command,
          summary: 'The settlement is accepted.',
          year: state.year,
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
    const action = saraighatActions[command.actionId]
    const resources = applyDelta(state.resources, action.delta)
    const mughalPressure = clamp(
      state.mughalPressure + PRESSURE_PER_TURN + (action.pressureDelta ?? 0),
      0,
      100,
    )
    const usedActions = action.onceOnly
      ? [...state.usedActions, action.id]
      : state.usedActions

    const nextTurn = state.turn + 1
    const forced = mughalPressure >= 100
    const finished = nextTurn > state.maxTurns || forced

    const advanced: SaraighatState = {
      ...state,
      resources,
      mughalPressure,
      usedActions,
      record: [...state.record, action.corroboration],
      turn: finished ? state.turn : nextTurn,
      year: finished ? state.year : state.year + 1,
      report: [action.summary],
      events: [
        ...state.events,
        {
          index: state.events.length,
          command,
          summary: action.title,
          year: state.year,
        },
      ],
    }

    if (!finished) {
      return advanced
    }
    const battle = resolveBattle(advanced)
    return {
      ...advanced,
      phase: 'debrief',
      battle,
      ending: battle.ending,
      report: forced
        ? ['The imperial army forces the decision before the season is out.']
        : [action.summary],
    }
  }

  return state
}

export const replaySaraighat = (
  commands: readonly SaraighatCommand[],
  seed = 1671,
): SaraighatState =>
  commands.reduce(saraighatReducer, createSaraighatCampaign(seed))
