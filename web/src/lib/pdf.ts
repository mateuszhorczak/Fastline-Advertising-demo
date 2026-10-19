import { LIMITS } from '@pdf-insight/shared'
import {
  GlobalWorkerOptions,
  InvalidPDFException,
  PasswordException,
  getDocument,
} from 'pdfjs-dist'
import type { PDFPageProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { PdfReadError } from './errors'

// Vite kopiuje worker do dist/ i zwraca adres z uwzględnieniem `base` (GitHub Pages)
GlobalWorkerOptions.workerSrc = workerUrl

/** Strona z mniejszą liczbą znaków traktowana jest jako skan bez warstwy tekstowej. */
const MIN_TEXT_CHARS = 20
const OCR_SCALE = 2
const JPEG_QUALITY = 0.8

export interface ExtractedPdf {
  pages: string[]
  /** Numery stron (od 1) bez warstwy tekstowej, które zostaną odczytane przez OCR. */
  scannedPages: number[]
  /** Strony bez tekstu ponad limit OCR. */
  skippedPages: number[]
  renderPage: (pageNumber: number) => Promise<string>
}

async function pageToText(page: PDFPageProxy): Promise<string> {
  const content = await page.getTextContent()
  return content.items
    .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : '') : ''))
    .join('')
}

/** Renderuje stronę do JPEG (base64 bez prefiksu) do wysłania na OCR. */
async function pageToJpeg(page: PDFPageProxy): Promise<string> {
  const viewport = page.getViewport({ scale: OCR_SCALE })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  await page.render({ canvas, viewport }).promise

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}

export async function extractPdf(file: File): Promise<ExtractedPdf> {
  const data = new Uint8Array(await file.arrayBuffer())

  let pdf
  try {
    pdf = await getDocument({ data }).promise
  } catch (error) {
    if (error instanceof PasswordException) {
      throw new PdfReadError('Plik jest zabezpieczony hasłem — zdejmij hasło i spróbuj ponownie.')
    }
    if (error instanceof InvalidPDFException) {
      throw new PdfReadError('Plik PDF jest uszkodzony lub nieprawidłowy.')
    }
    throw new PdfReadError('Nie udało się odczytać pliku PDF.')
  }

  if (pdf.numPages > LIMITS.maxPages) {
    throw new PdfReadError(`Dokument ma ${pdf.numPages} stron — maksymalnie ${LIMITS.maxPages}.`)
  }

  const pages: string[] = []
  const withoutText: number[] = []
  for (let n = 1; n <= pdf.numPages; n++) {
    const text = await pageToText(await pdf.getPage(n))
    pages.push(text)
    if (text.replace(/\s/g, '').length < MIN_TEXT_CHARS) withoutText.push(n)
  }

  return {
    pages,
    scannedPages: withoutText.slice(0, LIMITS.maxOcrPages),
    skippedPages: withoutText.slice(LIMITS.maxOcrPages),
    renderPage: async (pageNumber) => pageToJpeg(await pdf.getPage(pageNumber)),
  }
}
