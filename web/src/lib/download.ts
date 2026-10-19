import type { AnalysisResult } from '@pdf-insight/shared'

export function toJson(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2)
}

export function jsonFileName(pdfName: string): string {
  return `${pdfName.replace(/\.pdf$/i, '')}.insight.json`
}

export function downloadJson(result: AnalysisResult): void {
  const blob = new Blob([toJson(result)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = jsonFileName(result.document.fileName)
  link.click()
  // zwolnienie adresu od razu po click() potrafi przerwać pobieranie (np. w Firefoksie)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
