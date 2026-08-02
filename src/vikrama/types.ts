import type { EvidenceKind } from '../game/types'

/**
 * The Western Horizon — Chandragupta II and the Western Kshatrapas.
 *
 * The design brief for this chapter (project-docs/GAME_DESIGN.md) is explicit:
 * "emphasize grand strategy, routes, diplomacy, and numismatic evidence rather
 * than inventing a single cinematic 'decisive battle'." No securely preserved
 * narrative of the campaign survives, so the chapter refuses to invent one.
 *
 * Instead the constraint becomes the mechanic. The conquest is known chiefly
 * because Western Kshatrapa silver ceases and Chandragupta II's own silver — cut
 * to the Kshatrapa weight and style so local markets would take it — appears in
 * its place. So the player does not win a battle; the player leaves a record.
 * Every action either produces a durable artifact (a coin type, an inscription,
 * a dynastic document) or produces nothing at all, and the ending is a
 * historian's dossier reconstructing the reign from whatever survived.
 */

export type ResourceKey =
  | 'treasury'
  | 'legitimacy'
  | 'alliance'
  | 'reach'
  | 'acceptance'

export type ResourceValues = Record<ResourceKey, number>

export type ResourceDelta = Partial<ResourceValues>

/** The two silver coinages competing in the western markets, as 0..100 shares. */
export type CoinageShares = {
  /** Western Kshatrapa silver still circulating. */
  kshatrapa: number
  /** Gupta silver struck to the Kshatrapa weight standard. */
  gupta: number
}

export type ActionId =
  | 'malwa-road'
  | 'vakataka-marriage'
  | 'strike-silver'
  | 'endow-udayagiri'
  | 'hold-ports'
  | 'confirm-officers'
  | 'winter-court'

export type ArtifactKind =
  | 'coin'
  | 'inscription'
  | 'dynastic-record'
  | 'absence'

/**
 * A trace left in the surviving record — or, for `absence`, the pointed lack of
 * one. Absences are first-class here: they are what makes the chapter's argument.
 */
export type EvidenceArtifact = {
  id: string
  /** Gupta-era year in which the trace was produced. */
  guptaYear: number
  kind: ArtifactKind
  title: string
  detail: string
  /** How the game labels the claim, per HISTORICAL_METHOD.md. */
  label: EvidenceKind
  sourceId: string
}

export type SourceRecord = {
  id: string
  title: string
  detail: string
  url?: string
}

export type EvidenceRef = {
  kind: EvidenceKind
  sourceId: string
  note: string
}

/** What an action does, before per-state adjustment. */
export type CampaignAction = {
  id: ActionId
  title: string
  summary: string
  /** The strategic argument for taking it, in the ruler's terms. */
  rationale: string
  delta: ResourceDelta
  /** Direct effect on the two coinages, applied after resource deltas. */
  coinage?: Partial<CoinageShares>
  /** Only selectable once per campaign. */
  onceOnly?: boolean
  /** Minimum resource levels required before it can be chosen. */
  requires?: ResourceDelta
  /** What the action leaves for a historian, if anything. */
  artifact?: Omit<EvidenceArtifact, 'guptaYear'>
  evidence: EvidenceRef
}

export type CampaignPhase = 'briefing' | 'campaign' | 'dossier'

export type CampaignEnding =
  | 'absorbed-west'
  | 'hollow-conquest'
  | 'overreach'

export type VikramaCommand =
  | { type: 'BEGIN_CAMPAIGN' }
  | { type: 'TAKE_ACTION'; actionId: ActionId }
  | { type: 'CLOSE_DOSSIER' }

export type VikramaEvent = {
  index: number
  command: VikramaCommand
  summary: string
  delta?: ResourceDelta
}

/** One season's snapshot of the two coinages, for the dossier's chart. */
export type CoinageSample = {
  guptaYear: number
  kshatrapa: number
  gupta: number
}

export type VikramaState = {
  schemaVersion: 1
  contentVersion: '0.10.0'
  campaignId: 'western-horizon'
  seed: number
  phase: CampaignPhase
  /** Gupta-era year of the current turn. */
  guptaYear: number
  turn: number
  maxTurns: number
  resources: ResourceValues
  coinage: CoinageShares
  /** Appended once per resolved season; the dossier chart reads this. */
  coinageHistory: CoinageSample[]
  usedActions: ActionId[]
  evidence: EvidenceArtifact[]
  ending: CampaignEnding | null
  report: string[]
  events: VikramaEvent[]
}

/** What a chosen action is projected to do, shown before committing. */
export type ActionForecast = {
  allowed: boolean
  reason?: string
  delta: ResourceDelta
  coinage: CoinageShares
  /** Plain-language note on what the record will (or will not) preserve. */
  recordNote: string
}
