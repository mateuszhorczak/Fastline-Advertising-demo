/** Maks. liczba znaków w jednym zapytaniu (~15k tokenów) — krótsze odpowiedzi, mniejsze ryzyko pominięć. */
export const CHUNK_CHARS = 60_000

export interface Chunk {
  text: string
  firstPage: number
  lastPage: number
}

function pageText(text: string, pageNumber: number, ocrPages: Set<number>): string {
  const label = ocrPages.has(pageNumber) ? ` (OCR)` : ''
  return `--- Strona ${pageNumber}${label} ---\n${text.trim()}\n`
}

/**
 * Dzieli dokument na fragmenty po całych stronach. Strona dłuższa niż limit
 * trafia do osobnego fragmentu i jest przycinana na granicy znaków.
 */
export function splitIntoChunks(
  pages: string[],
  ocrPages: number[],
  maxChars = CHUNK_CHARS,
): Chunk[] {
  const ocr = new Set(ocrPages)
  const chunks: Chunk[] = []
  let current: Chunk | null = null

  pages.forEach((page, index) => {
    const pageNumber = index + 1
    const text = pageText(page, pageNumber, ocr)

    if (current && current.text.length + text.length <= maxChars) {
      current.text += text
      current.lastPage = pageNumber
      return
    }
    for (let offset = 0; offset < text.length; offset += maxChars) {
      current = {
        text: text.slice(offset, offset + maxChars),
        firstPage: pageNumber,
        lastPage: pageNumber,
      }
      chunks.push(current)
    }
  })

  return chunks
}
