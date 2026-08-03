import type { EvidenceKind } from '../game/types'

/**
 * The Hills of Pratapgad — 10 November 1659.
 *
 * This is the anthology's chapter on an **irreconcilable record**. Kalinga has
 * one source written by the perpetrator; Saraighat has two traditions that
 * corroborate; Narrai has a narrative that belongs to the invaders; The Western
 * Horizon has no narrative at all. Pratapgad has several narratives that
 * contradict each other on the one question everyone asks, and the chapter
 * refuses to adjudicate it.
 *
 * The verb is **arrange**. Per project-docs/PRATAPGAD_BRIEF.md the player never
 * fights: they scout the wooded approach, place lookouts, conceal the reserve,
 * establish the signal line and hold the withdrawal route. The encounter beneath
 * the fort is a non-interactive, evidence-labelled epilogue presented as a
 * disputed event. These are hard constraints, not stylistic ones:
 *
 * - The player never performs a killing blow as a mechanic.
 * - Afzal Khan is never a boss, a health bar, or a kill objective.
 * - The chapter never states who struck first. It shows the accounts and stops.
 * - No communal or religious framing, and no invented quotations.
 */

export type ResourceKey =
  | 'intelligence'
  | 'lookouts'
  | 'reserve'
  | 'signal'
  | 'withdrawal'

export type ResourceValues = Record<ResourceKey, number>

export type ResourceDelta = Partial<ResourceValues>

export type ActionId =
  | 'scout-approach'
  | 'place-lookouts'
  | 'conceal-reserve'
  | 'lay-signal-line'
  | 'hold-withdrawal'
  | 'clear-the-ground'
  | 'send-envoy'

export type SourceRecord = {
  id: string
  title: string
  detail: string
}

/** One preparation, and what a later account can actually say about it. */
export type PreparationRecord = {
  id: string
  title: string
  detail: string
  label: EvidenceKind
  sourceId: string
}

/**
 * A question the surviving accounts disagree about. The chapter presents these
 * unresolved, by design, and never picks a winner.
 */
export type DisputedPoint = {
  id: string
  question: string
  accounts: readonly { tradition: string; claim: string }[]
  /** Why the dispute cannot currently be settled. */
  unresolved: string
}

export type CampaignAction = {
  id: ActionId
  title: string
  summary: string
  rationale: string
  delta: ResourceDelta
  onceOnly?: boolean
  requires?: ResourceDelta
  preparation: PreparationRecord
}

export type CampaignPhase = 'briefing' | 'preparation' | 'aftermath'

export type CampaignEnding =
  | 'ground-prepared'
  | 'partly-ready'
  | 'exposed'

export type PratapgadCommand =
  | { type: 'BEGIN_PREPARATION' }
  | { type: 'TAKE_ACTION'; actionId: ActionId }
  | { type: 'COMMIT' }

export type PratapgadEvent = {
  index: number
  command: PratapgadCommand
  summary: string
}

export type PratapgadState = {
  schemaVersion: 1
  contentVersion: '0.11.0'
  campaignId: 'hills-of-pratapgad'
  seed: number
  phase: CampaignPhase
  turn: number
  maxTurns: number
  resources: ResourceValues
  usedActions: ActionId[]
  preparations: PreparationRecord[]
  ending: CampaignEnding | null
  report: string[]
  events: PratapgadEvent[]
}

export type ActionForecast = {
  allowed: boolean
  reason?: string
  delta: ResourceDelta
}

export type Readiness = {
  /** 0..100 raw mean of the five elements. Used by the ending thresholds. */
  score: number
  /**
   * The raw score as a percentage of what is actually achievable in the time
   * available, so a well-prepared ground does not read as "35 out of 100".
   */
  percent: number
  /** The weakest element, named, so the debrief can be specific. */
  weakest: ResourceKey
  ending: CampaignEnding
  lines: string[]
}
