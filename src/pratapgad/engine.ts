import { pratapgadActions } from './content'
import type {
  ActionForecast,
  ActionId,
  CampaignEnding,
  PratapgadCommand,
  PratapgadState,
  Readiness,
  ResourceDelta,
  ResourceKey,
  ResourceValues,
} from './types'

/**
 * The Hills of Pratapgad engine.
 *
 * Deterministic; no randomness. Note what is absent: there is no combat
 * resolution, no enemy health, and no strike action. The player arranges the
 * ground and then commits, and the encounter itself is narrated, never played.
 */

export const MAX_TURNS = 6

/** Every element counts equally: the weakest one is what fails you. */
export const READINESS_KEYS: readonly ResourceKey[] = [
  'intelligence',
  'lookouts',
  'reserve',
  'signal',
  'withdrawal',
]

/**
 * The best mean a player can realistically reach in the turns available. Used
 * only to rescale the displayed percentage; the ending thresholds read the raw
 * score.
 */
export const ACHIEVABLE_SCORE = 40

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export const createPratapgadCampaign = (seed = 1659): PratapgadState => ({
  schemaVersion: 1,
  contentVersion: '0.11.0',
  campaignId: 'hills-of-pratapgad',
  seed,
  phase: 'briefing',
  turn: 0,
  maxTurns: MAX_TURNS,
  resources: {
    intelligence: 0,
    lookouts: 0,
    reserve: 0,
    signal: 0,
    withdrawal: 0,
  },
  usedActions: [],
  preparations: [],
  ending: null,
  report: [
    'A meeting has been agreed beneath the fort. Both sides are arranging how it will happen.',
  ],
  events: [],
})

const applyDelta = (
  resources: ResourceValues,
  delta: ResourceDelta,
): ResourceValues => ({
  intelligence: clamp(resources.intelligence + (delta.intelligence ?? 0), 0, 100),
  lookouts: clamp(resources.lookouts + (delta.lookouts ?? 0), 0, 100),
  reserve: clamp(resources.reserve + (delta.reserve ?? 0), 0, 100),
  signal: clamp(resources.signal + (delta.signal ?? 0), 0, 100),
  withdrawal: clamp(resources.withdrawal + (delta.withdrawal ?? 0), 0, 100),
})

export const actionForecast = (
  state: PratapgadState,
  actionId: ActionId,
): ActionForecast => {
  const action = pratapgadActions[actionId]
  if (action.onceOnly && state.usedActions.includes(actionId)) {
    return {
      allowed: false,
      reason: 'This has already been arranged.',
      delta: action.delta,
    }
  }
  if (action.requires) {
    for (const [key, needed] of Object.entries(action.requires) as [
      ResourceKey,
      number,
    ][]) {
      if (state.resources[key] < needed) {
        return {
          allowed: false,
          reason: `Requires ${key} of at least ${needed}.`,
          delta: action.delta,
        }
      }
    }
  }
  return { allowed: true, delta: action.delta }
}

/**
 * Score the arrangement.
 *
 * The score is the mean of the five elements, but the *ending* is gated on the
 * weakest one, because a plan in broken country fails at its weakest link rather
 * than averaging out.
 */
export const assessReadiness = (state: PratapgadState): Readiness => {
  const values = READINESS_KEYS.map((key) => state.resources[key])
  const score = values.reduce((sum, value) => sum + value, 0) / values.length
  let weakest: ResourceKey = READINESS_KEYS[0]
  for (const key of READINESS_KEYS) {
    if (state.resources[key] < state.resources[weakest]) {
      weakest = key
    }
  }
  const floor = state.resources[weakest]
  // Six turns cap what any element can realistically reach, so the raw mean is
  // rescaled for display against that ceiling rather than against a nominal 100.
  const percent = clamp((score / ACHIEVABLE_SCORE) * 100, 0, 100)

  const ending: CampaignEnding =
    floor >= 25 && score >= 30
      ? 'ground-prepared'
      : score >= 15
        ? 'partly-ready'
        : 'exposed'

  const lines: string[] = []
  lines.push(
    state.resources.lookouts >= 25
      ? 'The watchers on the spurs see the column while it is still far down the valley.'
      : 'Nobody on the high ground sees anything until it is already close.',
  )
  lines.push(
    state.resources.signal >= 25
      ? 'One signal can reach every post in the hills.'
      : 'There is no way to pass a decision to the hills in time for it to matter.',
  )
  lines.push(
    state.resources.reserve >= 25
      ? 'The reserve is close, and it has not been seen.'
      : 'There is no supporting force within reach of the meeting ground.',
  )
  lines.push(
    state.resources.withdrawal >= 25
      ? 'The path back up to the fort is open and covered.'
      : 'The road back up to Pratapgad is neither held nor watched.',
  )

  return { score, percent, weakest, ending, lines }
}

export const pratapgadReducer = (
  state: PratapgadState,
  command: PratapgadCommand,
): PratapgadState => {
  if (command.type === 'BEGIN_PREPARATION') {
    if (state.phase !== 'briefing') {
      return state
    }
    return {
      ...state,
      phase: 'preparation',
      turn: 1,
      events: [
        ...state.events,
        {
          index: state.events.length,
          command,
          summary: 'Preparation of the ground begins.',
        },
      ],
    }
  }

  if (command.type === 'COMMIT') {
    if (state.phase !== 'preparation') {
      return state
    }
    return {
      ...state,
      phase: 'aftermath',
      ending: assessReadiness(state).ending,
      report: ['The meeting goes ahead.'],
      events: [
        ...state.events,
        {
          index: state.events.length,
          command,
          summary: 'The meeting is committed to.',
        },
      ],
    }
  }

  if (command.type === 'TAKE_ACTION') {
    if (state.phase !== 'preparation') {
      return state
    }
    const forecast = actionForecast(state, command.actionId)
    if (!forecast.allowed) {
      return state
    }
    const action = pratapgadActions[command.actionId]
    const resources = applyDelta(state.resources, action.delta)
    const nextTurn = state.turn + 1
    const finished = nextTurn > state.maxTurns

    const advanced: PratapgadState = {
      ...state,
      resources,
      usedActions: action.onceOnly
        ? [...state.usedActions, action.id]
        : state.usedActions,
      preparations: [...state.preparations, action.preparation],
      turn: finished ? state.turn : nextTurn,
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

    if (!finished) {
      return advanced
    }
    return {
      ...advanced,
      phase: 'aftermath',
      ending: assessReadiness(advanced).ending,
      report: ['There is no more time. The meeting goes ahead.'],
    }
  }

  return state
}

export const replayPratapgad = (
  commands: readonly PratapgadCommand[],
  seed = 1659,
): PratapgadState =>
  commands.reduce(pratapgadReducer, createPratapgadCampaign(seed))
