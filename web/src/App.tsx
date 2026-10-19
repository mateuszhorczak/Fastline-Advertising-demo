import type { AnalysisResult } from '@pdf-insight/shared'
import { useCallback, useState } from 'react'
import { ErrorPanel } from './components/ErrorPanel'
import { HistoryPanel } from './components/HistoryPanel'
import { PrivacyNotice } from './components/PrivacyNotice'
import { ProgressPanel } from './components/ProgressPanel'
import { ResultView } from './components/ResultView'
import { UploadZone } from './components/UploadZone'
import { addToHistory, clearHistory, loadHistory, removeFromHistory } from './lib/history'
import { useAnalysis } from './lib/use-analysis'

export function App() {
  // funkcja przekazana do useState wykona się tylko przy pierwszym renderze
  const [history, setHistory] = useState(loadHistory)

  const saveResult = useCallback((result: AnalysisResult) => {
    setHistory((entries) => addToHistory(entries, result))
  }, [])

  const { state, analyze, retry, reset, show } = useAnalysis(saveResult)
  const isWorking = state.status === 'working'

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <div
            className="flex size-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white"
            aria-hidden
          >
            PI
          </div>
          <div>
            <h1 className="text-lg leading-tight font-bold">PDF Insight</h1>
            <p className="text-sm text-slate-600">Podsumowanie i dane JSON z dowolnego PDF-a</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          {state.status === 'done' ? (
            <ResultView result={state.result} onNew={reset} />
          ) : (
            <>
              <UploadZone onFile={(file) => void analyze(file)} disabled={isWorking} />
              {state.status === 'working' && (
                <ProgressPanel fileName={state.fileName} step={state.step} detail={state.detail} />
              )}
              {state.status === 'error' && (
                <ErrorPanel
                  message={state.message}
                  onRetry={state.canRetry ? retry : undefined}
                  onReset={reset}
                />
              )}
              <PrivacyNotice />
            </>
          )}
        </div>

        <aside className="space-y-5">
          {state.status === 'done' && <UploadZone onFile={(file) => void analyze(file)} compact />}
          <HistoryPanel
            entries={history}
            onOpen={show}
            onRemove={(id) => setHistory((entries) => removeFromHistory(entries, id))}
            onClear={() => setHistory(clearHistory())}
          />
        </aside>
      </main>
    </div>
  )
}
