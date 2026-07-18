import type { NandaMissionHud } from './missionTypes'
import type { MissionModifiers } from './types'
import { timberGateDefinition } from './timberGateDefinition'

/**
 * The mission HUD snapshot shown before the first frame renders.
 *
 * Gate 12 of the mission-definition migration: the initial boss-health readout
 * comes from the mission definition's boss encounter (single source of truth
 * with the NandaMission runtime). This lives in its own module so it can be unit
 * tested without loading the full campaign component graph.
 */
export const initialHud = (modifiers: MissionModifiers): NandaMissionHud => {
  const bossDef = timberGateDefinition.encounters.boss
  if (!bossDef) {
    throw new Error('The Timber Gate mission requires a boss encounter definition')
  }
  return {
    health: modifiers.maxHealth,
    maxHealth: modifiers.maxHealth,
    guardsDefeated: 0,
    enemyCount: modifiers.enemyCount,
    objectivesSecured: modifiers.securedObjectives,
    requiredObjectives: modifiers.requiredObjectives,
    healingCharges: modifiers.healingCharges,
    healingUsed: 0,
    elapsedSeconds: 0,
    prompt: timberGateDefinition.presentation.copy.initialPrompt,
    bossActive: false,
    bossHealth: bossDef.maxHealth,
    bossMaxHealth: bossDef.maxHealth,
    bossPhase: 1,
    bossDefeated: false,
  }
}
