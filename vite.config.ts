import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1000,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['chakra.svg'],
      manifest: {
        name: 'Chakravarti: Chronicles of Bharat',
        short_name: 'Chakravarti',
        description:
          'A mobile-first 3D historical strategy anthology about Indian rulers, statecraft, kingdoms, and decisive wars.',
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
        globPatterns: ['**/*.{js,css,html,svg,jpg,mp3}'],
        globIgnores: ['**/*.mp4'],
      },
    }),
  ],
})
