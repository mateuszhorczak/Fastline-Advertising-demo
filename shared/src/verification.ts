/**
 * Sprawdza, czy kwoty i daty zwrócone przez model faktycznie występują w tekście PDF.
 * To zabezpieczenie po stronie kodu: model może się pomylić albo dać się zmanipulować,
 * ale nie dopisze liczby do tekstu źródłowego.
 */

const MULTIPLIERS: Record<string, number> = { tys: 1e3, mln: 1e6, mld: 1e9 }

// "184 500,00" (grupy tysięcy oddzielone spacją) albo "12500.00", "1.234,56", "12.03.2026"
const NUMBER_RE = /\d{1,3}(?: \d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)*/g

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ')
}

/** Wszystkie możliwe interpretacje liczby zapisanej z separatorami "." i ",". */
function interpretSeparated(token: string): number[] {
  const parts = token.split(/[.,]/)
  const seps = token.replace(/\d/g, '')
  const results = parts.map(Number)
  results.push(Number(parts.join('')))

  if (parts.length === 2) {
    results.push(Number(`${parts[0]}.${parts[1]}`))
  } else if (parts.length > 2) {
    // "1.234.567,89" — ostatni separator dziesiętny, pozostałe to tysiące
    const decimals = parts.pop()
    if (seps.at(-1) !== seps.at(0)) results.push(Number(`${parts.join('')}.${decimals}`))
  }
  return results
}

/** Zbiór liczb występujących w tekście, we wszystkich sensownych interpretacjach. */
export function extractNumbers(text: string): Set<number> {
  const numbers = new Set<number>()
  const normalized = normalizeWhitespace(text)

  for (const match of normalized.matchAll(NUMBER_RE)) {
    const token = match[0]
    const candidates: number[] = []

    if (token.includes(' ')) {
      // grupy tysięcy: bierzemy całość i każdy "ogon" — "1 240,00" może być kolumną Lp. + kwotą
      const groups = token.split(' ')
      for (let i = 0; i < groups.length; i++) {
        candidates.push(...interpretSeparated(groups.slice(i).join('')))
      }
    } else {
      candidates.push(...interpretSeparated(token))
    }

    const after = normalized.slice(
      (match.index ?? 0) + token.length,
      (match.index ?? 0) + token.length + 6,
    )
    const multiplier = /^ ?(tys|mln|mld)/i.exec(after)?.[1]?.toLowerCase()

    for (const value of candidates) {
      if (!Number.isFinite(value)) continue
      numbers.add(value)
      if (multiplier) numbers.add(value * (MULTIPLIERS[multiplier] ?? 1))
    }
  }
  return numbers
}

export function isAmountInText(value: number, numbers: Set<number>): boolean {
  for (const n of numbers) {
    if (Math.abs(n - value) < 0.005) return true
  }
  return false
}

const PL_MONTHS = [
  ['stycznia', 'styczeń'],
  ['lutego', 'luty'],
  ['marca', 'marzec'],
  ['kwietnia', 'kwiecień'],
  ['maja', 'maj'],
  ['czerwca', 'czerwiec'],
  ['lipca', 'lipiec'],
  ['sierpnia', 'sierpień'],
  ['września', 'wrzesień'],
  ['października', 'październik'],
  ['listopada', 'listopad'],
  ['grudnia', 'grudzień'],
]
const EN_MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

function monthIndex(name: string): number {
  const lower = name.toLowerCase()
  const pl = PL_MONTHS.findIndex((forms) => forms.includes(lower))
  return pl >= 0 ? pl : EN_MONTHS.indexOf(lower)
}

function toIso(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day))
  if (month < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1) return null
  return date.toISOString().slice(0, 10)
}

const MONTH_NAMES = [...PL_MONTHS.flat(), ...EN_MONTHS].join('|')

// grupy nazwane: y = rok, m = miesiąc (liczba lub nazwa), d = dzień
const DATE_PATTERNS: RegExp[] = [
  /(?<y>\d{4})-(?<m>\d{2})-(?<d>\d{2})/g,
  /\b(?<d>\d{1,2})[./](?<m>\d{1,2})[./](?<y>\d{4})/g,
  new RegExp(`\\b(?<d>\\d{1,2}) (?<m>${MONTH_NAMES}) (?<y>\\d{4})`, 'giu'),
  new RegExp(`\\b(?<m>${EN_MONTHS.join('|')}) (?<d>\\d{1,2}),? (?<y>\\d{4})`, 'gi'),
]

function parseDateMatch(groups: Record<string, string | undefined>): string | null {
  const { y = '', m = '', d = '' } = groups
  const month = /^\d+$/.test(m) ? Number(m) : monthIndex(m) + 1
  return toIso(Number(y), month, Number(d))
}

/** Zbiór dat (YYYY-MM-DD) zapisanych w tekście w popularnych formatach PL/EN. */
export function extractDates(text: string): Set<string> {
  const normalized = normalizeWhitespace(text)
  const dates = new Set<string>()
  for (const re of DATE_PATTERNS) {
    for (const match of normalized.matchAll(re)) {
      const iso = parseDateMatch(match.groups ?? {})
      if (iso) dates.add(iso)
    }
  }
  return dates
}
