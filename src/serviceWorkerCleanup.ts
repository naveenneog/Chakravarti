/**
 * Remove a stale service worker when the build did not ship one.
 *
 * The Capacitor build has no `sw.js`: every asset is inside the APK, so a
 * precache only adds a layer that can go stale — and it does, because the
 * WebView's Cache Storage lives in the app's data directory and therefore
 * survives an APK upgrade. Before this, installing a new APK kept serving the
 * previous build straight out of the old worker's precache.
 *
 * `import.meta.env` tells us which build this is. When no worker is expected,
 * tear down any registration left behind by a previous version and drop its
 * caches, so the next launch is guaranteed to run the bundled files.
 *
 * Deliberately best-effort: a failure here must never stop the game booting.
 */

/** True when this bundle was built with the service worker disabled. */
export const expectsServiceWorker = (): boolean =>
  import.meta.env.VITE_NATIVE !== '1'

export const cleanupStaleServiceWorker = async (): Promise<boolean> => {
  if (expectsServiceWorker() || typeof navigator === 'undefined') {
    return false
  }
  let removed = false
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const registration of registrations) {
        removed = (await registration.unregister()) || removed
      }
    }
    if ('caches' in globalThis) {
      for (const key of await caches.keys()) {
        // Only the workbox/vite-pwa precaches, so an unrelated cache that a
        // future feature adds is not swept up with them.
        if (/workbox|precache|vite-pwa|assets-cache/i.test(key)) {
          removed = (await caches.delete(key)) || removed
        }
      }
    }
  } catch {
    // A locked-down WebView can refuse either API; the game still runs.
    return removed
  }
  return removed
}
