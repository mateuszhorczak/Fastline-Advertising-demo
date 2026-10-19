import { LIMITS, ocrRequestSchema, ocrResponseSchema } from '@pdf-insight/shared'
import { readJsonBody } from '../../utils/body'
import { getGeminiConfig } from '../../utils/config'
import { defineApiHandler } from '../../utils/errors'
import { generateStructured } from '../../utils/gemini'
import { OCR_SYSTEM_PROMPT } from '../../utils/prompts'

const MAX_BODY_BYTES = Math.ceil((LIMITS.maxOcrImageBytes * 4) / 3) + 1024

export default defineApiHandler(async (event) => {
  const { image } = await readJsonBody(event, ocrRequestSchema, MAX_BODY_BYTES)

  const { data } = await generateStructured(getGeminiConfig(event), {
    system: OCR_SYSTEM_PROMPT,
    schema: ocrResponseSchema,
    parts: [
      { inlineData: { mimeType: 'image/jpeg', data: image } },
      { text: 'Transcribe this page.' },
    ],
  })
  return data
})
