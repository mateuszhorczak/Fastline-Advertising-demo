import type { H3Event } from 'h3'
import { ApiError } from './errors'
import type { GeminiConfig } from './gemini'

export function getGeminiConfig(event: H3Event): GeminiConfig {
  const config = useRuntimeConfig(event)
  if (!config.geminiApiKey) {
    throw new ApiError(500, 'not_configured', 'Serwer nie ma skonfigurowanego klucza API.')
  }
  return {
    apiKey: config.geminiApiKey,
    model: config.geminiModel,
    fallbackModel: config.geminiFallbackModel,
  }
}
