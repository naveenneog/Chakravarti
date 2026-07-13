import type { EvidenceKind } from '../game/types'

export type PlanCategory = 'intelligence' | 'alliance' | 'logistics'

export type IntelligencePlan = 'watch-rotations' | 'court-rumors'

export type AlliancePlan = 'guild-network' | 'frontier-veterans'

export type LogisticsPlan = 'hidden-caches' | 'light-kit'

export type PlanId = IntelligencePlan | AlliancePlan | LogisticsPlan

export type NandaPhase =
  | 'briefing'
  | 'planning'
  | 'mission'
  | 'debrief'
  | 'complete'

export type MissionOutcome =
  | 'coalition-entry'
  | 'costly-entry'
  | 'withdrawal'

export type StrategyValues = {
  treasury: number
  legitimacy: number
  popularSupport: number
  unrest: number
  intelligence: number
}

export type StrategyDelta = Partial<StrategyValues>

export type EvidenceRef = {
  kind: EvidenceKind
  sourceId: string
  note: string
}

export type SourceRecord = {
  id: string
  title: string
  detail: string
  url?: string
}

export type MissionEffect = Partial<{
  maxHealth: number
  attackDamage: number
  moveSpeed: number
  jumpForce: number
  enemyCount: number
  enemyHealth: number
  securedObjectives: number
  healingCharges: number
  revealObjectives: boolean
  sideGateOpen: boolean
  routeLabel: string
}>

export type PlanOption = {
  id: PlanId
  category: PlanCategory
  title: string
  summary: string
  consequence: string
  strategicDelta: StrategyDelta
  missionEffect: MissionEffect
  evidence: EvidenceRef
}

export type SelectedPlans = Record<PlanCategory, PlanId | null>

export type MissionModifiers = {
  maxHealth: number
  attackDamage: number
  moveSpeed: number
  jumpForce: number
  enemyCount: number
  enemyHealth: number
  requiredObjectives: number
  securedObjectives: number
  healingCharges: number
  revealObjectives: boolean
  sideGateOpen: boolean
  routeLabel: string
}

export type MissionResult = {
  success: boolean
  healthRemaining: number
  maxHealth: number
  guardsDefeated: number
  objectivesSecured: number
  requiredObjectives: number
  elapsedSeconds: number
  healingUsed: number
  routeLabel: string
}

export type NandaCommand =
  | { type: 'OPEN_PLANNING' }
  | { type: 'SELECT_PLAN'; category: PlanCategory; planId: PlanId }
  | { type: 'BEGIN_MISSION' }
  | { type: 'COMPLETE_MISSION'; result: MissionResult }
  | { type: 'FINISH_DEBRIEF' }

export type NandaEvent = {
  index: number
  command: NandaCommand
  summary: string
  strategicDelta?: StrategyDelta
}

export type NandaCampaignState = {
  schemaVersion: 1
  contentVersion: '0.4.0'
  campaignId: 'fall-of-nandas'
  seed: number
  phase: NandaPhase
  strategy: StrategyValues
  selectedPlans: SelectedPlans
  missionModifiers: MissionModifiers | null
  missionResult: MissionResult | null
  outcome: MissionOutcome | null
  lastReport: string[]
  events: NandaEvent[]
}

export type PlanForecast = {
  allowed: boolean
  reason?: string
  summary: string
  strategicDelta?: StrategyDelta
  missionEffect?: MissionEffect
}
