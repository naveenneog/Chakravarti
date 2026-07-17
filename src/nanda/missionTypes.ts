export type NandaMissionControls = {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  jump: boolean
  attack: boolean
  interact: boolean
  heal: boolean
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
})
