import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  // GitHub Pages serwuje aplikację pod https://<user>.github.io/<repo>/
  base: command === 'build' ? '/Fastline-Advertising-demo/' : '/',
  plugins: [react(), tailwindcss()],
}))
