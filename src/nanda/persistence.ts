import { createActionFirstCampaign } from './engine'
import type { NandaCampaignState } from './types'

export const NANDA_SAVE_KEY = 'chakravarti.fall-of-nandas.save'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type NandaLoadResult = {
  state: NandaCampaignState
  warning?: string
}

const defaultStorage = (): StorageLike | undefined => {
  if (typeof window === 'undefined') {
    return undefined
  }
  return window.localStorage
}

const isNandaCampaignState = (
  value: unknown,
): value is NandaCampaignState => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as Partial<NandaCampaignState>
  const strategy = candidate.strategy as
    | Partial<NandaCampaignState['strategy']>
    | undefined
  const plans = candidate.selectedPlans as
    | Partial<NandaCampaignState['selectedPlans']>
    | undefined
  const phases: NandaCampaignState['phase'][] = [
    'briefing',
    'planning',
    'mission',
    'debrief',
    'complete',
  ]
  const intelligencePlans = [null, 'watch-rotations', 'court-rumors']
  const alliancePlans = [null, 'guild-network', 'frontier-veterans']
  const logisticsPlans = [null, 'hidden-caches', 'light-kit']
  const missionModifiers = candidate.missionModifiers as
    | Partial<NonNullable<NandaCampaignState['missionModifiers']>>
    | null
    | undefined
  const missionResult = candidate.missionResult as
    | Partial<NonNullable<NandaCampaignState['missionResult']>>
    | null
    | undefined
  const outcomes: NandaCampaignState['outcome'][] = [
    null,
    'coalition-entry',
    'costly-entry',
    'withdrawal',
  ]
  const missionStateValid =
    candidate.phase === 'briefing' || candidate.phase === 'planning'
      ? candidate.missionModifiers === null
      : typeof missionModifiers?.maxHealth === 'number' &&
        typeof missionModifiers.attackDamage === 'number' &&
        typeof missionModifiers.moveSpeed === 'number' &&
        typeof missionModifiers.jumpForce === 'number' &&
        typeof missionModifiers.enemyCount === 'number' &&
        typeof missionModifiers.enemyHealth === 'number' &&
        typeof missionModifiers.requiredObjectives === 'number' &&
        typeof missionModifiers.securedObjectives === 'number' &&
        typeof missionModifiers.healingCharges === 'number' &&
        typeof missionModifiers.revealObjectives === 'boolean' &&
        typeof missionModifiers.sideGateOpen === 'boolean' &&
        typeof missionModifiers.routeLabel === 'string'
  const resultStateValid =
    candidate.phase === 'debrief' || candidate.phase === 'complete'
      ? typeof missionResult?.success === 'boolean' &&
        typeof missionResult.healthRemaining === 'number' &&
        typeof missionResult.maxHealth === 'number' &&
        typeof missionResult.guardsDefeated === 'number' &&
        typeof missionResult.objectivesSecured === 'number' &&
        typeof missionResult.requiredObjectives === 'number' &&
        typeof missionResult.elapsedSeconds === 'number' &&
        typeof missionResult.healingUsed === 'number' &&
        typeof missionResult.routeLabel === 'string' &&
        outcomes.includes(candidate.outcome ?? null)
      : candidate.missionResult === null && candidate.outcome === null
  return (
    candidate.schemaVersion === 1 &&
    candidate.contentVersion === '0.4.1' &&
    candidate.campaignId === 'fall-of-nandas' &&
    typeof candidate.seed === 'number' &&
    typeof candidate.phase === 'string' &&
    phases.includes(candidate.phase as NandaCampaignState['phase']) &&
    Array.isArray(candidate.events) &&
    typeof strategy?.treasury === 'number' &&
    typeof strategy.legitimacy === 'number' &&
    typeof strategy.popularSupport === 'number' &&
    typeof strategy.unrest === 'number' &&
    typeof strategy.intelligence === 'number' &&
    intelligencePlans.includes(plans?.intelligence ?? null) &&
    alliancePlans.includes(plans?.alliance ?? null) &&
    logisticsPlans.includes(plans?.logistics ?? null) &&
    missionStateValid &&
    resultStateValid
  )
}

const backupInvalidSave = (
  storage: StorageLike,
  raw: string,
  reason: string,
) => {
  const suffix = new Date().toISOString().replaceAll(':', '-')
  storage.setItem(`${NANDA_SAVE_KEY}.backup.${suffix}`, raw)
  storage.removeItem(NANDA_SAVE_KEY)
  return reason
}

export const loadNandaCampaign = (
  storage = defaultStorage(),
): NandaLoadResult => {
  if (!storage) {
    return { state: createActionFirstCampaign() }
  }
  const raw = storage.getItem(NANDA_SAVE_KEY)
  if (!raw) {
    return { state: createActionFirstCampaign() }
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isNandaCampaignState(parsed)) {
      return {
        state: createActionFirstCampaign(),
        warning: backupInvalidSave(
          storage,
          raw,
          'The saved action campaign used an incompatible schema and was backed up.',
        ),
      }
    }
    return { state: parsed }
  } catch {
    return {
      state: createActionFirstCampaign(),
      warning: backupInvalidSave(
        storage,
        raw,
        'The saved action campaign was unreadable and was backed up.',
      ),
    }
  }
}

export const saveNandaCampaign = (
  state: NandaCampaignState,
  storage = defaultStorage(),
) => {
  storage?.setItem(NANDA_SAVE_KEY, JSON.stringify(state))
}

export const clearNandaCampaign = (storage = defaultStorage()) => {
  storage?.removeItem(NANDA_SAVE_KEY)
}
