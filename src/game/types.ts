export type Faction = 'maurya' | 'kalinga'

export type UnitKind =
  | 'commander'
  | 'infantry'
  | 'archer'
  | 'cavalry'
  | 'elephant'
  | 'militia'

export type Terrain = 'plain' | 'forest' | 'hill' | 'river' | 'village'

export type BattlePhase = 'player' | 'enemy' | 'complete'

export type BattleResult = 'maurya-victory' | 'kalinga-victory' | 'stalemate'

export type CampaignStatus = 'playable' | 'planned' | 'research'

export type EvidenceKind = 'recorded' | 'source-claim' | 'reconstruction'

export type Position = Readonly<{
  row: number
  col: number
}>

export type Unit = {
  id: string
  faction: Faction
  kind: UnitKind
  name: string
  hp: number
  maxHp: number
  attack: number
  armor: number
  move: number
  range: number
  position: Position
  moved: boolean
  acted: boolean
}

export type HistoryMoment = {
  title: string
  kind: EvidenceKind
  text: string
}

export type Scenario = {
  id: string
  title: string
  subtitle: string
  rows: number
  cols: number
  maxTurns: number
  objective: string
  restraintTarget: number
  terrain: Readonly<Record<string, Terrain>>
  units: readonly Unit[]
  historyMoments: readonly HistoryMoment[]
}

export type BattleState = {
  scenario: Scenario
  turn: number
  phase: BattlePhase
  result: BattleResult | null
  selectedUnitId: string | null
  humanCost: number
  units: Unit[]
  log: string[]
}

export type Campaign = {
  id: string
  figure: string
  title: string
  era: string
  region: string
  status: CampaignStatus
  evidence: string
  description: string
}
