const STORY_INTRO_KEY = 'chakravarti.fall-of-nandas.story-intro-seen'
const TUTORIAL_KEY = 'chakravarti.fall-of-nandas.tutorial-seen'

const storage = (): Pick<Storage, 'getItem' | 'setItem'> | undefined => {
  if (typeof window === 'undefined') {
    return undefined
  }
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

const readFlag = (key: string): boolean => {
  try {
    return storage()?.getItem(key) === 'true'
  } catch {
    return false
  }
}

const writeFlag = (key: string) => {
  try {
    storage()?.setItem(key, 'true')
  } catch {
    // A full or blocked storage should never stop the player from playing.
  }
}

export const hasSeenStoryIntro = (): boolean => readFlag(STORY_INTRO_KEY)
export const markStoryIntroSeen = (): void => writeFlag(STORY_INTRO_KEY)
export const hasSeenTutorial = (): boolean => readFlag(TUTORIAL_KEY)
export const markTutorialSeen = (): void => writeFlag(TUTORIAL_KEY)
