import { z } from 'zod'

/** Limity wspólne dla frontendu i backendu. */
export const LIMITS = {
  maxFileBytes: 10 * 1024 * 1024,
  maxPages: 200,
  maxTextChars: 200_000,
  maxOcrPages: 5,
  maxOcrImageBytes: 3 * 1024 * 1024,
} as const

export const analyzeRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  pages: z.array(z.string()).min(1).max(LIMITS.maxPages),
  ocrPages: z.array(z.int().positive()).max(LIMITS.maxOcrPages),
})

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>

export const ocrRequestSchema = z.object({
  // JPEG zakodowany w base64 (bez prefiksu data:)
  image: z
    .string()
    .min(1)
    .max(Math.ceil((LIMITS.maxOcrImageBytes * 4) / 3)),
})

export const ocrResponseSchema = z.object({ text: z.string() })

export const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
})
