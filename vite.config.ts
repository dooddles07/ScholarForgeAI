import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'ScholarForge AI',
        short_name: 'ScholarForge',
        description: 'Turn your notes into practice. Free, no account, works offline.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        /* App shell only. Generated content and the AI proxy are never cached, so a stale
           response can never stand in for a real answer. */
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        /* The PDF worker and the pdf/jszip vendor chunks are lazily loaded on demand and are
           large (the worker alone is well over a megabyte). Precaching them on every install
           would defeat the point of lazy loading. They are cached at runtime instead, the first
           time a document of that type is actually opened. */
        globIgnores: ['**/pdf.worker.min-*.{js,mjs}', '**/pdf-*.js', '**/jszip.min-*.js'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(pdf|jszip)[^/]*\.(js|mjs)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'lazy-parsers',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
} as Parameters<typeof defineConfig>[0]);
