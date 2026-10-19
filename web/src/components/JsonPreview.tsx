import type { AnalysisResult } from '@pdf-insight/shared'
import { useState } from 'react'
import { toJson } from '../lib/download'

export function JsonPreview({ result }: { result: AnalysisResult }) {
  const [copied, setCopied] = useState(false)
  const json = toJson(result)

  async function copy() {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void copy()}
        className="absolute top-3 right-3 rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-600"
      >
        {copied ? 'Skopiowano' : 'Kopiuj'}
      </button>
      {/* React escapuje tekst — bez dangerouslySetInnerHTML */}
      <pre
        tabIndex={0}
        aria-label="Wynik w formacie JSON"
        className="max-h-[70vh] overflow-auto rounded-xl bg-slate-900 p-4 pr-24 text-xs leading-relaxed text-slate-100"
      >
        <code>{json}</code>
      </pre>
    </div>
  )
}
