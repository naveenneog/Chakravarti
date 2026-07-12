import { createMauryaCampaign } from './engine'
import type { CampaignState } from './types'

export const MAURYA_SAVE_KEY = 'chakravarti.mauryan-rise.save'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type CampaignLoadResult = {
  state: CampaignState
  warning?: string
}

const defaultStorage = (): StorageLike | undefined => {
  if (typeof window === 'undefined') {
    return undefined
  }
  return window.localStorage
}

const isCampaignState = (value: unknown): value is CampaignState => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as Partial<CampaignState>
  const resources = candidate.resources as
    | Partial<CampaignState['resources']>
    | undefined
  const buildings = candidate.buildings as
    | Partial<CampaignState['buildings']>
    | undefined
  const army = candidate.army as Partial<CampaignState['army']> | undefined
  const phases: CampaignState['phase'][] = [
    'planning',
    'council',
    'resolution',
    'war-planning',
    'war',
    'complete',
  ]
  return (
    candidate.schemaVersion === 1 &&
    candidate.contentVersion === '0.3.0' &&
    candidate.campaignId === 'mauryan-rise' &&
    typeof candidate.seed === 'number' &&
    typeof candidate.season === 'number' &&
    candidate.season >= 1 &&
    candidate.season <= 6 &&
    typeof candidate.phase === 'string' &&
    phases.includes(candidate.phase as CampaignState['phase']) &&
    Array.isArray(candidate.events) &&
    typeof resources?.food === 'number' &&
    typeof resources.treasury === 'number' &&
    typeof resources.legitimacy === 'number' &&
    typeof buildings?.farm === 'number' &&
    typeof buildings.market === 'number' &&
    typeof buildings.barracks === 'number' &&
    typeof buildings.fort === 'number' &&
    typeof army?.infantry === 'number' &&
    typeof army.archers === 'number' &&
    typeof army.cavalry === 'number' &&
    typeof army.elephants === 'number'
  )
}

const backupInvalidSave = (
  storage: StorageLike,
  raw: string,
  reason: string,
) => {
  const suffix = new Date().toISOString().replaceAll(':', '-')
  storage.setItem(`${MAURYA_SAVE_KEY}.backup.${suffix}`, raw)
  storage.removeItem(MAURYA_SAVE_KEY)
  return reason
}

export const loadMauryaCampaign = (
  storage = defaultStorage(),
): CampaignLoadResult => {
  if (!storage) {
    return { state: createMauryaCampaign() }
  }
  const raw = storage.getItem(MAURYA_SAVE_KEY)
  if (!raw) {
    return { state: createMauryaCampaign() }
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isCampaignState(parsed)) {
      return {
        state: createMauryaCampaign(),
        warning: backupInvalidSave(
          storage,
          raw,
          'The saved campaign used an incompatible schema and was backed up.',
        ),
      }
    }
    return { state: parsed }
  } catch {
    return {
      state: createMauryaCampaign(),
      warning: backupInvalidSave(
        storage,
        raw,
        'The saved campaign was unreadable and was backed up.',
      ),
    }
  }
}

export const saveMauryaCampaign = (
  state: CampaignState,
  storage = defaultStorage(),
) => {
  storage?.setItem(MAURYA_SAVE_KEY, JSON.stringify(state))
}

export const clearMauryaCampaign = (storage = defaultStorage()) => {
  storage?.removeItem(MAURYA_SAVE_KEY)
}
