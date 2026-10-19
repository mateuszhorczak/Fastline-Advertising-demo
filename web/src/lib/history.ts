import { type AnalysisResult, analysisResultSchema } from '@pdf-insight/shared'
import { z } from 'zod'

const STORAGE_KEY = 'pdf-insight:history'
const MAX_ENTRIES = 10

const entrySchema = z.object({
  id: z.string(),
  savedAt: z.iso.datetime(),
  result: analysisResultSchema,
})

export type HistoryEntry = z.infer<typeof entrySchema>

/** Odczyt z localStorage — dane mogły zostać zmienione ręcznie, więc też je walidujemy. */
export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      const entry = entrySchema.safeParse(item)
      return entry.success ? [entry.data] : []
    })
  } catch {
    return []
  }
}

function persist(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // brak miejsca lub tryb prywatny — historia jest dodatkiem, aplikacja działa bez niej
  }
}

export function addToHistory(entries: HistoryEntry[], result: AnalysisResult): HistoryEntry[] {
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    result,
  }
  const next = [entry, ...entries].slice(0, MAX_ENTRIES)
  persist(next)
  return next
}

export function removeFromHistory(entries: HistoryEntry[], id: string): HistoryEntry[] {
  const next = entries.filter((entry) => entry.id !== id)
  persist(next)
  return next
}

export function clearHistory(): HistoryEntry[] {
  persist([])
  return []
}
