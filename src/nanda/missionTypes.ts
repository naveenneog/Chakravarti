import type { GuardOutcome, StrikeKind } from './combat'

export type NandaMissionControls = {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  jump: boolean
  attack: boolean
  interact: boolean
  heal: boolean
  guard: boolean
}

/** The most recent close-combat beat, for on-screen feedback. */
export type CombatFeedback = {
  /** Monotonic id so the UI can re-trigger an animation for a repeat outcome. */
  id: number
  kind: GuardOutcome | StrikeKind | null
}

export type NandaMissionHud = {
  health: number
  maxHealth: number
  guardsDefeated: number
  enemyCount: number
  objectivesSecured: number
  requiredObjectives: number
  healingCharges: number
  healingUsed: number
  elapsedSeconds: number
  prompt: string
  bossActive: boolean
  bossHealth: number
  bossMaxHealth: number
  bossPhase: number
  bossDefeated: boolean
  /** 0..1 Resolve remaining in the guard. */
  resolve: number
  /** True while the guard is raised. */
  guarding: boolean
  /** True during the guard-break lockout. */
  guardBroken: boolean
  /** True while a riposte window is open. */
  riposteReady: boolean
  /** Parries and perfect parries landed this run. */
  parries: number
  perfectParries: number
  feedback: CombatFeedback
}

export const createMissionControls = (): NandaMissionControls => ({
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  attack: false,
  interact: false,
  heal: false,
  guard: false,
})
