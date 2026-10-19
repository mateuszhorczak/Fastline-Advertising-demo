import { LIMITS, analyzeRequestSchema } from '@pdf-insight/shared'
import { analyzeDocument } from '../../utils/analyze'
import { readJsonBody } from '../../utils/body'
import { getGeminiConfig } from '../../utils/config'
import { ApiError, defineApiHandler } from '../../utils/errors'

// tekst w UTF-8 (polskie znaki = 2 bajty) + narzut JSON
const MAX_BODY_BYTES = LIMITS.maxTextChars * 2 + 64 * 1024

export default defineApiHandler(async (event) => {
  const request = await readJsonBody(event, analyzeRequestSchema, MAX_BODY_BYTES)

  const totalChars = request.pages.reduce((sum, page) => sum + page.length, 0)
  if (totalChars > LIMITS.maxTextChars) {
    throw new ApiError(413, 'text_too_long', 'Dokument zawiera zbyt dużo tekstu do analizy.')
  }
  if (request.pages.every((page) => page.trim().length === 0)) {
    throw new ApiError(422, 'no_text', 'Nie znaleziono tekstu w dokumencie.')
  }
  if (request.ocrPages.some((page) => page > request.pages.length)) {
    throw new ApiError(400, 'invalid_request', 'Nieprawidłowe dane żądania.')
  }

  return analyzeDocument(request, getGeminiConfig(event))
})
