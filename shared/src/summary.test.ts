import { describe, expect, it } from 'vitest'
import { countSentences } from './summary'

describe('countSentences', () => {
  it('nie dzieli zdań na skrótach i datach', () => {
    const text =
      'Umowa zawarta 12.03.2026 r. między Nordwave Logistics sp. z o.o. a Kwadrat Software S.A. dotyczy CRM. Wynagrodzenie wynosi 184 500,00 zł netto. Umowa obowiązuje 24 miesiące.'
    expect(countSentences(text)).toBe(3)
  })
})
