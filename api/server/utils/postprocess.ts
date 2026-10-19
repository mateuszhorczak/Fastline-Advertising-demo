import {
  type AnalysisResult,
  type ModelOutput,
  type Warning,
  detectInjection,
  extractDates,
  extractNumbers,
  isAmountInText,
} from '@pdf-insight/shared'

interface PostprocessInput {
  output: ModelOutput
  sourceText: string
  fileName: string
  pageCount: number
  ocrPages: number[]
  model: string
  chunks: number
  softIssue: string | null
}

const formatList = (items: string[]) => items.slice(0, 5).join(', ') + (items.length > 5 ? '…' : '')

/**
 * Składa końcowy wynik: dodaje pola ustawiane przez kod (fileName, pages, meta),
 * oznacza kwoty i daty, których nie ma w tekście źródłowym, oraz zbiera ostrzeżenia.
 */
export function buildResult(input: PostprocessInput): AnalysisResult {
  const { output, sourceText } = input
  const numbers = extractNumbers(sourceText)
  const dates = extractDates(sourceText)
  const warnings: Warning[] = []

  for (const { snippet } of detectInjection(sourceText)) {
    warnings.push({
      code: 'prompt_injection',
      message: `Dokument zawiera fragment wyglądający na polecenie dla AI: „${snippet}”. Potraktowano go jako treść dokumentu, nie jako instrukcję.`,
    })
  }

  const amounts = output.amounts.map((a) => ({ ...a, verified: isAmountInText(a.value, numbers) }))
  const unverifiedAmounts = amounts.filter((a) => !a.verified)
  if (unverifiedAmounts.length > 0) {
    warnings.push({
      code: 'unverified_amount',
      message: `Nie znaleziono w tekście dokumentu kwot: ${formatList(unverifiedAmounts.map((a) => `${a.value} ${a.currency}`))}. Sprawdź je ręcznie.`,
    })
  }

  const datesWithFlag = output.dates.map((d) => ({ ...d, verified: dates.has(d.date) }))
  const unverifiedDates = datesWithFlag.filter((d) => !d.verified).map((d) => d.date)
  if (output.date && !dates.has(output.date)) unverifiedDates.unshift(output.date)
  if (unverifiedDates.length > 0) {
    warnings.push({
      code: 'unverified_date',
      message: `Nie znaleziono w tekście dokumentu dat: ${formatList([...new Set(unverifiedDates)])}. Sprawdź je ręcznie.`,
    })
  }

  if (input.softIssue) {
    warnings.push({ code: 'summary_length', message: `Podsumowanie: ${input.softIssue}.` })
  }
  if (input.ocrPages.length > 0) {
    warnings.push({
      code: 'ocr_used',
      message:
        input.ocrPages.length === 1
          ? `Strona ${input.ocrPages.join('')} nie miała warstwy tekstowej i została odczytana przez OCR — możliwe błędy odczytu.`
          : `Strony ${input.ocrPages.join(', ')} nie miały warstwy tekstowej i zostały odczytane przez OCR — możliwe błędy odczytu.`,
    })
  }

  return {
    document: {
      fileName: input.fileName,
      pages: input.pageCount,
      language: output.language,
      type: output.type,
      title: output.title,
      date: output.date,
    },
    summary: output.summary,
    keyPoints: output.keyPoints,
    entities: output.entities,
    amounts,
    dates: datesWithFlag,
    keywords: output.keywords,
    warnings,
    meta: {
      model: input.model,
      chunks: input.chunks,
      ocrPages: input.ocrPages,
      generatedAt: new Date().toISOString(),
    },
  }
}
