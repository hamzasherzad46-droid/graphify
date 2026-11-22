import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base: the same build runs from a web server, a sub-path, or inside Capacitor.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Atlas — Skeletal Anatomy',
        short_name: 'Atlas',
        description: '3D skeletal anatomy for university students.',
        theme_color: '#06080a',
        background_color: '#06080a',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell, fonts, bone data, Draco decoder and the skeleton model are precached:
        // after the first visit the app opens offline.
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,wasm,glb}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 1200 },
})
