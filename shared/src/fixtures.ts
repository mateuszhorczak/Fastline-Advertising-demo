import type { AnalysisResult } from './schema'

/** Poprawny wynik zgodny ze schematem — baza dla testów. */
export function validResult(): AnalysisResult {
  return {
    document: {
      fileName: 'umowa.pdf',
      pages: 4,
      language: 'pl',
      type: 'umowa',
      title: 'Umowa serwisowa',
      date: '2026-09-01',
    },
    summary:
      'Umowa określa zasady serwisu. Obowiązuje 12 miesięcy. Wynagrodzenie płatne miesięcznie.',
    keyPoints: ['Okres umowy 12 mies.', 'SLA 99,5%', 'Płatność 14 dni'],
    entities: { organizations: ['Przykład sp. z o.o.'], people: [] },
    amounts: [{ value: 12500, currency: 'PLN', context: 'wynagrodzenie', verified: true }],
    dates: [{ date: '2026-10-01', context: 'termin płatności', verified: true }],
    keywords: ['serwis', 'SLA'],
    warnings: [],
    meta: {
      model: 'gemini-3.8-flash',
      chunks: 1,
      ocrPages: [],
      generatedAt: '2026-10-19T20:00:00.000Z',
    },
  }
}
