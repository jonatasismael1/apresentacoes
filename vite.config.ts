import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'logo-dbe.png'],
      manifest: {
        name: 'DBE Apresentações',
        short_name: 'DBE App',
        description: 'Plataforma de apresentações e teleprompter profissional',
        theme_color: '#0047FF',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\//i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'external-cache',
              expiration: {
                maxEntries: 32,
                maxAgeSeconds: 24 * 60 * 60 // 24h
              }
            }
          }
        ]
      }
    })
  ],
})
