import { afterEach, describe, expect, it, vi } from 'vitest'

import { cleanupStaleServiceWorker } from './serviceWorkerCleanup'

/**
 * The native build ships no service worker, because a precache inside the APK
 * survives an upgrade and keeps serving the previous build. These lock in that
 * a leftover registration is torn down rather than left to do that.
 */
const setNative = (native: boolean) => {
  vi.stubEnv('VITE_NATIVE', native ? '1' : '')
}

type Stubs = {
  unregister: ReturnType<typeof vi.fn>
  deleteCache: ReturnType<typeof vi.fn>
}

const install = (keys: string[]): Stubs => {
  const unregister = vi.fn().mockResolvedValue(true)
  const deleteCache = vi.fn().mockResolvedValue(true)
  vi.stubGlobal('navigator', {
    serviceWorker: {
      getRegistrations: vi.fn().mockResolvedValue([{ unregister }]),
    },
  })
  vi.stubGlobal('caches', {
    keys: vi.fn().mockResolvedValue(keys),
    delete: deleteCache,
  })
  return { unregister, deleteCache }
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('cleanupStaleServiceWorker', () => {
  it('unregisters a leftover worker in the native build', async () => {
    setNative(true)
    const { unregister } = install([])
    await expect(cleanupStaleServiceWorker()).resolves.toBe(true)
    expect(unregister).toHaveBeenCalledOnce()
  })

  it('drops the precache the old worker was serving from', async () => {
    setNative(true)
    const { deleteCache } = install(['workbox-precache-v2-https://localhost/'])
    await cleanupStaleServiceWorker()
    expect(deleteCache).toHaveBeenCalledWith(
      'workbox-precache-v2-https://localhost/',
    )
  })

  it('leaves caches it does not own alone', async () => {
    setNative(true)
    const { deleteCache } = install(['chakravarti-saves'])
    await cleanupStaleServiceWorker()
    expect(deleteCache).not.toHaveBeenCalled()
  })

  it('does nothing in the web build, where the worker is wanted', async () => {
    setNative(false)
    const { unregister, deleteCache } = install(['workbox-precache-v2'])
    await expect(cleanupStaleServiceWorker()).resolves.toBe(false)
    expect(unregister).not.toHaveBeenCalled()
    expect(deleteCache).not.toHaveBeenCalled()
  })

  it('never throws when the WebView refuses the APIs', async () => {
    setNative(true)
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistrations: vi.fn().mockRejectedValue(new Error('denied')),
      },
    })
    await expect(cleanupStaleServiceWorker()).resolves.toBe(false)
  })
})
