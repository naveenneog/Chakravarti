import { createVikramaCampaign } from './engine'
import type { VikramaState } from './types'

export const VIKRAMA_SAVE_KEY = 'chakravarti.western-horizon.save'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type VikramaLoadResult = {
  state: VikramaState
  warning?: string
}

const defaultStorage = (): StorageLike | undefined => {
  if (typeof window === 'undefined') {
    return undefined
  }
  return window.localStorage
}

const isVikramaState = (value: unknown): value is VikramaState => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as Partial<VikramaState>
  const resources = candidate.resources as
    | Partial<VikramaState['resources']>
    | undefined
  const coinage = candidate.coinage as
    | Partial<VikramaState['coinage']>
    | undefined
  return (
    candidate.schemaVersion === 1 &&
    candidate.campaignId === 'western-horizon' &&
    typeof candidate.turn === 'number' &&
    typeof candidate.guptaYear === 'number' &&
    Array.isArray(candidate.evidence) &&
    Array.isArray(candidate.events) &&
    !!resources &&
    typeof resources.treasury === 'number' &&
    typeof resources.acceptance === 'number' &&
    !!coinage &&
    typeof coinage.kshatrapa === 'number' &&
    typeof coinage.gupta === 'number'
  )
}

export const loadVikramaCampaign = (
  storage: StorageLike | undefined = defaultStorage(),
): VikramaLoadResult => {
  if (!storage) {
    return { state: createVikramaCampaign() }
  }
  const raw = storage.getItem(VIKRAMA_SAVE_KEY)
  if (!raw) {
    return { state: createVikramaCampaign() }
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isVikramaState(parsed)) {
      return {
        state: createVikramaCampaign(),
        warning: 'A saved western campaign could not be read and was restarted.',
      }
    }
    if (parsed.contentVersion !== '0.10.0') {
      return {
        state: createVikramaCampaign(),
        warning:
          'The western campaign content changed since your last save, so it was restarted.',
      }
    }
    return { state: parsed }
  } catch {
    return {
      state: createVikramaCampaign(),
      warning: 'A saved western campaign could not be read and was restarted.',
    }
  }
}

export const saveVikramaCampaign = (
  state: VikramaState,
  storage: StorageLike | undefined = defaultStorage(),
) => {
  storage?.setItem(VIKRAMA_SAVE_KEY, JSON.stringify(state))
}

export const clearVikramaCampaign = (
  storage: StorageLike | undefined = defaultStorage(),
) => {
  storage?.removeItem(VIKRAMA_SAVE_KEY)
}
