import type { AnalysisResult } from '@pdf-insight/shared'
import type { HistoryEntry } from '../lib/history'
import { DOCUMENT_TYPE_LABELS, formatDateTime } from '../lib/format'
import { FileIcon, TrashIcon } from './Icons'

interface HistoryPanelProps {
  entries: HistoryEntry[]
  onOpen: (result: AnalysisResult) => void
  onRemove: (id: string) => void
  onClear: () => void
}

export function HistoryPanel({ entries, onOpen, onRemove, onClear }: HistoryPanelProps) {
  return (
    <section
      aria-labelledby="history-heading"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="history-heading" className="font-semibold">
          Ostatnie analizy
        </h2>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            Wyczyść
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-600">
          Nie masz jeszcze żadnych analiz. Wyniki zapiszą się tutaj — tylko w tej przeglądarce.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 py-2">
              <button
                type="button"
                onClick={() => onOpen(entry.result)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1.5 text-left hover:bg-slate-50"
              >
                <FileIcon className="size-5 shrink-0 text-indigo-600" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {entry.result.document.fileName}
                  </span>
                  <span className="block text-xs text-slate-600">
                    {DOCUMENT_TYPE_LABELS[entry.result.document.type]} ·{' '}
                    {formatDateTime(entry.savedAt)}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRemove(entry.id)}
                aria-label={`Usuń z historii: ${entry.result.document.fileName}`}
                className="rounded p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
