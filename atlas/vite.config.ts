import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base: the same build runs from a web server, a sub-path, or inside Capacitor.
// `vite build --mode artifact` → dist-artifact/: a preview build for sandboxed hosts
// (no service worker, plain-JS Draco decoder). The normal build is the installable PWA.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    mode !== 'artifact' &&
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
        globPatterns: ['**/*.{js,mjs,css,html,woff2,svg,png,wasm,glb}'],
        // JS fallback decoder (preview build only), and three's own decoder copies, which are unused (decoder path is draco/).
        // The muscle and organ models (several megabytes) are not precached: each is kept once it has been viewed.
        globIgnores: ['draco/draco_decoder.js', 'assets/draco_*', 'models/tissue/**'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/models\/tissue\/[^/]+\.glb$/,
            handler: 'CacheFirst',
            options: { cacheName: 'atlas-tissue-models', expiration: { maxEntries: 4 } },
          },
          {
            // Textbook figures: kept as they are viewed, so a chapter read once opens offline.
            urlPattern: /\/textbook\/[^/]+\.webp$/,
            handler: 'CacheFirst',
            options: { cacheName: 'atlas-textbook-figures', expiration: { maxEntries: 600 } },
          },
        ],
      },
    }),
  ],
  // Notes to Exam: in development, /api goes to the local server (atlas/server, port 8787).
  server: { proxy: { '/api': 'http://localhost:8787' } },
  build: { chunkSizeWarningLimit: 1200, ...(mode === 'artifact' ? { outDir: 'dist-artifact' } : {}) },
}))
