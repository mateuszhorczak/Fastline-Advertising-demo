import type { AnalysisResult } from '@pdf-insight/shared'
import { type ReactNode, useState } from 'react'
import { downloadJson } from '../lib/download'
import { DOCUMENT_TYPE_LABELS, formatAmount, formatDate, languageName } from '../lib/format'
import { AlertIcon, CheckIcon, DownloadIcon, FileIcon } from './Icons'
import { JsonPreview } from './JsonPreview'

type Tab = 'preview' | 'json'

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">{title}</h3>
      {children}
    </section>
  )
}

function Empty() {
  return <p className="text-sm text-slate-500">Brak w dokumencie.</p>
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span
      className="inline-flex items-center gap-1 text-xs text-emerald-700"
      title="Znaleziono w tekście PDF"
    >
      <CheckIcon className="size-3.5" /> w tekście
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium text-amber-800"
      title="Nie znaleziono w tekście PDF"
    >
      <AlertIcon className="size-3.5" /> do sprawdzenia
    </span>
  )
}

export function ResultView({ result, onNew }: { result: AnalysisResult; onNew: () => void }) {
  const [tab, setTab] = useState<Tab>('preview')
  const { document: doc } = result

  const meta = [
    DOCUMENT_TYPE_LABELS[doc.type],
    languageName(doc.language),
    doc.date ? formatDate(doc.date) : 'brak daty',
    `${doc.pages} ${doc.pages === 1 ? 'strona' : 'str.'}`,
  ]

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate text-sm text-slate-600">
            <FileIcon className="size-4 shrink-0" />
            <span className="truncate">{doc.fileName}</span>
          </p>
          <h2 className="mt-1 text-2xl font-bold break-words">
            {doc.title ?? 'Dokument bez tytułu'}
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {meta.map((item) => (
              <li
                key={item}
                className="rounded-full bg-slate-200 px-3 py-0.5 text-xs font-medium text-slate-800"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadJson(result)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <DownloadIcon className="size-4" />
            Pobierz JSON
          </button>
          <button
            type="button"
            onClick={onNew}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100"
          >
            Nowa analiza
          </button>
        </div>
      </header>

      {result.warnings.length > 0 && (
        <section aria-label="Ostrzeżenia" className="space-y-2">
          {result.warnings.map((warning) => (
            <p
              key={warning.code + warning.message}
              className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            >
              <AlertIcon className="mt-0.5 size-4 shrink-0 text-amber-700" />
              <span className="break-words">{warning.message}</span>
            </p>
          ))}
        </section>
      )}

      <div
        role="tablist"
        aria-label="Widok wyniku"
        className="flex gap-1 rounded-lg bg-slate-200 p-1 sm:w-fit"
      >
        {(
          [
            ['preview', 'Podgląd'],
            ['json', 'JSON'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium sm:flex-none ${
              tab === id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'json' ? (
        <JsonPreview result={result} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <Card title="Podsumowanie">
              <p className="leading-relaxed text-slate-800">{result.summary}</p>
            </Card>
          </div>

          <Card title="Najważniejsze punkty">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-800">
              {result.keyPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </Card>

          <Card title="Podmioty">
            <h4 className="text-xs font-semibold text-slate-600">Organizacje</h4>
            {result.entities.organizations.length ? (
              <ul className="mt-1 mb-3 space-y-1 text-sm">
                {result.entities.organizations.map((org) => (
                  <li key={org}>{org}</li>
                ))}
              </ul>
            ) : (
              <Empty />
            )}
            <h4 className="text-xs font-semibold text-slate-600">Osoby</h4>
            {result.entities.people.length ? (
              <ul className="mt-1 space-y-1 text-sm">
                {result.entities.people.map((person) => (
                  <li key={person}>{person}</li>
                ))}
              </ul>
            ) : (
              <Empty />
            )}
          </Card>

          <div className="lg:col-span-2">
            <Card title="Kwoty">
              {result.amounts.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-slate-600">
                      <tr>
                        <th scope="col" className="py-2 pr-4 font-semibold">
                          Kwota
                        </th>
                        <th scope="col" className="py-2 pr-4 font-semibold">
                          Kontekst
                        </th>
                        <th scope="col" className="py-2 font-semibold">
                          Weryfikacja
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.amounts.map((amount, index) => (
                        <tr key={index}>
                          <td className="py-2 pr-4 font-medium whitespace-nowrap tabular-nums">
                            {formatAmount(amount.value, amount.currency)}
                          </td>
                          <td className="py-2 pr-4 text-slate-700">{amount.context}</td>
                          <td className="py-2 whitespace-nowrap">
                            <VerifiedBadge verified={amount.verified} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty />
              )}
            </Card>
          </div>

          <Card title="Daty">
            {result.dates.length ? (
              <ul className="space-y-2 text-sm">
                {result.dates.map((date, index) => (
                  <li key={index} className="flex flex-wrap items-baseline gap-x-2">
                    <time dateTime={date.date} className="font-medium whitespace-nowrap">
                      {formatDate(date.date)}
                    </time>
                    <span className="text-slate-700">{date.context}</span>
                    <VerifiedBadge verified={date.verified} />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty />
            )}
          </Card>

          <Card title="Słowa kluczowe">
            {result.keywords.length ? (
              <ul className="flex flex-wrap gap-2">
                {result.keywords.map((keyword) => (
                  <li
                    key={keyword}
                    className="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-900"
                  >
                    {keyword}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty />
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
