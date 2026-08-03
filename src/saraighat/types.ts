import type { EvidenceKind } from '../game/types'

/**
 * The Brahmaputra Holds — Lachit Borphukan and the defence of Guwahati,
 * culminating at Saraighat (1671).
 *
 * This is the anthology's chapter on **corroboration**. Kalinga has one source
 * written by the perpetrator; The Western Horizon has no narrative at all.
 * Saraighat is the opposite problem, and a much happier one: the Assamese
 * buranji chronicle tradition and the Mughal-side accounts broadly agree that
 * this campaign happened, who commanded it and how it ended. The chapter shows
 * the player both traditions side by side and marks where they corroborate.
 *
 * The verb is **choose the ground**. The sources are explicit that the Ahom
 * command picked its battlefield deliberately: hills around Guwahati to deny
 * Mughal cavalry its mobility, mud embankments to make the land approach
 * impassable, and therefore a river fight in the narrows, where a large fleet
 * could not deploy. Fighting anywhere else is punished — as it historically was
 * at Alaboi.
 */

export type ResourceKey =
  | 'manpower'
  | 'embankments'
  | 'riverCraft'
  | 'alliances'
  | 'cohesion'

export type ResourceValues = Record<ResourceKey, number>

export type ResourceDelta = Partial<ResourceValues>

/**
 * Where the decisive engagement will be fought. Derived from preparation, not
 * chosen directly — which is the point: you earn the narrows by making every
 * other approach impossible.
 */
export type Ground = 'open-field' | 'guwahati-hills' | 'saraighat-narrows'

export type ActionId =
  | 'rebuild-khels'
  | 'raise-embankments'
  | 'build-boats'
  | 'renew-alliances'
  | 'sham-negotiation'
  | 'guerrilla-raids'
  | 'accept-open-battle'

/**
 * How the two surviving traditions treat a claim. The chapter's whole
 * presentational idea is that these are shown together.
 */
export type Corroboration = {
  id: string
  title: string
  /** What the Assamese buranji tradition records. */
  buranji: string
  /** What the Mughal-side accounts record, when they speak to it. */
  mughal: string
  /** True when the two traditions broadly agree. */
  agrees: boolean
  label: EvidenceKind
  sourceId: string
}

export type SourceRecord = {
  id: string
  title: string
  detail: string
  url?: string
}

export type CampaignAction = {
  id: ActionId
  title: string
  summary: string
  rationale: string
  delta: ResourceDelta
  /** Change to Mughal pressure. Negative buys time. */
  pressureDelta?: number
  onceOnly?: boolean
  requires?: ResourceDelta
  corroboration: Corroboration
}

export type CampaignPhase = 'briefing' | 'campaign' | 'debrief'

export type CampaignEnding =
  | 'river-holds'
  | 'guwahati-falls'
  | 'terms-accepted'

export type SaraighatCommand =
  | { type: 'BEGIN_CAMPAIGN' }
  | { type: 'TAKE_ACTION'; actionId: ActionId }
  | { type: 'ACCEPT_TERMS' }

export type SaraighatEvent = {
  index: number
  command: SaraighatCommand
  summary: string
  year: number
}

export type SaraighatState = {
  schemaVersion: 1
  contentVersion: '0.11.0'
  campaignId: 'brahmaputra-holds'
  seed: number
  phase: CampaignPhase
  year: number
  turn: number
  maxTurns: number
  resources: ResourceValues
  /** How close the Mughal army is to forcing the decision, 0..100. */
  mughalPressure: number
  usedActions: ActionId[]
  /** Corroboration entries earned so far, newest last. */
  record: Corroboration[]
  ending: CampaignEnding | null
  battle: BattleReport | null
  report: string[]
  events: SaraighatEvent[]
}

export type ActionForecast = {
  allowed: boolean
  reason?: string
  delta: ResourceDelta
  pressureDelta: number
}

export type BattleReport = {
  ground: Ground
  /** 0..100 strength the Ahom side brings to the ground actually fought on. */
  ahomStrength: number
  /** 0..100 strength the Mughal side can bring to bear on that ground. */
  mughalStrength: number
  ending: CampaignEnding
  lines: string[]
}
