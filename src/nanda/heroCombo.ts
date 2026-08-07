/**
 * The three-cut chain: Chandragupta's multi-step sword combo.
 *
 * The mission already had one flat swing, so every fight was solved by tapping
 * Strike as fast as possible. This turns attacking into a decision by making
 * the chain **asymmetric**:
 *
 * - Cut 1 (opening) is fast and safe but light, and a raised shield eats it.
 * - Cut 2 (cross) comes from the other side and hits harder.
 * - Cut 3 (cleave) is the only swing that strips a raised guard, but it is slow
 *   and leaves a long recovery that a javelineer or archer will punish.
 *
 * So spamming cut 1 is survivable but cannot beat a shieldbearer, and committing
 * to the full chain beats him but exposes you to everyone else. That tension is
 * the point.
 *
 * Timing is rewarded twice over: an input inside the tighter *flow* window
 * compounds a damage bonus across the chain, and an input during the swing is
 * buffered rather than dropped, so the chain reads as fluid instead of finicky.
 *
 * Pure and engine-agnostic: no THREE, no React, no timers. The render loop
 * advances it with a delta and reads the result.
 */

export type CutKind = 'opening' | 'cross' | 'cleave'

export type ComboPhase = 'idle' | 'windup' | 'active' | 'recovery'

export type CutProfile = {
  kind: CutKind
  /** Animation clip that plays for this cut. */
  clip: string
  /** Playback rate applied to the clip so each cut reads at its own tempo. */
  timeScale: number
  /** Multiplier applied to the player's base swing damage. */
  damageMultiplier: number
  /** Melee reach in metres. */
  reach: number
  /** Half-angle of the swing arc, in radians. */
  arc: number
  /** Seconds before the blade becomes dangerous. */
  windup: number
  /** Seconds the blade stays dangerous. */
  active: number
  /** Seconds of recovery after the active frames. */
  recovery: number
  /** Extra recovery multiplier applied when the cut hit nothing. */
  whiffRecoveryMultiplier: number
  /** True when this cut strips a raised guard instead of being blocked. */
  breaksGuard: boolean
  /** Resolve spent when the cut starts, as a fraction of the 0..1 meter. */
  resolveCost: number
  /** Screen-shake / hit-stop weighting, 0..1. */
  weight: number
}

export type ComboConfig = {
  /**
   * Seconds after the active frames during which the next input still links.
   * Beyond this the chain resets to cut 1.
   */
  linkGrace: number
  /** Fraction of the link window, measured from its start, that counts as flow. */
  flowFraction: number
  /** Damage bonus added per consecutive flow link. */
  flowBonus: number
  /** Maximum number of flow links that can be banked. */
  maxFlow: number
}

export const COMBO_CONFIG: ComboConfig = {
  linkGrace: 0.34,
  flowFraction: 0.55,
  flowBonus: 0.12,
  maxFlow: 2,
}

/**
 * Cut profiles. `Punch` and `SwordSlash` ship with the CC0 rig; `Cleave` is a
 * project-authored clip (see swordAnimations.ts) because an overhead finisher
 * has to read completely differently from the two lighter cuts.
 */
export const CUTS: readonly CutProfile[] = [
  {
    kind: 'opening',
    clip: 'SwordSlash',
    timeScale: 1.55,
    damageMultiplier: 0.85,
    reach: 1.95,
    arc: 1.05,
    windup: 0.1,
    active: 0.08,
    recovery: 0.18,
    whiffRecoveryMultiplier: 1.35,
    breaksGuard: false,
    resolveCost: 0,
    weight: 0.45,
  },
  {
    kind: 'cross',
    clip: 'CrossCut',
    timeScale: 1.4,
    damageMultiplier: 1.05,
    reach: 2.05,
    arc: 0.95,
    windup: 0.13,
    active: 0.09,
    recovery: 0.24,
    whiffRecoveryMultiplier: 1.35,
    breaksGuard: false,
    resolveCost: 0,
    weight: 0.62,
  },
  {
    kind: 'cleave',
    clip: 'Cleave',
    timeScale: 1.0,
    damageMultiplier: 1.75,
    reach: 2.2,
    arc: 0.8,
    windup: 0.26,
    active: 0.12,
    recovery: 0.52,
    whiffRecoveryMultiplier: 1.25,
    breaksGuard: true,
    resolveCost: 0.12,
    weight: 1,
  },
]

export type ComboState = {
  /** 0 when idle, otherwise the 1-based index of the running cut. */
  step: number
  phase: ComboPhase
  /** Seconds since the current cut started. */
  elapsed: number
  /** An input arrived too early and is waiting for the link window. */
  buffered: boolean
  /** Consecutive links landed inside the flow window. */
  flow: number
  /** True once the running cut has connected with something. */
  hit: boolean
  /** Seconds left before an un-continued chain resets to cut 1. */
  linkRemaining: number
}

export const createComboState = (): ComboState => ({
  step: 0,
  phase: 'idle',
  elapsed: 0,
  buffered: false,
  flow: 0,
  hit: false,
  linkRemaining: 0,
})

export const cutAt = (step: number): CutProfile | null =>
  step >= 1 && step <= CUTS.length ? CUTS[step - 1] : null

export const activeCut = (state: ComboState): CutProfile | null =>
  cutAt(state.step)

/** Total seconds a cut occupies, accounting for a whiffed recovery. */
export const cutDuration = (cut: CutProfile, hit: boolean): number =>
  cut.windup +
  cut.active +
  cut.recovery * (hit ? 1 : cut.whiffRecoveryMultiplier)

/** True while the blade is dangerous. */
export const isCutActive = (state: ComboState): boolean =>
  state.phase === 'active'

/**
 * Damage multiplier for the running cut, including the banked flow bonus.
 * Flow is deliberately additive rather than multiplicative so a perfectly timed
 * chain is a meaningful reward and not a damage explosion.
 */
export const comboDamageMultiplier = (
  state: ComboState,
  cfg: ComboConfig = COMBO_CONFIG,
): number => {
  const cut = activeCut(state)
  if (!cut) {
    return 0
  }
  return cut.damageMultiplier * (1 + state.flow * cfg.flowBonus)
}

export type StrikeRequest = {
  /** True when a new cut actually began this call. */
  started: boolean
  /** The cut that began, when one did. */
  cut: CutProfile | null
  /** 1-based index of the cut that began. */
  step: number
  /** True when the press was stored for the upcoming link window instead. */
  buffered: boolean
  /** True when the press landed inside the tighter flow window. */
  flowed: boolean
}

const IGNORED: StrikeRequest = {
  started: false,
  cut: null,
  step: 0,
  buffered: false,
  flowed: false,
}

const beginCut = (
  state: ComboState,
  step: number,
  flowed: boolean,
  cfg: ComboConfig,
): StrikeRequest => {
  state.step = step
  state.phase = 'windup'
  state.elapsed = 0
  state.buffered = false
  state.hit = false
  state.linkRemaining = 0
  state.flow = flowed ? Math.min(cfg.maxFlow, state.flow + 1) : 0
  return {
    started: true,
    cut: cutAt(step),
    step,
    buffered: false,
    flowed,
  }
}

/**
 * Ask to swing. Returns what happened so the caller can spend Resolve, play a
 * clip and fire audio without re-deriving any of it.
 *
 * `availableResolve` gates only the cleave; the two light cuts are always free
 * so the player is never left unable to attack at all.
 */
export const requestStrike = (
  state: ComboState,
  availableResolve: number,
  cfg: ComboConfig = COMBO_CONFIG,
): StrikeRequest => {
  if (state.phase === 'idle') {
    return beginCut(state, 1, false, cfg)
  }

  // Mid-swing: remember the press and spend it the moment the link opens.
  if (state.phase === 'windup' || state.phase === 'active') {
    state.buffered = true
    return { ...IGNORED, buffered: true }
  }

  // Recovery is the link window.
  const next = state.step + 1
  const upcoming = cutAt(next)
  if (!upcoming) {
    return IGNORED
  }
  if (upcoming.resolveCost > availableResolve) {
    return IGNORED
  }
  const cut = activeCut(state)
  if (!cut) {
    return IGNORED
  }
  const window = cut.recovery * (state.hit ? 1 : cut.whiffRecoveryMultiplier)
  const intoRecovery = state.elapsed - cut.windup - cut.active
  const flowed = intoRecovery <= window * cfg.flowFraction
  return beginCut(state, next, flowed, cfg)
}

export type ComboEvent =
  | { type: 'active' }
  | { type: 'recovery' }
  | { type: 'link-opened'; step: number }
  | { type: 'chain-dropped'; step: number }
  | { type: 'started'; step: number; cut: CutProfile; flowed: boolean }

/**
 * Advance the chain. Returns the transitions that happened so the render layer
 * can react to them exactly once.
 */
export const advanceCombo = (
  state: ComboState,
  delta: number,
  availableResolve: number,
  cfg: ComboConfig = COMBO_CONFIG,
): ComboEvent[] => {
  const events: ComboEvent[] = []
  if (state.phase === 'idle') {
    return events
  }

  state.elapsed += delta
  const cut = activeCut(state)
  if (!cut) {
    state.phase = 'idle'
    state.step = 0
    return events
  }

  const recovery = cut.recovery * (state.hit ? 1 : cut.whiffRecoveryMultiplier)
  const activeAt = cut.windup
  const recoveryAt = cut.windup + cut.active
  const endsAt = recoveryAt + recovery

  if (state.phase === 'windup' && state.elapsed >= activeAt) {
    state.phase = 'active'
    events.push({ type: 'active' })
  }
  if (state.phase === 'active' && state.elapsed >= recoveryAt) {
    state.phase = 'recovery'
    state.linkRemaining = recovery + cfg.linkGrace
    events.push({ type: 'recovery' })
    events.push({ type: 'link-opened', step: state.step })

    // A press held during the swing is honoured the instant the link opens,
    // which is what makes the chain feel forgiving without being automatic.
    if (state.buffered) {
      state.buffered = false
      const request = requestStrike(state, availableResolve, cfg)
      if (request.started && request.cut) {
        events.push({
          type: 'started',
          step: request.step,
          cut: request.cut,
          flowed: request.flowed,
        })
        return events
      }
    }
  }

  if (state.phase === 'recovery') {
    state.linkRemaining = Math.max(0, state.linkRemaining - delta)
    const expired = state.elapsed >= endsAt + cfg.linkGrace
    if (expired) {
      events.push({ type: 'chain-dropped', step: state.step })
      state.step = 0
      state.phase = 'idle'
      state.elapsed = 0
      state.flow = 0
      state.buffered = false
      state.hit = false
      state.linkRemaining = 0
    }
  }

  return events
}

/** Record that the running cut connected, which shortens its recovery. */
export const registerHit = (state: ComboState): void => {
  state.hit = true
}

/** Cancel everything, e.g. when the player is staggered or the mission ends. */
export const resetCombo = (state: ComboState): void => {
  state.step = 0
  state.phase = 'idle'
  state.elapsed = 0
  state.buffered = false
  state.flow = 0
  state.hit = false
  state.linkRemaining = 0
}

/** Player-facing label for the running cut, used by the HUD. */
export const cutLabel = (state: ComboState): string => {
  const cut = activeCut(state)
  if (!cut) {
    return ''
  }
  return cut.kind === 'opening'
    ? 'Opening cut'
    : cut.kind === 'cross'
      ? 'Cross cut'
      : 'Cleave'
}
