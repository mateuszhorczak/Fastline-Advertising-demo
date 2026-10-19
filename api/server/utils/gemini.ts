import type { z } from 'zod'
import { ApiError } from './errors'
import { toGeminiSchema } from './json-schema'

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
/** Limit na jedno wywołanie — dwa (główny + zapasowy) mieszczą się w ~30 s z briefu. */
const TIMEOUT_MS = 18_000

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } }

export interface GeminiConfig {
  apiKey: string
  model: string
  fallbackModel: string
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] }
    finishReason?: string
  }[]
  promptFeedback?: { blockReason?: string }
}

/** Błąd usługi AI, przy którym ma sens spróbować modelu zapasowego. */
class OverloadedError extends Error {}

async function callModel(model: string, apiKey: string, body: object): Promise<string> {
  let response: Response
  try {
    response = await fetch(`${API_URL}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    // przekroczony czas lub błąd sieci — warto spróbować modelu zapasowego
    throw new OverloadedError(`${model}: timeout or network error`)
  }

  if (response.status === 429 || response.status >= 500) {
    throw new OverloadedError(`${model}: HTTP ${response.status}`)
  }
  if (!response.ok) {
    console.error('Gemini error', model, response.status, await response.text())
    throw new ApiError(502, 'ai_error', 'Usługa AI zwróciła błąd. Spróbuj ponownie.')
  }

  const data = (await response.json()) as GeminiResponse
  if (data.promptFeedback?.blockReason) {
    throw new ApiError(422, 'ai_blocked', 'Usługa AI odmówiła analizy tego dokumentu.')
  }
  const candidate = data.candidates?.[0]
  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new ApiError(
      422,
      'ai_too_long',
      'Odpowiedź AI została ucięta — dokument jest zbyt obszerny.',
    )
  }
  // pomijamy części z "myśleniem" modelu — interesuje nas tylko odpowiedź
  return (candidate?.content?.parts ?? [])
    .filter((part) => !part.thought)
    .map((part) => part.text ?? '')
    .join('')
}

/** Wywołuje model główny, a przy przeciążeniu lub wyczerpanym limicie — zapasowy. */
async function generate(config: GeminiConfig, body: object): Promise<string> {
  try {
    return await callModel(config.model, config.apiKey, body)
  } catch (error) {
    if (!(error instanceof OverloadedError)) throw error
    console.warn('Primary model unavailable, using fallback', error.message)
  }
  try {
    return await callModel(config.fallbackModel, config.apiKey, body)
  } catch (error) {
    if (!(error instanceof OverloadedError)) throw error
    throw new ApiError(
      503,
      'ai_unavailable',
      'Usługa AI jest chwilowo przeciążona lub wyczerpano dzienny limit. Spróbuj później.',
    )
  }
}

interface StructuredRequest<T extends z.ZodType> {
  system: string
  parts: Part[]
  schema: T
  /** Dodatkowa, "miękka" walidacja — zwraca opis problemu albo null. */
  check?: (data: z.infer<T>) => string | null
}

export interface StructuredResult<T> {
  data: T
  /** Problem z miękkiej walidacji, który nie zniknął po ponownej próbie. */
  softIssue: string | null
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 10)
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ')
}

/**
 * Generuje JSON zgodny ze schematem. Przy niepoprawnej odpowiedzi robi dokładnie jedną
 * ponowną próbę, przekazując modelowi listę błędów walidacji. Potem zgłasza błąd.
 */
export async function generateStructured<T extends z.ZodType>(
  config: GeminiConfig,
  request: StructuredRequest<T>,
): Promise<StructuredResult<z.infer<T>>> {
  const contents = [{ role: 'user', parts: request.parts }]
  const generationConfig = {
    responseMimeType: 'application/json',
    responseJsonSchema: toGeminiSchema(request.schema),
    thinkingConfig: { thinkingLevel: 'low' },
  }

  let fallback: z.infer<T> | null = null
  let softIssue: string | null = null

  for (let attempt = 1; attempt <= 2; attempt++) {
    const text = await generate(config, {
      systemInstruction: { parts: [{ text: request.system }] },
      contents,
      generationConfig,
    })

    let problem: string
    const json = parseJson(text)
    const parsed = request.schema.safeParse(json)

    if (parsed.success) {
      softIssue = request.check?.(parsed.data) ?? null
      if (!softIssue) return { data: parsed.data, softIssue: null }
      fallback = parsed.data
      problem = softIssue
    } else {
      problem = json === null ? 'odpowiedź nie jest poprawnym JSON' : describeIssues(parsed.error)
    }

    // druga próba: model widzi swoją odpowiedź i listę błędów
    contents.push(
      { role: 'model', parts: [{ text }] },
      {
        role: 'user',
        parts: [
          { text: `Poprzednia odpowiedź nie spełnia wymagań: ${problem}. Zwróć poprawiony JSON.` },
        ],
      },
    )
  }

  if (fallback !== null) return { data: fallback, softIssue }
  throw new ApiError(502, 'ai_invalid_response', 'AI zwróciło niepoprawne dane. Spróbuj ponownie.')
}
