/**
 * WebGL capability detection for the action missions.
 *
 * Split out and made pure/testable because getting this wrong silently drops the
 * player into the non-3D command-mode fallback with no explanation — which is
 * exactly the bug this module exists to fix.
 *
 * The important subtlety: a single synchronous probe during first render is
 * **not** reliable inside an Android WebView (Capacitor). A context request can
 * return null while the WebView is still being attached and compositing is not
 * yet ready, even on devices with perfectly good WebGL. So the caller must be
 * able to retry, and the result must never latch permanently on one attempt.
 */

export type WebGLReason =
  | 'ok'
  | 'no-canvas'
  | 'no-context'
  | 'context-lost'
  | 'threw'

export type WebGLProbe = {
  ok: boolean
  reason: WebGLReason
  /** Renderer string when one is available, for diagnostics. */
  renderer?: string
}

const REASON_TEXT: Record<WebGLReason, string> = {
  ok: 'WebGL is available.',
  'no-canvas': 'This browser could not create a drawing surface.',
  'no-context':
    'This device or app WebView did not provide a WebGL context. On Android this is often hardware acceleration being disabled for the app.',
  'context-lost': 'A WebGL context was created but immediately lost.',
  threw: 'Requesting a WebGL context raised an error.',
}

export const describeWebGLReason = (reason: WebGLReason): string =>
  REASON_TEXT[reason] ?? REASON_TEXT['no-context']

/**
 * Probe once for a usable WebGL context, releasing it again immediately so the
 * real renderer is not competing for a context slot.
 */
export const probeWebGL = (): WebGLProbe => {
  if (typeof document === 'undefined') {
    return { ok: false, reason: 'no-canvas' }
  }
  let canvas: HTMLCanvasElement | null = null
  try {
    canvas = document.createElement('canvas')
    // A zero-sized canvas can fail on some WebViews; give it real pixels.
    canvas.width = 2
    canvas.height = 2
    const attributes: WebGLContextAttributes = {
      // A WebView reporting a performance caveat still renders; refusing it here
      // is what pushes usable devices into the fallback.
      failIfMajorPerformanceCaveat: false,
      antialias: false,
      depth: true,
    }
    const gl = (canvas.getContext('webgl2', attributes) ??
      canvas.getContext('webgl', attributes) ??
      canvas.getContext(
        'experimental-webgl' as 'webgl',
        attributes,
      )) as WebGLRenderingContext | null

    if (!gl) {
      return { ok: false, reason: 'no-context' }
    }
    if (typeof gl.isContextLost === 'function' && gl.isContextLost()) {
      return { ok: false, reason: 'context-lost' }
    }

    let renderer: string | undefined
    try {
      const debug = gl.getExtension('WEBGL_debug_renderer_info')
      renderer = debug
        ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))
        : String(gl.getParameter(gl.RENDERER))
    } catch {
      renderer = undefined
    }

    // Release the probe context so it does not count against the WebView limit.
    try {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      /* best effort */
    }

    return { ok: true, reason: 'ok', renderer }
  } catch {
    return { ok: false, reason: 'threw' }
  } finally {
    if (canvas) {
      canvas.width = 0
      canvas.height = 0
    }
  }
}

/**
 * Delays (ms) between retries when the first probe fails.
 *
 * A WebView that is still attaching typically succeeds within a frame or two, so
 * the schedule is short and front-loaded rather than a long poll.
 */
export const RETRY_SCHEDULE: readonly number[] = [60, 200, 600]

/**
 * Probe with retries. Resolves as soon as a probe succeeds, or after the whole
 * schedule is exhausted with the last failure reason.
 *
 * `scheduleRetry` is injectable so tests do not have to wait on real timers.
 */
export const probeWebGLWithRetries = async (
  probe: () => WebGLProbe = probeWebGL,
  schedule: readonly number[] = RETRY_SCHEDULE,
  scheduleRetry: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<WebGLProbe> => {
  let last = probe()
  if (last.ok) {
    return last
  }
  for (const delay of schedule) {
    await scheduleRetry(delay)
    last = probe()
    if (last.ok) {
      return last
    }
  }
  return last
}
