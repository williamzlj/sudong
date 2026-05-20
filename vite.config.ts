import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages 部署需要知道仓库名
const repoName = 'sudong' // 你的 GitHub 仓库名称
const isProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  // GitHub Pages 需要设置 base 为仓库名
  base: isProduction && repoName ? `/${repoName}/` : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png', 'manifest.json'],
      manifest: {
        name: '树洞聊天',
        short_name: '树洞',
        description: '倾诉你的心声',
        theme_color: '#22c55e',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: isProduction && repoName ? `/${repoName}/` : '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})