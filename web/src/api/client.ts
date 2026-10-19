import {
  type AnalysisResult,
  type AnalyzeRequest,
  analysisResultSchema,
  apiErrorSchema,
  ocrResponseSchema,
} from '@pdf-insight/shared'
import type { z } from 'zod'

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
const TIMEOUT_MS = 60_000

export class ApiRequestError extends Error {}

async function post<T extends z.ZodType>(
  path: string,
  body: unknown,
  schema: T,
  signal: AbortSignal,
): Promise<z.infer<T>> {
  if (!API_URL) throw new ApiRequestError('Brak konfiguracji adresu API (VITE_API_URL).')

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
    })
  } catch (error) {
    if (signal.aborted) throw error
    throw new ApiRequestError(
      'Brak połączenia z serwerem analizy. Sprawdź internet i spróbuj ponownie.',
    )
  }

  const json: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const apiError = apiErrorSchema.safeParse(json)
    throw new ApiRequestError(
      apiError.success ? apiError.data.error.message : `Serwer zwrócił błąd (${response.status}).`,
    )
  }

  // walidacja przed wyświetleniem — nie ufamy nawet własnemu backendowi
  const parsed = schema.safeParse(json)
  if (!parsed.success) throw new ApiRequestError('Serwer zwrócił dane w nieoczekiwanym formacie.')
  return parsed.data
}

export function analyzeDocument(
  request: AnalyzeRequest,
  signal: AbortSignal,
): Promise<AnalysisResult> {
  return post('/api/analyze', request, analysisResultSchema, signal)
}

export async function ocrPage(imageBase64: string, signal: AbortSignal): Promise<string> {
  const { text } = await post('/api/ocr', { image: imageBase64 }, ocrResponseSchema, signal)
  return text
}
