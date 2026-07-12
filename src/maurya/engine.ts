import {
  buildings,
  debateForSeason,
  formationNames,
  units,
} from './content'
import type {
  ActionForecast,
  BuildingType,
  CampaignCommand,
  CampaignEnding,
  CampaignEvent,
  CampaignState,
  Formation,
  ResourceValues,
  StrategicDelta,
  UnitType,
  WarResult,
} from './types'

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value))

const hasResources = (
  resources: ResourceValues,
  cost: Partial<ResourceValues>,
) =>
  Object.entries(cost).every(
    ([key, value]) =>
      resources[key as keyof ResourceValues] >= (value ?? 0),
  )

const costDelta = (cost: Partial<ResourceValues>): StrategicDelta =>
  Object.fromEntries(
    Object.entries(cost).map(([key, value]) => [key, -(value ?? 0)]),
  )

const applyDelta = (
  state: CampaignState,
  delta: StrategicDelta,
): CampaignState => ({
  ...state,
  resources: {
    food: Math.max(0, state.resources.food + (delta.food ?? 0)),
    treasury: Math.max(
      0,
      state.resources.treasury + (delta.treasury ?? 0),
    ),
    legitimacy: clamp(
      state.resources.legitimacy + (delta.legitimacy ?? 0),
      0,
      12,
    ),
  },
  threat: clamp(state.threat + (delta.threat ?? 0), 0, 12),
  readiness: clamp(state.readiness + (delta.readiness ?? 0), 0, 20),
})

const recordEvent = (
  state: CampaignState,
  command: CampaignCommand,
  summary: string,
  delta?: StrategicDelta,
): CampaignState => {
  const event: CampaignEvent = {
    index: state.events.length,
    season: state.season,
    command,
    summary,
    delta,
  }
  return {
    ...state,
    events: [...state.events, event],
  }
}

export const createMauryaCampaign = (seed = 321): CampaignState => ({
  schemaVersion: 1,
  contentVersion: '0.3.0',
  campaignId: 'mauryan-rise',
  seed,
  season: 1,
  maxSeasons: 6,
  phase: 'planning',
  resources: {
    food: 8,
    treasury: 7,
    legitimacy: 5,
  },
  buildings: {
    farm: 0,
    market: 0,
    barracks: 0,
    fort: 0,
  },
  army: {
    infantry: 2,
    archers: 1,
    cavalry: 0,
    elephants: 0,
  },
  threat: 1,
  readiness: 4,
  builtThisSeason: false,
  recruitedThisSeason: false,
  pendingDebateId: null,
  selectedFormation: 'archer-screen',
  warResult: null,
  warResolved: false,
  ending: null,
  lastReport: [
    'Magadha begins with a small field force, workable stores, and an unsettled frontier.',
  ],
  events: [],
})

export const buildingForecast = (
  state: CampaignState,
  buildingType: BuildingType,
): ActionForecast => {
  const building = buildings[buildingType]
  if (state.phase !== 'planning') {
    return {
      allowed: false,
      reason: 'Construction decisions are made during the planning phase.',
      summary: building.role,
    }
  }
  if (state.builtThisSeason) {
    return {
      allowed: false,
      reason: 'Only one construction project can begin each season.',
      summary: building.role,
    }
  }
  if (state.buildings[buildingType] >= 2) {
    return {
      allowed: false,
      reason: 'This vertical slice caps every building at level two.',
      summary: building.role,
    }
  }
  if (!hasResources(state.resources, building.cost)) {
    return {
      allowed: false,
      reason: 'The province cannot meet this construction cost.',
      summary: building.role,
      delta: costDelta(building.cost),
    }
  }
  return {
    allowed: true,
    summary: `${building.role}. Construction is completed this season.`,
    delta: costDelta(building.cost),
  }
}

export const recruitmentForecast = (
  state: CampaignState,
  unitType: UnitType,
): ActionForecast => {
  const unit = units[unitType]
  if (state.phase !== 'planning') {
    return {
      allowed: false,
      reason: 'Recruitment is available during the planning phase.',
      summary: unit.role,
    }
  }
  if (state.recruitedThisSeason) {
    return {
      allowed: false,
      reason: 'Only one formation can be recruited each season.',
      summary: unit.role,
    }
  }
  const missingBuilding = Object.entries(unit.requirements).find(
    ([building, level]) =>
      state.buildings[building as BuildingType] < (level ?? 0),
  )
  if (missingBuilding) {
    return {
      allowed: false,
      reason: `Requires ${buildings[missingBuilding[0] as BuildingType].name}.`,
      summary: unit.role,
    }
  }
  if (
    unit.legitimacyRequired &&
    state.resources.legitimacy < unit.legitimacyRequired
  ) {
    return {
      allowed: false,
      reason: `Requires legitimacy ${unit.legitimacyRequired}.`,
      summary: unit.role,
    }
  }
  if (!hasResources(state.resources, unit.cost)) {
    return {
      allowed: false,
      reason: 'The province cannot meet this recruitment cost.',
      summary: unit.role,
      delta: costDelta(unit.cost),
    }
  }
  return {
    allowed: true,
    summary: `${unit.role} Adds ${unit.readiness} readiness.`,
    delta: {
      ...costDelta(unit.cost),
      readiness: unit.readiness,
    },
  }
}

const seasonalIncome = (state: CampaignState): ResourceValues => ({
  food: 3 + state.buildings.farm * 3,
  treasury: 2 + state.buildings.market * 3,
  legitimacy: 0,
})

const seasonalUpkeep = (state: CampaignState): ResourceValues => ({
  food:
    state.army.infantry +
    state.army.archers +
    state.army.cavalry +
    state.army.elephants * 2,
  treasury: state.army.cavalry + state.army.elephants,
  legitimacy: 0,
})

export const seasonForecast = (state: CampaignState) => {
  const income = seasonalIncome(state)
  const upkeep = seasonalUpkeep(state)
  const threatGrowth = Math.max(0, 2 - state.buildings.fort)
  return {
    income,
    upkeep,
    threatGrowth,
    net: {
      food: income.food - upkeep.food,
      treasury: income.treasury - upkeep.treasury,
      legitimacy: 0,
    },
  }
}

const armyStrength = (state: CampaignState) =>
  state.army.infantry * 2 +
  state.army.archers * 2 +
  state.army.cavalry * 3 +
  state.army.elephants * 4

export const formationForecast = (
  state: CampaignState,
  formation: Formation,
): ActionForecast => {
  if (formation === 'elephant-center' && state.army.elephants === 0) {
    return {
      allowed: false,
      reason: 'Recruit an elephant corps before using this formation.',
      summary: 'Elephants amplify center pressure and infantry cohesion.',
    }
  }
  if (formation === 'cavalry-flank' && state.army.cavalry === 0) {
    return {
      allowed: false,
      reason: 'Recruit cavalry before using this formation.',
      summary: 'Cavalry converts mobility into a flank advantage.',
    }
  }
  if (formation === 'archer-screen' && state.army.archers === 0) {
    return {
      allowed: false,
      reason: 'Recruit archers before using this formation.',
      summary: 'Archers weaken the advance before the infantry meets it.',
    }
  }

  const bonus =
    formation === 'elephant-center'
      ? state.army.elephants * 4 + state.army.infantry
      : formation === 'cavalry-flank'
        ? state.army.cavalry * 4 + state.buildings.market
        : state.army.archers * 4 + state.buildings.fort

  return {
    allowed: true,
    summary: `${formationNames[formation]} adds ${bonus} formation strength.`,
    delta: { readiness: bonus },
  }
}

export const resolveWarResult = (
  state: CampaignState,
  formation = state.selectedFormation,
): WarResult => {
  const formationBonus =
    formationForecast(state, formation).delta?.readiness ?? 0
  const strength =
    armyStrength(state) +
    state.readiness +
    state.resources.legitimacy +
    state.buildings.fort * 2 +
    formationBonus
  const pressure = state.threat * 3 + 6
  const margin = strength - pressure

  if (margin >= 5) {
    return 'decisive-victory'
  }
  if (margin >= -2) {
    return 'costly-victory'
  }
  return 'setback'
}

export const determineEnding = (state: CampaignState): CampaignEnding => {
  if (
    state.resources.legitimacy >= 8 &&
    state.resources.food >= 6 &&
    state.threat <= 3
  ) {
    return 'steward-of-magadh'
  }
  if (
    state.readiness >= 10 &&
    (state.resources.food < 4 || state.resources.legitimacy < 5)
  ) {
    return 'sword-without-granary'
  }
  return 'fragile-mandala'
}

const build = (
  state: CampaignState,
  command: Extract<CampaignCommand, { type: 'BUILD' }>,
): CampaignState => {
  const forecast = buildingForecast(state, command.building)
  if (!forecast.allowed) {
    return state
  }
  const building = buildings[command.building]
  let next = applyDelta(state, forecast.delta ?? {})
  next = {
    ...next,
    buildings: {
      ...next.buildings,
      [command.building]: next.buildings[command.building] + 1,
    },
    readiness:
      command.building === 'barracks'
        ? clamp(next.readiness + 1, 0, 20)
        : next.readiness,
    threat:
      command.building === 'fort' ? clamp(next.threat - 1, 0, 12) : next.threat,
    builtThisSeason: true,
  }
  return recordEvent(
    next,
    command,
    `${building.name} reaches level ${next.buildings[command.building]}.`,
    forecast.delta,
  )
}

const recruit = (
  state: CampaignState,
  command: Extract<CampaignCommand, { type: 'RECRUIT' }>,
): CampaignState => {
  const forecast = recruitmentForecast(state, command.unit)
  if (!forecast.allowed) {
    return state
  }
  const unit = units[command.unit]
  let next = applyDelta(state, forecast.delta ?? {})
  next = {
    ...next,
    army: {
      ...next.army,
      [command.unit]: next.army[command.unit] + 1,
    },
    recruitedThisSeason: true,
  }
  return recordEvent(
    next,
    command,
    `${unit.name} joins the field army.`,
    forecast.delta,
  )
}

const chooseCouncil = (
  state: CampaignState,
  command: Extract<CampaignCommand, { type: 'CHOOSE_COUNCIL' }>,
): CampaignState => {
  if (state.phase !== 'council' || state.pendingDebateId !== command.debateId) {
    return state
  }
  const debate = debateForSeason(state.season)
  const option = debate?.options.find(
    (candidate) => candidate.id === command.optionId,
  )
  if (!debate || !option) {
    return state
  }
  const next = applyDelta(state, option.effects)
  return recordEvent(
    {
      ...next,
      phase: 'resolution',
      pendingDebateId: null,
      lastReport: [
        `${option.title}: ${option.argument}`,
        'Review the season forecast before advancing.',
      ],
    },
    command,
    `The council chooses: ${option.title}.`,
    option.effects,
  )
}

const advanceSeason = (
  state: CampaignState,
  command: Extract<CampaignCommand, { type: 'ADVANCE_SEASON' }>,
): CampaignState => {
  if (state.phase !== 'resolution') {
    return state
  }
  const forecast = seasonForecast(state)
  const foodBeforeClamp = state.resources.food + forecast.net.food
  const treasuryBeforeClamp =
    state.resources.treasury + forecast.net.treasury
  const shortageDelta: StrategicDelta = {
    readiness:
      (foodBeforeClamp < 0 ? -2 : 0) + (treasuryBeforeClamp < 0 ? -1 : 0),
    legitimacy: foodBeforeClamp < 0 ? -1 : 0,
  }
  let next = applyDelta(state, {
    food: forecast.net.food,
    treasury: forecast.net.treasury,
    threat: forecast.threatGrowth,
    readiness:
      state.buildings.barracks + (shortageDelta.readiness ?? 0),
    legitimacy: shortageDelta.legitimacy ?? 0,
  })
  const report = [
    `Income: +${forecast.income.food} food, +${forecast.income.treasury} treasury.`,
    `Army upkeep: -${forecast.upkeep.food} food, -${forecast.upkeep.treasury} treasury.`,
    `Frontier threat changes by +${forecast.threatGrowth}.`,
  ]
  if (foodBeforeClamp < 0 || treasuryBeforeClamp < 0) {
    report.push('Shortages reduce readiness and public confidence.')
  }

  if (state.season >= state.maxSeasons) {
    next = {
      ...next,
      phase: 'complete',
      ending: determineEnding(next),
      lastReport: report,
    }
  } else if (state.season === 3 && !state.warResolved) {
    next = {
      ...next,
      season: 4,
      phase: 'war-planning',
      builtThisSeason: false,
      recruitedThisSeason: false,
      lastReport: [
        ...report,
        'The frontier armies are now close enough that formation will decide the confrontation.',
      ],
    }
  } else {
    next = {
      ...next,
      season: state.season + 1,
      phase: 'planning',
      builtThisSeason: false,
      recruitedThisSeason: false,
      lastReport: report,
    }
  }

  return recordEvent(
    next,
    command,
    state.season >= state.maxSeasons
      ? 'The six-season campaign concludes.'
      : `Season ${state.season} resolves.`,
    {
      food: forecast.net.food,
      treasury: forecast.net.treasury,
      threat: forecast.threatGrowth,
      readiness: state.buildings.barracks + (shortageDelta.readiness ?? 0),
      legitimacy: shortageDelta.legitimacy ?? 0,
    },
  )
}

const beginWar = (
  state: CampaignState,
  command: Extract<CampaignCommand, { type: 'BEGIN_WAR' }>,
): CampaignState => {
  if (
    state.phase !== 'war-planning' ||
    !formationForecast(state, state.selectedFormation).allowed
  ) {
    return state
  }
  const warResult = resolveWarResult(state)
  return recordEvent(
    {
      ...state,
      phase: 'war',
      warResult,
      lastReport: [
        `The border-war result is fixed as ${warResult.replaceAll('-', ' ')} before the vignette begins.`,
      ],
    },
    command,
    `The army deploys with ${formationNames[state.selectedFormation].toLowerCase()}.`,
  )
}

const completeWar = (
  state: CampaignState,
  command: Extract<CampaignCommand, { type: 'COMPLETE_WAR' }>,
): CampaignState => {
  if (state.phase !== 'war' || !state.warResult) {
    return state
  }
  const effects: Record<WarResult, StrategicDelta> = {
    'decisive-victory': {
      legitimacy: 2,
      treasury: 2,
      threat: -3,
      readiness: 1,
    },
    'costly-victory': {
      legitimacy: 1,
      food: -2,
      treasury: -1,
      threat: -1,
      readiness: -1,
    },
    setback: {
      legitimacy: -2,
      food: -2,
      treasury: -2,
      threat: 1,
      readiness: -3,
    },
  }
  const next = applyDelta(state, effects[state.warResult])
  return recordEvent(
    {
      ...next,
      phase: 'planning',
      warResolved: true,
      builtThisSeason: false,
      recruitedThisSeason: false,
      lastReport: [
        `Border-war outcome: ${state.warResult.replaceAll('-', ' ')}.`,
        'The province now enters a season of consolidation.',
      ],
    },
    command,
    `The border war ends in ${state.warResult.replaceAll('-', ' ')}.`,
    effects[state.warResult],
  )
}

export const mauryaCampaignReducer = (
  state: CampaignState,
  command: CampaignCommand,
): CampaignState => {
  switch (command.type) {
    case 'BUILD':
      return build(state, command)
    case 'RECRUIT':
      return recruit(state, command)
    case 'OPEN_COUNCIL': {
      if (state.phase !== 'planning') {
        return state
      }
      const debate = debateForSeason(state.season)
      if (!debate) {
        return state
      }
      return recordEvent(
        {
          ...state,
          phase: 'council',
          pendingDebateId: debate.id,
        },
        command,
        `The council convenes to debate ${debate.title.toLowerCase()}.`,
      )
    }
    case 'CHOOSE_COUNCIL':
      return chooseCouncil(state, command)
    case 'ADVANCE_SEASON':
      return advanceSeason(state, command)
    case 'SET_FORMATION': {
      if (
        state.phase !== 'war-planning' ||
        !formationForecast(state, command.formation).allowed
      ) {
        return state
      }
      return recordEvent(
        {
          ...state,
          selectedFormation: command.formation,
        },
        command,
        `Formation selected: ${formationNames[command.formation]}.`,
      )
    }
    case 'BEGIN_WAR':
      return beginWar(state, command)
    case 'COMPLETE_WAR':
      return completeWar(state, command)
    default:
      return state
  }
}

export const replayCampaign = (
  seed: number,
  commands: readonly CampaignCommand[],
) =>
  commands.reduce(mauryaCampaignReducer, createMauryaCampaign(seed))
