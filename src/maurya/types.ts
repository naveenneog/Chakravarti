import type { EvidenceKind } from '../game/types'

export type ResourceKey = 'food' | 'treasury' | 'legitimacy'

export type BuildingType = 'farm' | 'market' | 'barracks' | 'fort'

export type UnitType = 'infantry' | 'archers' | 'cavalry' | 'elephants'

export type Formation =
  | 'elephant-center'
  | 'cavalry-flank'
  | 'archer-screen'

export type CampaignPhase =
  | 'planning'
  | 'council'
  | 'resolution'
  | 'war-planning'
  | 'war'
  | 'complete'

export type WarResult = 'decisive-victory' | 'costly-victory' | 'setback'

export type CampaignEnding =
  | 'steward-of-magadh'
  | 'sword-without-granary'
  | 'fragile-mandala'

export type ResourceValues = Record<ResourceKey, number>

export type StrategicDelta = Partial<
  ResourceValues & {
    threat: number
    readiness: number
  }
>

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

export type BuildingDefinition = {
  id: BuildingType
  name: string
  description: string
  role: string
  cost: Partial<ResourceValues>
  evidence: EvidenceRef
}

export type UnitDefinition = {
  id: UnitType
  name: string
  role: string
  counter: string
  cost: Partial<ResourceValues>
  upkeep: Partial<ResourceValues>
  readiness: number
  requirements: Partial<Record<BuildingType, number>>
  legitimacyRequired?: number
  evidence: EvidenceRef
}

export type CouncilOption = {
  id: string
  title: string
  argument: string
  effects: StrategicDelta
  evidence: EvidenceRef
}

export type CouncilDebate = {
  id: string
  season: number
  title: string
  problem: string
  chandraguptaLine: string
  kautilyaLine: string
  context: EvidenceRef
  options: readonly CouncilOption[]
}

export type CampaignCommand =
  | { type: 'BUILD'; building: BuildingType }
  | { type: 'RECRUIT'; unit: UnitType }
  | { type: 'OPEN_COUNCIL' }
  | { type: 'CHOOSE_COUNCIL'; debateId: string; optionId: string }
  | { type: 'ADVANCE_SEASON' }
  | { type: 'SET_FORMATION'; formation: Formation }
  | { type: 'BEGIN_WAR' }
  | { type: 'COMPLETE_WAR' }

export type CampaignEvent = {
  index: number
  season: number
  command: CampaignCommand
  summary: string
  delta?: StrategicDelta
}

export type CampaignState = {
  schemaVersion: 1
  contentVersion: '0.3.0'
  campaignId: 'mauryan-rise'
  seed: number
  season: number
  maxSeasons: 6
  phase: CampaignPhase
  resources: ResourceValues
  buildings: Record<BuildingType, number>
  army: Record<UnitType, number>
  threat: number
  readiness: number
  builtThisSeason: boolean
  recruitedThisSeason: boolean
  pendingDebateId: string | null
  selectedFormation: Formation
  warResult: WarResult | null
  warResolved: boolean
  ending: CampaignEnding | null
  lastReport: string[]
  events: CampaignEvent[]
}

export type ActionForecast = {
  allowed: boolean
  reason?: string
  summary: string
  delta?: StrategicDelta
}
