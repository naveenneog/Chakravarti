import { narraiActions } from './content'
import type {
  ActionForecast,
  ActionId,
  CampaignEnding,
  NarraiCommand,
  NarraiState,
  ResourceDelta,
  ResourceValues,
} from './types'

/**
 * The Defiance at Narrai engine.
 *
 * Deterministic; no randomness. The campaign cannot be won — that is the design,
 * not a bug. `determineEnding` scores only the two things the defender actually
 * controlled: the price the invasion paid, and how many people got out.
 */

export const MAX_TURNS = 7
export const START_DEFILES = 4

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export const createNarraiCampaign = (seed = 1564): NarraiState => ({
  schemaVersion: 1,
  contentVersion: '0.11.0',
  campaignId: 'defiance-at-narrai',
  seed,
  phase: 'briefing',
  turn: 0,
  maxTurns: MAX_TURNS,
  resources: {
    warriors: 72,
    elephants: 60,
    ground: START_DEFILES,
    sheltered: 0,
    resolve: 58,
  },
  costImposed: 0,
  usedActions: [],
  deeds: [],
  ending: null,
  report: [
    'Malwa has fallen to the empire, so the empire is now the neighbour. A force has crossed the border with the emperor\u2019s permission.',
  ],
  events: [],
})

const applyDelta = (
  resources: ResourceValues,
  delta: ResourceDelta,
): ResourceValues => ({
  warriors: clamp(resources.warriors + (delta.warriors ?? 0), 0, 100),
  elephants: clamp(resources.elephants + (delta.elephants ?? 0), 0, 100),
  ground: clamp(resources.ground + (delta.ground ?? 0), 0, START_DEFILES),
  sheltered: clamp(resources.sheltered + (delta.sheltered ?? 0), 0, 100),
  resolve: clamp(resources.resolve + (delta.resolve ?? 0), 0, 100),
})

export const actionForecast = (
  state: NarraiState,
  actionId: ActionId,
): ActionForecast => {
  const action = narraiActions[actionId]
  const costDelta = action.costDelta ?? 0

  if (action.onceOnly && state.usedActions.includes(actionId)) {
    return {
      allowed: false,
      reason: 'There is only one chance at this.',
      delta: action.delta,
      costDelta,
    }
  }
  if (actionId === 'give-ground' && state.resources.ground <= 0) {
    return {
      allowed: false,
      reason: 'There is no ground left to give.',
      delta: action.delta,
      costDelta,
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
          costDelta,
        }
      }
    }
  }
  return { allowed: true, delta: action.delta, costDelta }
}

/**
 * Score the campaign on the only two axes the defender controlled.
 *
 * There is deliberately no victory ending. The historical outcome is not in
 * doubt and the chapter does not offer a counterfactual in which it is.
 */
export const determineEnding = (state: NarraiState): CampaignEnding => {
  const paid = state.costImposed >= 55
  const saved = state.resources.sheltered >= 50
  if (paid && saved) {
    return 'remembered'
  }
  if (paid) {
    return 'costly'
  }
  if (saved) {
    return 'sheltered'
  }
  return 'overrun'
}

/** True when the defence can no longer be continued. */
export const isSpent = (state: NarraiState): boolean =>
  state.resources.ground <= 0 || state.resources.warriors <= 0

export const narraiReducer = (
  state: NarraiState,
  command: NarraiCommand,
): NarraiState => {
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
          summary: 'The defence forms up at Narrai.',
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
    const action = narraiActions[command.actionId]
    const resources = applyDelta(state.resources, action.delta)
    const costImposed = clamp(
      state.costImposed + (action.costDelta ?? 0),
      0,
      100,
    )
    const nextTurn = state.turn + 1

    const advanced: NarraiState = {
      ...state,
      resources,
      costImposed,
      usedActions: action.onceOnly
        ? [...state.usedActions, action.id]
        : state.usedActions,
      deeds: [...state.deeds, action.deed],
      turn: nextTurn > state.maxTurns ? state.turn : nextTurn,
      report: [action.summary],
      events: [
        ...state.events,
        {
          index: state.events.length,
          command,
          summary: action.title,
        },
      ],
    }

    const finished = nextTurn > state.maxTurns || isSpent(advanced)
    if (!finished) {
      return advanced
    }
    return {
      ...advanced,
      phase: 'epilogue',
      ending: determineEnding(advanced),
      report: [
        state.resources.ground <= 1
          ? 'There is no further bend to fall back to. The position is fixed.'
          : action.summary,
      ],
    }
  }

  return state
}

export const replayNarrai = (
  commands: readonly NarraiCommand[],
  seed = 1564,
): NarraiState => commands.reduce(narraiReducer, createNarraiCampaign(seed))
