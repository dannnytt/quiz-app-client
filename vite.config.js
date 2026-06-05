import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: '0.0.0.0',  // Слушать на всех интерфейсах
    port: 5173,       // Явно указываем порт
    proxy: {
      // Проксируем все запросы к /api/* на backend
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Проксируем запросы к /uploads/* на backend (для картинок)
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
