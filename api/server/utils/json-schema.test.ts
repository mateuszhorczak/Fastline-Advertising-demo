import { modelOutputSchema } from '@pdf-insight/shared'
import { describe, expect, it } from 'vitest'
import { toGeminiSchema } from './json-schema'

describe('toGeminiSchema', () => {
  const schema = toGeminiSchema(modelOutputSchema)
  const json = JSON.stringify(schema)

  it('usuwa słowa kluczowe nieobsługiwane przez Gemini', () => {
    expect(json).not.toContain('"pattern"')
    expect(json).not.toContain('"minLength"')
    expect(json).not.toContain('$schema')
  })

  it('zamienia anyOf z null na tablicę typów', () => {
    const properties = schema.properties as Record<string, Record<string, unknown>>
    expect(properties.title?.type).toEqual(['string', 'null'])
    expect(properties.date?.type).toEqual(['string', 'null'])
    expect(properties.date?.format).toBe('date')
    expect(json).not.toContain('anyOf')
  })

  it('zachowuje enum, wymagane pola i limity tablic', () => {
    expect(json).toContain('"enum":["faktura","umowa","oferta","raport","inne"]')
    expect(schema.required).toContain('summary')
    expect(json).toContain('"minItems":3')
    expect(json).toContain('"maxItems":7')
  })
})
