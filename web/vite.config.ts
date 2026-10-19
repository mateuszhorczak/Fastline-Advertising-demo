import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages serwuje aplikację pod https://<user>.github.io/<repo>/ — ta sama ścieżka lokalnie
  base: '/Fastline-Advertising-demo/',
  plugins: [react(), tailwindcss()],
})
