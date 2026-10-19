import { describe, expect, it } from 'vitest'
import { validResult } from './fixtures'
import { analysisResultSchema, modelOutputSchema } from './schema'

describe('analysisResultSchema', () => {
  it('akceptuje poprawny wynik', () => {
    expect(analysisResultSchema.safeParse(validResult()).success).toBe(true)
  })

  it('akceptuje null i puste tablice, gdy brak informacji', () => {
    const result = validResult()
    result.document.title = null
    result.document.date = null
    result.amounts = []
    result.dates = []
    result.entities = { organizations: [], people: [] }
    expect(analysisResultSchema.safeParse(result).success).toBe(true)
  })

  it('odrzuca brak wymaganego pola', () => {
    const { summary: _summary, ...withoutSummary } = validResult()
    expect(analysisResultSchema.safeParse(withoutSummary).success).toBe(false)
  })

  it('odrzuca nieznany typ dokumentu', () => {
    const result = { ...validResult(), document: { ...validResult().document, type: 'list' } }
    expect(analysisResultSchema.safeParse(result).success).toBe(false)
  })

  it.each(['01.10.2026', '2026-13-01', '2026-02-30', '2026/10/01'])(
    'odrzuca datę spoza ISO 8601: %s',
    (date) => {
      const result = validResult()
      result.dates = [{ date, context: 'termin', verified: true }]
      expect(analysisResultSchema.safeParse(result).success).toBe(false)
    },
  )

  it.each(['zł', 'pln', 'PL', 'EURO'])('odrzuca walutę spoza ISO 4217: %s', (currency) => {
    const result = validResult()
    result.amounts = [{ value: 100, currency, context: 'kwota', verified: true }]
    expect(analysisResultSchema.safeParse(result).success).toBe(false)
  })

  it.each(['polski', 'PL', 'pol'])('odrzuca kod języka spoza ISO 639-1: %s', (language) => {
    const result = validResult()
    result.document.language = language
    expect(analysisResultSchema.safeParse(result).success).toBe(false)
  })

  it('wymaga od 3 do 7 punktów kluczowych', () => {
    const tooFew = { ...validResult(), keyPoints: ['a', 'b'] }
    const tooMany = { ...validResult(), keyPoints: ['1', '2', '3', '4', '5', '6', '7', '8'] }
    expect(analysisResultSchema.safeParse(tooFew).success).toBe(false)
    expect(analysisResultSchema.safeParse(tooMany).success).toBe(false)
  })

  it('odrzuca kwotę zapisaną jako tekst', () => {
    const result = {
      ...validResult(),
      amounts: [{ value: '12 500,00', currency: 'PLN', context: 'kwota', verified: true }],
    }
    expect(analysisResultSchema.safeParse(result).success).toBe(false)
  })

  it('odrzuca puste podsumowanie', () => {
    expect(analysisResultSchema.safeParse({ ...validResult(), summary: '  ' }).success).toBe(false)
  })
})

describe('modelOutputSchema', () => {
  it('nie wymaga pól ustawianych przez kod (fileName, pages)', () => {
    const { document, warnings: _w, meta: _m, ...rest } = validResult()
    const output = {
      ...rest,
      language: document.language,
      type: document.type,
      title: document.title,
      date: document.date,
      amounts: rest.amounts.map(({ verified: _v, ...a }) => a),
      dates: rest.dates.map(({ verified: _v, ...d }) => d),
    }
    expect(modelOutputSchema.safeParse(output).success).toBe(true)
  })
})
