import { describe, expect, it } from 'vitest'
import { extractDates, extractNumbers, isAmountInText } from './verification'

// fragmenty z dokumentu testowego Test_PDF_Insight_umowa_14-2026.pdf
const TEXT = `wynagrodzenie ryczałtowe w wysokości 184 500,00 zł netto, tj. 42 435,00 zł,
co daje łącznie 226 935,00 zł brutto. Opłaty licencyjne wynoszą 2 150 EUR rocznie.
Koszt infrastruktury 890 USD miesięcznie. Kapitał zakładowy: 2 500 000,00 zł.
1 Konsultant biznesowy roboczogodzina 240,00 zł. Ilość 1 55 350,00 23% 12 730,50
wzrostu przychodów o 4,2 mln zł rocznie. Kurs 1.234,56 oraz 1,234.56.
zawarta w Gdańsku w dniu 12.03.2026 r. od 1 kwietnia 2026 r. do 31 marca 2028 r.
Planowany termin Go-live: 12 października 2026 r. Data: 2026-11-20. March 3, 2027`

describe('extractNumbers', () => {
  const numbers = extractNumbers(TEXT)

  it.each([184500, 42435, 226935, 2150, 890, 2500000, 240, 55350, 12730.5, 4200000, 1234.56])(
    'znajduje kwotę %d zapisaną w polskim formacie',
    (value) => {
      expect(isAmountInText(value, numbers)).toBe(true)
    },
  )

  it.each([1, 12345, 999999, 184501])('nie potwierdza kwoty spoza tekstu: %d', (value) => {
    expect(isAmountInText(value, extractNumbers('Wynagrodzenie 184 500,00 zł netto.'))).toBe(false)
  })
})

describe('extractDates', () => {
  const dates = extractDates(TEXT)

  it.each(['2026-03-12', '2026-04-01', '2028-03-31', '2026-10-12', '2026-11-20', '2027-03-03'])(
    'znajduje datę %s',
    (date) => {
      expect(dates.has(date)).toBe(true)
    },
  )

  it('nie tworzy nieistniejących dat', () => {
    expect(extractDates('31.02.2026').size).toBe(0)
  })

  it('nie potwierdza daty spoza tekstu', () => {
    expect(dates.has('2026-03-13')).toBe(false)
  })
})
