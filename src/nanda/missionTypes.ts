import type { GuardOutcome, StrikeKind } from './combat'

export type NandaMissionControls = {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  jump: boolean
  attack: boolean
  /**
   * Set on press and cleared once the mission loop consumes it, so a tap
   * shorter than a single frame still lands a cut.
   */
  attackPressed: boolean
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
  /** 0 when idle, else which cut of the three-cut chain is running. */
  comboStep: number
  /** Banked flow links, 0..2. */
  comboFlow: number
  /** Player-facing name of the running cut. */
  comboLabel: string
  /** Display name of the nearest engaged enemy, so the roster teaches itself. */
  threat: string | null
  feedback: CombatFeedback
}

export const createMissionControls = (): NandaMissionControls => ({
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  attack: false,
  attackPressed: false,
  interact: false,
  heal: false,
  guard: false,
})
