import type { ModelOutput } from '@pdf-insight/shared'
import { describe, expect, it } from 'vitest'
import { mergeOutputs } from './merge'

const part = (overrides: Partial<ModelOutput>): ModelOutput => ({
  language: 'pl',
  type: 'umowa',
  title: null,
  date: null,
  summary: 'a',
  keyPoints: ['a', 'b', 'c'],
  entities: { organizations: [], people: [] },
  amounts: [],
  dates: [],
  keywords: [],
  ...overrides,
})

describe('mergeOutputs', () => {
  it('scala listy bez duplikatów i bierze metadane z pierwszego fragmentu z danymi', () => {
    const merged = mergeOutputs(
      [
        part({
          title: 'Umowa ramowa',
          entities: { organizations: ['Kwadrat Software S.A.'], people: ['Anna Kowalczyk'] },
          amounts: [{ value: 100, currency: 'PLN', context: 'Opłata' }],
          keywords: ['CRM'],
        }),
        part({
          type: 'faktura',
          date: '2026-03-12',
          entities: {
            organizations: ['kwadrat software s.a.'],
            people: ['Anna Kowalczyk', 'Ewa Szymańska'],
          },
          amounts: [
            { value: 100, currency: 'PLN', context: 'opłata' },
            { value: 100, currency: 'EUR', context: 'opłata' },
          ],
          keywords: ['crm', 'SLA'],
        }),
      ],
      { summary: 'Końcowe podsumowanie.', keyPoints: ['1', '2', '3'] },
    )

    expect(merged.type).toBe('umowa')
    expect(merged.title).toBe('Umowa ramowa')
    expect(merged.date).toBe('2026-03-12')
    expect(merged.summary).toBe('Końcowe podsumowanie.')
    expect(merged.entities.organizations).toEqual(['Kwadrat Software S.A.'])
    expect(merged.entities.people).toEqual(['Anna Kowalczyk', 'Ewa Szymańska'])
    expect(merged.amounts).toHaveLength(2)
    expect(merged.keywords).toEqual(['CRM', 'SLA'])
  })
})
