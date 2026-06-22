import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default defineConfig(({ mode }) => {
  const apiUrl = process.env.VITE_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://sejaatendido-backend.onrender.com';
  const apiOrigin = new URL(apiUrl).origin;
  const apiOriginRegex = new RegExp(`^${escapeRegex(apiOrigin)}\/.*`, 'i');

  return {
    base: '/',
    plugins: [
      react(),
      VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo192.png', 'logo512.png'],
      manifest: {
        name: 'Seja Atendido',
        short_name: 'SejaAtendido',
        description: 'Plataforma de telemedicina – agende consultas online',
        theme_color: '#FF3366',
        background_color: '#F7F8FC',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'logo192.png', sizes: '192x192', type: 'image/png' },
          { src: 'logo512.png', sizes: '512x512', type: 'image/png' },
          { src: 'logo512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: apiOriginRegex,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
    ],
    server: {
      port: 3000,
      host: true,
    },
  };
});
