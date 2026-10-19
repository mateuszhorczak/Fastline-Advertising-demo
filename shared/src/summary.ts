/** Liczba zdań wg reguł Unicode (Intl.Segmenter) — "sp. z o.o." czy "12.03.2026 r." nie kończą zdania. */
export function countSentences(text: string, language = 'pl'): number {
  const segmenter = new Intl.Segmenter(language, { granularity: 'sentence' })
  let count = 0
  for (const { segment } of segmenter.segment(text.trim())) {
    if (/\p{L}/u.test(segment)) count++
  }
  return count
}
