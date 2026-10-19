import type { AnalysisStep } from '../lib/use-analysis'
import { CheckIcon, Spinner } from './Icons'

const STEPS: { id: AnalysisStep; label: string }[] = [
  { id: 'reading', label: 'Odczyt tekstu z PDF' },
  { id: 'ocr', label: 'OCR stron bez tekstu' },
  { id: 'analyzing', label: 'Analiza AI: podsumowanie i dane' },
]

interface ProgressPanelProps {
  fileName: string
  step: AnalysisStep
  usedOcr: boolean
  detail?: string | undefined
}

export function ProgressPanel({ fileName, step, usedOcr, detail }: ProgressPanelProps) {
  // krok OCR pokazujemy tylko wtedy, gdy dokument ma strony bez tekstu
  const steps = STEPS.filter((s) => s.id !== 'ocr' || usedOcr || step === 'ocr')
  const currentIndex = steps.findIndex((s) => s.id === step)

  return (
    <section
      aria-live="polite"
      aria-busy="true"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold">Analizuję dokument…</h2>
      <p className="mt-1 truncate text-sm text-slate-600">{fileName}</p>
      <ol className="mt-5 space-y-3">
        {steps.map((s, index) => {
          const isDone = index < currentIndex
          const isCurrent = index === currentIndex
          return (
            <li key={s.id} className="flex items-center gap-3 text-sm">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                  isDone
                    ? 'bg-emerald-100 text-emerald-700'
                    : isCurrent
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {isDone ? <CheckIcon /> : isCurrent ? <Spinner className="size-4" /> : index + 1}
              </span>
              <span className={isCurrent ? 'font-medium text-slate-900' : 'text-slate-600'}>
                {s.label}
                {isCurrent && detail ? ` (${detail})` : ''}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="mt-5 text-xs text-slate-500">Zwykle trwa to 5–20 sekund.</p>
    </section>
  )
}
