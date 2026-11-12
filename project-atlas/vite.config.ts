import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// `vite build --mode artifact` makes a build for sandboxed hosts (e.g. a claude.ai artifact):
// relative URLs, no service worker, fonts inlined into the CSS.
export default defineConfig(({ mode }) => {
  const artifact = mode === 'artifact'
  return {
    base: artifact ? './' : '/',
    plugins: [
      react(),
      // Sandboxed hosts only allow data: images, so drop the favicon links there.
      artifact && {
        name: 'atlas-artifact-html',
        transformIndexHtml: (html: string) => html.replace(/\s*<link rel="(icon|apple-touch-icon)"[^>]*>/g, ''),
      },
      !artifact &&
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
          manifest: {
            name: 'Atlas — Anatomy Trainer',
            short_name: 'Atlas',
            description: 'Type-to-learn 3D anatomy trainer for nursing and medical students.',
            theme_color: '#0b0b0d',
            background_color: '#0b0b0d',
            display: 'standalone',
            orientation: 'portrait',
            start_url: '/',
            scope: '/',
            icons: [
              { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
              { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            ],
          },
          workbox: {
            // App shell, fonts, content chunks and the Draco decoder are precached,
            // so the app works offline after the first visit.
            globPatterns: ['**/*.{js,css,html,woff2,svg,png,wasm}'],
            navigateFallback: '/index.html',
            runtimeCaching: [
              {
                // 3D models are large: cache each module's GLB the first time it is opened.
                urlPattern: ({ url }) => url.pathname.startsWith('/models/'),
                handler: 'CacheFirst',
                options: {
                  cacheName: 'atlas-models',
                  expiration: { maxEntries: 20 },
                  cacheableResponse: { statuses: [200] },
                },
              },
            ],
          },
        }),
    ],
    build: {
      // three.js + R3F is ~1 MB (≈270 KB gzipped) and is lazy-loaded only when a 3D view opens.
      chunkSizeWarningLimit: 1100,
      ...(artifact ? { outDir: 'dist-artifact', assetsInlineLimit: 120_000 } : {}),
    },
    }
})
