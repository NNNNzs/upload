import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/upload',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3002/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
    }
  },
  build:{
    outDir:'dist/upload'
  }
})
