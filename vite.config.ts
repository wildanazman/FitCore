import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { localFoodApis } from './scripts/local-food-api.mjs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
  plugins: [react(), localFoodApis(env)],
  server: {
    port: 5180,
    host: true,
    proxy: { '/api': { target: 'https://fit-core-five.vercel.app', changeOrigin: true } },
  },
  }
})
