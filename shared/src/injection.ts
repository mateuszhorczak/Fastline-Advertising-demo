/**
 * Heurystyczne wykrywanie fragmentów, które wyglądają na polecenia dla modelu AI.
 * Nie usuwamy ich z tekstu (to wciąż treść dokumentu) — informujemy użytkownika,
 * a prompt każe modelowi traktować je jako dane.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /(zignoruj|pomiń|zapomnij|nie stosuj)\S*\s+(\S+\s+){0,4}(polece|instrukc|zasad)\S*/i,
  /instrukcj\S*\s+dla\s+(systemu\s+|modelu\s+|asystenta\s+)?(ai|sztucznej inteligencji|llm|modelu|asystenta)\b/i,
  /nie\s+wspominaj\s+o\s+(tej|tych|niniejszej)\s+(instrukcj|polece)\S*/i,
  /ignore\s+(\S+\s+){0,4}(instructions|prompts?|rules)\b/i,
  /(disregard|forget)\s+(\S+\s+){0,4}(instructions|prompts?|rules)\b/i,
  /\b(system prompt|prompt systemowy|you are now|jesteś teraz)\b/i,
  /\b(instructions?|note)\s+(for|to)\s+(the\s+)?(ai|llm|assistant|model)\b/i,
]

export interface InjectionMatch {
  snippet: string
}

const CONTEXT_CHARS = 40
/** Trafienia bliżej siebie niż ta liczba znaków traktujemy jako jeden fragment. */
const MERGE_GAP = 150

/** Rozszerza zakres do granic słów, żeby fragment nie zaczynał się w połowie wyrazu. */
function expandToWords(text: string, start: number, end: number): [number, number] {
  let from = Math.max(0, start - CONTEXT_CHARS)
  let to = Math.min(text.length, end + CONTEXT_CHARS)
  while (from > 0 && /\S/.test(text.charAt(from - 1))) from--
  while (to < text.length && /\S/.test(text.charAt(to))) to++
  return [from, to]
}

export function detectInjection(text: string): InjectionMatch[] {
  const normalized = text.replace(/\s+/g, ' ')
  const ranges: [number, number][] = []

  for (const pattern of INJECTION_PATTERNS) {
    const match = pattern.exec(normalized)
    if (match) ranges.push(expandToWords(normalized, match.index, match.index + match[0].length))
  }

  // kilka wzorców trafia zwykle w ten sam akapit — łączymy bliskie zakresy w jeden fragment
  ranges.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const range of ranges) {
    const last = merged.at(-1)
    if (last && range[0] - last[1] <= MERGE_GAP) last[1] = Math.max(last[1], range[1])
    else merged.push(range)
  }

  return merged.map(([from, to]) => ({ snippet: normalized.slice(from, to).trim() }))
}
