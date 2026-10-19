import { type DragEvent, useId, useRef, useState } from 'react'
import { UploadIcon } from './Icons'

interface UploadZoneProps {
  onFile: (file: File) => void
  disabled?: boolean
  compact?: boolean
}

export function UploadZone({ onFile, disabled = false, compact = false }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const hintId = useId()

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file && !disabled) onFile(file)
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={(event) => {
        // dragleave odpala się też przy wejściu nad element potomny — ignorujemy to
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={handleDrop}
      className={`rounded-2xl border-2 border-dashed text-center transition-colors ${
        compact ? 'px-4 py-5' : 'px-6 py-12'
      } ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white'} ${
        disabled ? 'opacity-60' : ''
      }`}
    >
      {!compact && (
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
          <UploadIcon className="size-6" />
        </div>
      )}
      <p className={`font-medium text-slate-800 ${compact ? 'text-sm' : 'text-lg'}`}>
        Przeciągnij i upuść plik PDF tutaj
      </p>
      <p id={hintId} className="mt-1 text-sm text-slate-600">
        lub wybierz go z dysku · tylko PDF, maks. 10 MB
      </p>
      <button
        type="button"
        disabled={disabled}
        aria-describedby={hintId}
        onClick={() => inputRef.current?.click()}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        <UploadIcon className="size-4" />
        Wybierz plik PDF
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          handleFiles(event.target.files)
          // pozwala wybrać ten sam plik ponownie
          event.target.value = ''
        }}
      />
    </div>
  )
}
