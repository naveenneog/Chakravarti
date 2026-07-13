import { nandaPlans } from './content'
import type {
  MissionModifiers,
  MissionOutcome,
  MissionResult,
  NandaCampaignState,
  NandaCommand,
  NandaEvent,
  PlanCategory,
  PlanForecast,
  PlanId,
  PlanOption,
  StrategyDelta,
  StrategyValues,
} from './types'

const planCategories: readonly PlanCategory[] = [
  'intelligence',
  'alliance',
  'logistics',
]

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value))

const applyStrategyDelta = (
  strategy: StrategyValues,
  delta: StrategyDelta,
): StrategyValues => ({
  treasury: Math.max(0, strategy.treasury + (delta.treasury ?? 0)),
  legitimacy: clamp(strategy.legitimacy + (delta.legitimacy ?? 0), 0, 10),
  popularSupport: clamp(
    strategy.popularSupport + (delta.popularSupport ?? 0),
    0,
    10,
  ),
  unrest: clamp(strategy.unrest + (delta.unrest ?? 0), 0, 10),
  intelligence: clamp(
    strategy.intelligence + (delta.intelligence ?? 0),
    0,
    10,
  ),
})

const combineStrategyDeltas = (
  deltas: readonly StrategyDelta[],
): StrategyDelta =>
  deltas.reduce<StrategyDelta>(
    (combined, delta) => ({
      treasury: (combined.treasury ?? 0) + (delta.treasury ?? 0),
      legitimacy: (combined.legitimacy ?? 0) + (delta.legitimacy ?? 0),
      popularSupport:
        (combined.popularSupport ?? 0) + (delta.popularSupport ?? 0),
      unrest: (combined.unrest ?? 0) + (delta.unrest ?? 0),
      intelligence:
        (combined.intelligence ?? 0) + (delta.intelligence ?? 0),
    }),
    {},
  )

const recordEvent = (
  state: NandaCampaignState,
  command: NandaCommand,
  summary: string,
  strategicDelta?: StrategyDelta,
): NandaCampaignState => {
  const event: NandaEvent = {
    index: state.events.length,
    command,
    summary,
    strategicDelta,
  }
  return {
    ...state,
    events: [...state.events, event],
  }
}

const selectedOptions = (state: NandaCampaignState): PlanOption[] =>
  planCategories.flatMap((category) => {
    const planId = state.selectedPlans[category]
    return planId ? [nandaPlans[planId]] : []
  })

const canAfford = (state: NandaCampaignState, delta: StrategyDelta) =>
  state.strategy.treasury + (delta.treasury ?? 0) >= 0

export const createNandaCampaign = (seed = 404): NandaCampaignState => ({
  schemaVersion: 1,
  contentVersion: '0.4.1',
  campaignId: 'fall-of-nandas',
  seed,
  phase: 'briefing',
  strategy: {
    treasury: 6,
    legitimacy: 3,
    popularSupport: 3,
    unrest: 6,
    intelligence: 1,
  },
  selectedPlans: {
    intelligence: null,
    alliance: null,
    logistics: null,
  },
  missionModifiers: null,
  missionResult: null,
  outcome: null,
  lastReport: [
    'Later traditions agree on a Nanda-to-Maurya transition but preserve no battle plan, siege sequence, or eyewitness dialogue.',
  ],
  events: [],
})

export const planForecast = (
  state: NandaCampaignState,
  planId: PlanId,
): PlanForecast => {
  const plan = nandaPlans[planId]
  if (state.phase !== 'planning') {
    return {
      allowed: false,
      reason: 'Preparations can be changed only before the mission begins.',
      summary: plan.consequence,
    }
  }

  const replacing = state.selectedPlans[plan.category]
  const otherOptions = selectedOptions(state).filter(
    (option) => option.id !== replacing,
  )
  const projectedDelta = combineStrategyDeltas([
    ...otherOptions.map((option) => option.strategicDelta),
    plan.strategicDelta,
  ])
  if (!canAfford(state, projectedDelta)) {
    return {
      allowed: false,
      reason: 'The council cannot fund this combination of preparations.',
      summary: plan.consequence,
      strategicDelta: plan.strategicDelta,
      missionEffect: plan.missionEffect,
    }
  }

  return {
    allowed: true,
    summary: plan.consequence,
    strategicDelta: plan.strategicDelta,
    missionEffect: plan.missionEffect,
  }
}

export const combinedPlanDelta = (
  state: NandaCampaignState,
): StrategyDelta =>
  combineStrategyDeltas(
    selectedOptions(state).map((option) => option.strategicDelta),
  )

export const missionModifiersFor = (
  state: NandaCampaignState,
): MissionModifiers => {
  const modifiers: MissionModifiers = {
    maxHealth: 100,
    attackDamage: 32,
    moveSpeed: 5.1,
    jumpForce: 7.3,
    enemyCount: 6,
    enemyHealth: 68,
    requiredObjectives: 2,
    securedObjectives: 0,
    healingCharges: 0,
    revealObjectives: false,
    sideGateOpen: false,
    routeLabel: 'Unprepared courtyard approach',
  }

  for (const plan of selectedOptions(state)) {
    const effect = plan.missionEffect
    modifiers.maxHealth += effect.maxHealth ?? 0
    modifiers.attackDamage += effect.attackDamage ?? 0
    modifiers.moveSpeed += effect.moveSpeed ?? 0
    modifiers.jumpForce += effect.jumpForce ?? 0
    modifiers.enemyCount += effect.enemyCount ?? 0
    modifiers.enemyHealth += effect.enemyHealth ?? 0
    modifiers.securedObjectives += effect.securedObjectives ?? 0
    modifiers.healingCharges += effect.healingCharges ?? 0
    modifiers.revealObjectives ||= effect.revealObjectives ?? false
    modifiers.sideGateOpen ||= effect.sideGateOpen ?? false
    if (effect.routeLabel) {
      modifiers.routeLabel = effect.routeLabel
    }
  }

  modifiers.enemyCount = clamp(modifiers.enemyCount, 3, 6)
  modifiers.enemyHealth = clamp(modifiers.enemyHealth, 40, 90)
  modifiers.securedObjectives = clamp(
    modifiers.securedObjectives,
    0,
    modifiers.requiredObjectives,
  )
  return modifiers
}

export const missionLaunchForecast = (
  state: NandaCampaignState,
): PlanForecast => {
  if (state.phase !== 'planning') {
    return {
      allowed: false,
      reason: 'The operation is not in its planning phase.',
      summary: 'Complete the current campaign phase first.',
    }
  }
  const missing = planCategories.find(
    (category) => state.selectedPlans[category] === null,
  )
  if (missing) {
    return {
      allowed: false,
      reason: `Choose the ${missing} preparation before entering the district.`,
      summary: 'Every preparation category changes the real-time mission.',
    }
  }
  const delta = combinedPlanDelta(state)
  if (!canAfford(state, delta)) {
    return {
      allowed: false,
      reason: 'The selected preparations exceed the available treasury.',
      summary: 'Choose a less costly combination.',
      strategicDelta: delta,
    }
  }
  return {
    allowed: true,
    summary:
      'The mission will lock these preparations and apply their strategic costs.',
    strategicDelta: delta,
  }
}

export const resolveNandaOutcome = (
  result: MissionResult,
): MissionOutcome => {
  if (!result.success) {
    return 'withdrawal'
  }
  const healthRatio =
    result.maxHealth > 0 ? result.healthRemaining / result.maxHealth : 0
  if (
    healthRatio >= 0.5 &&
    result.objectivesSecured >= result.requiredObjectives
  ) {
    return 'coalition-entry'
  }
  return 'costly-entry'
}

const outcomeDelta = (outcome: MissionOutcome): StrategyDelta => {
  if (outcome === 'coalition-entry') {
    return { legitimacy: 2, popularSupport: 2, unrest: -2 }
  }
  if (outcome === 'costly-entry') {
    return { treasury: -1, legitimacy: 1, unrest: -1 }
  }
  return { legitimacy: -1, popularSupport: -1, unrest: 2 }
}

const sanitizeMissionResult = (
  result: MissionResult,
  modifiers: MissionModifiers,
): MissionResult => ({
  success: Boolean(result.success),
  healthRemaining: clamp(result.healthRemaining, 0, modifiers.maxHealth),
  maxHealth: modifiers.maxHealth,
  guardsDefeated: clamp(result.guardsDefeated, 0, modifiers.enemyCount),
  objectivesSecured: clamp(
    result.objectivesSecured,
    0,
    modifiers.requiredObjectives,
  ),
  requiredObjectives: modifiers.requiredObjectives,
  elapsedSeconds: Math.max(0, Math.round(result.elapsedSeconds)),
  healingUsed: clamp(
    result.healingUsed,
    0,
    modifiers.healingCharges,
  ),
  routeLabel: modifiers.routeLabel,
})

export const nandaCampaignReducer = (
  state: NandaCampaignState,
  command: NandaCommand,
): NandaCampaignState => {
  switch (command.type) {
    case 'OPEN_PLANNING': {
      if (state.phase !== 'briefing') {
        return state
      }
      return recordEvent(
        { ...state, phase: 'planning' },
        command,
        'The council began planning the reconstructed capital operation.',
      )
    }
    case 'SELECT_PLAN': {
      if (state.phase !== 'planning') {
        return state
      }
      const plan = nandaPlans[command.planId]
      if (plan.category !== command.category) {
        return state
      }
      const forecast = planForecast(state, command.planId)
      if (!forecast.allowed) {
        return state
      }
      return recordEvent(
        {
          ...state,
          selectedPlans: {
            ...state.selectedPlans,
            [command.category]: command.planId,
          },
        },
        command,
        `${plan.title} selected for ${command.category}.`,
      )
    }
    case 'BEGIN_MISSION': {
      const forecast = missionLaunchForecast(state)
      if (!forecast.allowed) {
        return state
      }
      const strategicDelta = combinedPlanDelta(state)
      return recordEvent(
        {
          ...state,
          phase: 'mission',
          strategy: applyStrategyDelta(state.strategy, strategicDelta),
          missionModifiers: missionModifiersFor(state),
          lastReport: [
            'The selected intelligence, alliance, and logistics plans now shape the playable district.',
          ],
        },
        command,
        'Chandragupta entered the reconstructed timber-gate district.',
        strategicDelta,
      )
    }
    case 'COMPLETE_MISSION': {
      if (state.phase !== 'mission' || !state.missionModifiers) {
        return state
      }
      const result = sanitizeMissionResult(
        command.result,
        state.missionModifiers,
      )
      const outcome = resolveNandaOutcome(result)
      const strategicDelta = outcomeDelta(outcome)
      const report =
        outcome === 'coalition-entry'
          ? [
              'The gate opens with the operation intact.',
              'Local support and disciplined preparation strengthen the political transition.',
            ]
          : outcome === 'costly-entry'
            ? [
                'The gate opens, but the operation spends more strength than planned.',
                'The council must consolidate before advancing the wider campaign.',
              ]
            : [
                'Chandragupta withdraws before the operation becomes a rout.',
                'The coalition survives, but unrest and doubt grow inside Magadha.',
              ]
      return recordEvent(
        {
          ...state,
          phase: 'debrief',
          strategy: applyStrategyDelta(state.strategy, strategicDelta),
          missionResult: result,
          outcome,
          lastReport: report,
        },
        { ...command, result },
        `Mission resolved as ${outcome}.`,
        strategicDelta,
      )
    }
    case 'FINISH_DEBRIEF': {
      if (state.phase !== 'debrief') {
        return state
      }
      return recordEvent(
        { ...state, phase: 'complete' },
        command,
        'The council recorded the result and its evidence limits.',
      )
    }
  }
}

export const replayNandaCampaign = (
  seed: number,
  commands: readonly NandaCommand[],
) => commands.reduce(nandaCampaignReducer, createNandaCampaign(seed))

export const createActionFirstCampaign = (
  seed = 505,
): NandaCampaignState => {
  const quickStartCommands: readonly NandaCommand[] = [
    { type: 'OPEN_PLANNING' },
    {
      type: 'SELECT_PLAN',
      category: 'intelligence',
      planId: 'watch-rotations',
    },
    {
      type: 'SELECT_PLAN',
      category: 'alliance',
      planId: 'frontier-veterans',
    },
    {
      type: 'SELECT_PLAN',
      category: 'logistics',
      planId: 'hidden-caches',
    },
    { type: 'BEGIN_MISSION' },
  ]
  return quickStartCommands.reduce(
    nandaCampaignReducer,
    createNandaCampaign(seed),
  )
}
