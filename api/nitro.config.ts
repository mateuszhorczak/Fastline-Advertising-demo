import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  srcDir: 'server',
  compatibilityDate: '2026-10-01',
  // wartości domyślne; nadpisywane zmiennymi NITRO_* (lokalnie .env, na Cloudflare vars/secrets)
  runtimeConfig: {
    geminiApiKey: '',
    geminiModel: 'gemini-3.6-flash',
    geminiFallbackModel: 'gemini-3.5-flash-lite',
    allowedOrigins: 'http://localhost:5173',
  },
})
