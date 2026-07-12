import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['chakra.svg'],
      manifest: {
        name: 'Chakravarti: Chronicles of Bharat',
        short_name: 'Chakravarti',
        description:
          'A mobile-first historical strategy anthology about the rulers, defenders, and decisive wars of India.',
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
