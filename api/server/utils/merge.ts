import type { ModelOutput } from '@pdf-insight/shared'

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const k = key(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

const normalize = (value: string) => value.trim().toLocaleLowerCase()

/**
 * Łączy wyniki fragmentów długiego dokumentu. Metadane bierzemy z pierwszego fragmentu
 * (tam jest strona tytułowa), listy scalamy bez duplikatów. Podsumowanie i punkty kluczowe
 * pisze osobne wywołanie modelu na podstawie wyników cząstkowych.
 */
export function mergeOutputs(
  outputs: ModelOutput[],
  final: Pick<ModelOutput, 'summary' | 'keyPoints'>,
): ModelOutput {
  const [first] = outputs
  if (!first) throw new Error('mergeOutputs: brak wyników do połączenia')

  return {
    language: first.language,
    type: first.type,
    title: outputs.find((o) => o.title)?.title ?? null,
    date: outputs.find((o) => o.date)?.date ?? null,
    summary: final.summary,
    keyPoints: final.keyPoints,
    entities: {
      organizations: uniqueBy(
        outputs.flatMap((o) => o.entities.organizations),
        normalize,
      ),
      people: uniqueBy(
        outputs.flatMap((o) => o.entities.people),
        normalize,
      ),
    },
    amounts: uniqueBy(
      outputs.flatMap((o) => o.amounts),
      (a) => `${a.value}|${a.currency}|${normalize(a.context)}`,
    ),
    dates: uniqueBy(
      outputs.flatMap((o) => o.dates),
      (d) => `${d.date}|${normalize(d.context)}`,
    ),
    keywords: uniqueBy(
      outputs.flatMap((o) => o.keywords),
      normalize,
    ).slice(0, 15),
  }
}
