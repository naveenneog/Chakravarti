import { describe, expect, it, vi } from 'vitest'
import {
  RETRY_SCHEDULE,
  describeWebGLReason,
  probeWebGLWithRetries,
  type WebGLProbe,
} from './webgl'

const ok = (): WebGLProbe => ({ ok: true, reason: 'ok', renderer: 'Test GPU' })
const fail = (reason: WebGLProbe['reason'] = 'no-context'): WebGLProbe => ({
  ok: false,
  reason,
})

/** A retry scheduler that resolves immediately and records the delays asked for. */
const instantScheduler = () => {
  const delays: number[] = []
  return {
    delays,
    schedule: async (ms: number) => {
      delays.push(ms)
    },
  }
}

describe('probeWebGLWithRetries', () => {
  it('returns immediately when the first probe succeeds', async () => {
    const probe = vi.fn(ok)
    const scheduler = instantScheduler()
    const result = await probeWebGLWithRetries(
      probe,
      RETRY_SCHEDULE,
      scheduler.schedule,
    )
    expect(result.ok).toBe(true)
    expect(probe).toHaveBeenCalledTimes(1)
    expect(scheduler.delays).toEqual([])
  })

  it('retries a failing probe and succeeds on a later attempt', async () => {
    // This is the Android WebView case: the context is not ready on first paint
    // but becomes available once the view is attached.
    const probe = vi
      .fn<() => WebGLProbe>()
      .mockReturnValueOnce(fail())
      .mockReturnValueOnce(fail())
      .mockReturnValue(ok())
    const scheduler = instantScheduler()
    const result = await probeWebGLWithRetries(
      probe,
      RETRY_SCHEDULE,
      scheduler.schedule,
    )
    expect(result.ok).toBe(true)
    expect(result.renderer).toBe('Test GPU')
    expect(probe).toHaveBeenCalledTimes(3)
  })

  it('gives up after the whole schedule and reports the last reason', async () => {
    const probe = vi.fn(() => fail('context-lost'))
    const scheduler = instantScheduler()
    const result = await probeWebGLWithRetries(
      probe,
      RETRY_SCHEDULE,
      scheduler.schedule,
    )
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('context-lost')
    expect(probe).toHaveBeenCalledTimes(1 + RETRY_SCHEDULE.length)
    expect(scheduler.delays).toEqual([...RETRY_SCHEDULE])
  })

  it('never latches on a single failed attempt', async () => {
    // The original bug: one synchronous probe at mount decided 3D forever.
    const probe = vi.fn<() => WebGLProbe>().mockReturnValueOnce(fail()).mockReturnValue(ok())
    const scheduler = instantScheduler()
    expect((await probeWebGLWithRetries(probe, RETRY_SCHEDULE, scheduler.schedule)).ok).toBe(
      true,
    )
  })

  it('keeps the retry schedule short and front-loaded', () => {
    expect(RETRY_SCHEDULE.length).toBeGreaterThanOrEqual(2)
    expect(RETRY_SCHEDULE[0]).toBeLessThanOrEqual(100)
    const total = RETRY_SCHEDULE.reduce((sum, ms) => sum + ms, 0)
    // A player must never wait a noticeable time to find out they get 3D.
    expect(total).toBeLessThanOrEqual(1200)
  })
})

describe('describeWebGLReason', () => {
  it('explains every failure reason in words a player can act on', () => {
    for (const reason of [
      'no-canvas',
      'no-context',
      'context-lost',
      'threw',
    ] as const) {
      expect(describeWebGLReason(reason).length).toBeGreaterThan(20)
    }
  })

  it('names hardware acceleration for the most common Android cause', () => {
    expect(describeWebGLReason('no-context')).toMatch(/hardware acceleration/i)
  })
})
