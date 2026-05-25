import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
    tsconfigPaths: true,
  },
  server: {
    fs: {
      allow: [resolve(__dirname, '..')],
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: ['ilmuna.site', 'www.ilmuna.site'],
  },
})
