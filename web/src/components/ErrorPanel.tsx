import { AlertIcon } from './Icons'

interface ErrorPanelProps {
  message: string
  onRetry?: (() => void) | undefined
  onReset: () => void
}

export function ErrorPanel({ message, onRetry, onReset }: ErrorPanelProps) {
  return (
    <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <AlertIcon className="mt-0.5 size-5 shrink-0 text-red-700" />
        <div>
          <h2 className="font-semibold text-red-900">Nie udało się przeanalizować pliku</h2>
          <p className="mt-1 text-sm text-red-800">{message}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
              >
                Spróbuj ponownie
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
            >
              Wybierz inny plik
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
