import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * The Capacitor build ships **without** a service worker.
 *
 * Every asset already lives inside the APK, so a precache adds nothing but a
 * stale layer — and that layer survives an APK upgrade, because the WebView's
 * Cache Storage lives in the app's data directory rather than in the package.
 * The result was that installing a new APK kept serving the previous build's
 * bundle: v0.12.0 launched showing the v0.11.x hero.
 *
 * Omitting `sw.js` from the native bundle also *heals* devices that already
 * registered one: the browser's update check fetches the script, gets a 404,
 * and drops the registration.
 *
 * The web build on GitHub Pages keeps its service worker, where offline
 * support is the whole point.
 */
const nativeBuild = process.env.VITE_NATIVE === '1'

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1000,
  },
  plugins: [
    react(),
    ...(nativeBuild
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['chakra.svg'],
            manifest: {
              name: 'Chakravarti: Chronicles of Bharat',
              short_name: 'Chakravarti',
              description:
                'A mobile-first single-player 3D historical action game with optional strategy and evidence-aware campaigns.',
              display: 'standalone',
              start_url: './',
              scope: './',
              icons: [
                {
                  src: 'chakra.svg',
                  sizes: 'any',
                  type: 'image/svg+xml',
                  purpose: 'any maskable',
                },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,svg,png,jpg,mp3,glb,gltf}'],
              globIgnores: ['**/*.mp4'],
              // Take over immediately so a rebuilt web bundle is never served
              // from the previous deploy's precache.
              skipWaiting: true,
              clientsClaim: true,
              cleanupOutdatedCaches: true,
            },
          }),
        ]),
  ],
})
