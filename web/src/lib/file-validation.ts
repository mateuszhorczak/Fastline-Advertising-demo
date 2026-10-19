import { LIMITS } from '@pdf-insight/shared'

const PDF_MAGIC = '%PDF-'

/** Zwraca komunikat błędu albo null, jeśli plik wygląda na poprawny PDF. */
export async function validatePdfFile(file: File): Promise<string | null> {
  const looksLikePdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!looksLikePdf) return 'Obsługiwane są tylko pliki PDF.'
  if (file.size === 0) return 'Plik jest pusty.'
  if (file.size > LIMITS.maxFileBytes) return 'Plik jest za duży — maksymalny rozmiar to 10 MB.'

  // rozszerzenie można zmienić — sprawdzamy też nagłówek pliku
  const header = new TextDecoder().decode(await file.slice(0, PDF_MAGIC.length).arrayBuffer())
  if (header !== PDF_MAGIC) return 'Plik nie jest prawidłowym dokumentem PDF.'

  return null
}
