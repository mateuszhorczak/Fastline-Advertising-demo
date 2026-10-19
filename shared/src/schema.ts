import { z } from 'zod'

export const DOCUMENT_TYPES = ['faktura', 'umowa', 'oferta', 'raport', 'inne'] as const

// YYYY-MM-DD, które jest prawdziwą datą kalendarzową (odrzuca np. 2026-02-30)
export const isoDate = z.iso.date()

const nonEmpty = z.string().trim().min(1)

/**
 * Część wyniku, którą generuje model. Pola fileName i pages celowo nie są tu
 * obecne — ustawia je kod na podstawie pliku, żeby model ich nie zgadywał.
 */
export const modelOutputSchema = z.object({
  language: z
    .string()
    .regex(/^[a-z]{2}$/)
    .describe('Kod ISO 639-1 głównego języka dokumentu, np. "pl"'),
  type: z.enum(DOCUMENT_TYPES),
  title: nonEmpty.nullable().describe('Tytuł dokumentu lub null, jeśli go nie ma'),
  date: isoDate.nullable().describe('Data dokumentu (YYYY-MM-DD) lub null'),
  summary: nonEmpty.describe('Podsumowanie w 3–5 zdaniach, w języku dokumentu'),
  keyPoints: z.array(nonEmpty).min(3).max(7),
  entities: z.object({
    organizations: z.array(nonEmpty),
    people: z.array(nonEmpty).describe('Imię i nazwisko w mianowniku'),
  }),
  amounts: z.array(
    z.object({
      value: z.number().finite(),
      currency: z
        .string()
        .regex(/^[A-Z]{3}$/)
        .describe('Kod ISO 4217, np. PLN'),
      context: nonEmpty,
    }),
  ),
  dates: z.array(
    z.object({
      date: isoDate,
      context: nonEmpty,
    }),
  ),
  keywords: z.array(nonEmpty),
})

export type ModelOutput = z.infer<typeof modelOutputSchema>

export const WARNING_CODES = [
  'prompt_injection',
  'unverified_amount',
  'unverified_date',
  'summary_length',
  'ocr_used',
  'ocr_skipped',
  'no_text',
] as const

export const warningSchema = z.object({
  code: z.enum(WARNING_CODES),
  message: nonEmpty,
})

export type Warning = z.infer<typeof warningSchema>

/** Pełny wynik analizy — schemat z briefu + dodatkowe pola (verified, warnings, meta). */
export const analysisResultSchema = z.object({
  document: z.object({
    fileName: nonEmpty,
    pages: z.int().positive(),
    language: modelOutputSchema.shape.language,
    type: modelOutputSchema.shape.type,
    title: modelOutputSchema.shape.title,
    date: modelOutputSchema.shape.date,
  }),
  summary: modelOutputSchema.shape.summary,
  keyPoints: modelOutputSchema.shape.keyPoints,
  entities: modelOutputSchema.shape.entities,
  amounts: z.array(modelOutputSchema.shape.amounts.element.extend({ verified: z.boolean() })),
  dates: z.array(modelOutputSchema.shape.dates.element.extend({ verified: z.boolean() })),
  keywords: modelOutputSchema.shape.keywords,
  warnings: z.array(warningSchema),
  meta: z.object({
    model: nonEmpty,
    chunks: z.int().positive(),
    ocrPages: z.array(z.int().positive()),
    generatedAt: z.iso.datetime(),
  }),
})

export type AnalysisResult = z.infer<typeof analysisResultSchema>
