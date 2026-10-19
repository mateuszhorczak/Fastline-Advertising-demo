import { type AnalysisResult, LIMITS } from '@pdf-insight/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiRequestError, analyzeDocument, ocrPage } from '../api/client'
import { validatePdfFile } from './file-validation'
import { PdfReadError } from './errors'

export type AnalysisStep = 'reading' | 'ocr' | 'analyzing'

export type AnalysisState =
  | { status: 'idle' }
  | { status: 'working'; fileName: string; step: AnalysisStep; detail?: string }
  | { status: 'done'; result: AnalysisResult }
  | { status: 'error'; message: string; canRetry: boolean }

/**
 * Cały przepływ: walidacja pliku → odczyt tekstu → OCR stron bez tekstu → analiza AI.
 * Odpowiednik composable z Vue: trzyma stan i udostępnia akcje.
 */
export function useAnalysis(onResult: (result: AnalysisResult) => void) {
  const [state, setState] = useState<AnalysisState>({ status: 'idle' })
  const lastFile = useRef<File | null>(null)
  const controller = useRef<AbortController | null>(null)

  // przerwij trwającą analizę przy odmontowaniu komponentu
  useEffect(() => () => controller.current?.abort(), [])

  const analyze = useCallback(
    async (file: File) => {
      controller.current?.abort()
      const abort = new AbortController()
      controller.current = abort
      lastFile.current = file

      const validationError = await validatePdfFile(file)
      if (validationError) {
        setState({ status: 'error', message: validationError, canRetry: false })
        return
      }

      const fileName = file.name.slice(0, 255)
      try {
        setState({ status: 'working', fileName, step: 'reading' })
        // pdf.js (~1 MB) ładujemy dopiero, gdy jest potrzebny
        const { extractPdf } = await import('./pdf')
        const pdf = await extractPdf(file)

        const pages = [...pdf.pages]
        let done = 0
        if (pdf.scannedPages.length > 0) {
          const total = pdf.scannedPages.length
          setState({ status: 'working', fileName, step: 'ocr', detail: `0 z ${total}` })
          await Promise.all(
            pdf.scannedPages.map(async (pageNumber) => {
              const text = await ocrPage(await pdf.renderPage(pageNumber), abort.signal)
              pages[pageNumber - 1] = text
              done++
              if (!abort.signal.aborted) {
                setState({ status: 'working', fileName, step: 'ocr', detail: `${done} z ${total}` })
              }
            }),
          )
        }

        if (pages.every((page) => page.trim().length === 0)) {
          setState({
            status: 'error',
            message: 'Nie znaleziono w dokumencie tekstu do analizy.',
            canRetry: false,
          })
          return
        }

        setState({ status: 'working', fileName, step: 'analyzing' })
        const result = await analyzeDocument(
          { fileName, pages, ocrPages: pdf.scannedPages },
          abort.signal,
        )

        const final: AnalysisResult =
          pdf.skippedPages.length === 0
            ? result
            : {
                ...result,
                warnings: [
                  ...result.warnings,
                  {
                    code: 'ocr_skipped',
                    message: `Strony bez warstwy tekstowej ponad limit OCR (${LIMITS.maxOcrPages}) nie zostały przeanalizowane: ${pdf.skippedPages.join(', ')}.`,
                  },
                ],
              }

        if (abort.signal.aborted) return
        setState({ status: 'done', result: final })
        onResult(final)
      } catch (error) {
        if (abort.signal.aborted) return
        const message =
          error instanceof ApiRequestError || error instanceof PdfReadError
            ? error.message
            : 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.'
        setState({ status: 'error', message, canRetry: !(error instanceof PdfReadError) })
      }
    },
    [onResult],
  )

  const retry = useCallback(() => {
    if (lastFile.current) void analyze(lastFile.current)
  }, [analyze])

  const reset = useCallback(() => {
    controller.current?.abort()
    setState({ status: 'idle' })
  }, [])

  const show = useCallback((result: AnalysisResult) => {
    controller.current?.abort()
    setState({ status: 'done', result })
  }, [])

  return { state, analyze, retry, reset, show }
}
