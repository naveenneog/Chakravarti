import type { EvidenceKind } from '../game/types'

/**
 * The Defiance at Narrai — Rani Durgavati of Garha-Katanga, 1564.
 *
 * This is the anthology's chapter on a **hostile record**. Kalinga has one
 * source written by the perpetrator; Saraighat has two traditions that
 * corroborate; The Western Horizon has no narrative at all. Narrai has a
 * narrative — and it belongs entirely to the invaders. No Gond account of these
 * events survives.
 *
 * The verb is **trade**. The outcome is not in doubt and the chapter offers no
 * counterfactual victory. Narrai is a defile, hills on one side and the Gaur and
 * Narmada on the other, and what the player controls is what they are willing to
 * spend, and for what: the price the invasion pays, or the people who get out.
 *
 * Two hard rules, carried over from project-docs/NARRAI_BRIEF.md:
 * - The queen's death is **never a playable mechanic**. It appears once, in an
 *   evidence-labelled epilogue, with its provenance stated.
 * - Chronicle figures from the victors' side are labelled as claims and are
 *   never used as balance numbers.
 */

export type ResourceKey =
  | 'warriors'
  | 'elephants'
  | 'ground'
  | 'sheltered'
  | 'resolve'

export type ResourceValues = Record<ResourceKey, number>

export type ResourceDelta = Partial<ResourceValues>

export type ActionId =
  | 'hold-defile'
  | 'give-ground'
  | 'evacuate'
  | 'night-attack'
  | 'call-for-help'
  | 'elephants-forward'
  | 'refuse-summons'

export type SourceRecord = {
  id: string
  title: string
  detail: string
}

/**
 * One thing the player did. The point of the chapter is the gap between this
 * and the surviving account, so each entry says whether the record preserves it.
 */
export type DeedRecord = {
  id: string
  title: string
  /** What actually happened in the player's campaign. */
  deed: string
  /** Whether the surviving invader-side account preserves it at all. */
  preserved: boolean
  label: EvidenceKind
  sourceId: string
}

export type CampaignAction = {
  id: ActionId
  title: string
  summary: string
  rationale: string
  delta: ResourceDelta
  /** Price imposed on the invasion, 0..100 cumulative. */
  costDelta?: number
  onceOnly?: boolean
  requires?: ResourceDelta
  deed: DeedRecord
}

export type CampaignPhase = 'briefing' | 'campaign' | 'epilogue'

export type CampaignEnding =
  | 'remembered'
  | 'costly'
  | 'sheltered'
  | 'overrun'

export type NarraiCommand =
  | { type: 'BEGIN_CAMPAIGN' }
  | { type: 'TAKE_ACTION'; actionId: ActionId }

export type NarraiEvent = {
  index: number
  command: NarraiCommand
  summary: string
}

export type NarraiState = {
  schemaVersion: 1
  contentVersion: '0.11.0'
  campaignId: 'defiance-at-narrai'
  seed: number
  phase: CampaignPhase
  turn: number
  maxTurns: number
  resources: ResourceValues
  /** Cumulative price the invasion has paid, 0..100. */
  costImposed: number
  usedActions: ActionId[]
  deeds: DeedRecord[]
  ending: CampaignEnding | null
  report: string[]
  events: NarraiEvent[]
}

export type ActionForecast = {
  allowed: boolean
  reason?: string
  delta: ResourceDelta
  costDelta: number
}
