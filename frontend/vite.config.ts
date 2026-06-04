import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Gestão de Negócios',
        short_name: 'Gestão',
        description: 'PDV e BI para negócios de doces',
        theme_color: '#7d3c52',
        background_color: '#fdf6f0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/pdv',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        // CRÍTICO: ativa o novo SW imediatamente, sem esperar fechar abas
        skipWaiting: true,
        clientsClaim: true,
        // Cacheia assets estáticos (atualiza automaticamente quando muda o hash)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // APIs: sempre tenta rede primeiro, cai pro cache se offline
        runtimeCaching: [
          {
            urlPattern: /\/api\/v1\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
