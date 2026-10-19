import { z } from 'zod'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './errors'
import { generateStructured } from './gemini'

const config = { apiKey: 'test-key', model: 'primary', fallbackModel: 'fallback' }
const schema = z.object({ text: z.string().min(1) })

function geminiReply(body: unknown, status = 200) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
    status,
  })
}

function mockFetch(...responses: Response[]) {
  const fetchMock = vi.fn<typeof fetch>()
  for (const response of responses) fetchMock.mockResolvedValueOnce(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const request = { system: 'sys', parts: [{ text: 'doc' }], schema }

describe('generateStructured', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('zwraca poprawną odpowiedź za pierwszym razem', async () => {
    const fetchMock = mockFetch(geminiReply({ text: 'ok' }))
    await expect(generateStructured(config, request)).resolves.toEqual({
      data: { text: 'ok' },
      softIssue: null,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/primary:generateContent')
  })

  it('ponawia raz z listą błędów, gdy odpowiedź nie pasuje do schematu', async () => {
    const fetchMock = mockFetch(geminiReply({ text: '' }), geminiReply({ text: 'poprawione' }))
    const result = await generateStructured(config, request)
    expect(result.data.text).toBe('poprawione')
    const retryBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as {
      contents: { parts: { text?: string }[] }[]
    }
    expect(retryBody.contents.at(-1)?.parts[0]?.text).toContain('nie spełnia wymagań')
  })

  it('po drugiej niepoprawnej odpowiedzi zgłasza błąd', async () => {
    mockFetch(geminiReply('to nie JSON'), geminiReply({ wrong: true }))
    await expect(generateStructured(config, request)).rejects.toMatchObject({
      code: 'ai_invalid_response',
    })
  })

  it('przy przekroczonym limicie używa modelu zapasowego', async () => {
    const fetchMock = mockFetch(new Response('quota', { status: 429 }), geminiReply({ text: 'ok' }))
    await generateStructured(config, request)
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/fallback:generateContent')
  })

  it('gdy oba modele są niedostępne, zwraca czytelny błąd', async () => {
    mockFetch(new Response('', { status: 503 }), new Response('', { status: 429 }))
    const error = await generateStructured(config, request).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('ai_unavailable')
  })

  it('akceptuje wynik z miękkim problemem, jeśli ponowna próba go nie usunie', async () => {
    mockFetch(geminiReply({ text: 'a' }), geminiReply({ text: 'b' }))
    const result = await generateStructured(config, { ...request, check: () => 'za krótkie' })
    expect(result).toEqual({ data: { text: 'b' }, softIssue: 'za krótkie' })
  })
})
