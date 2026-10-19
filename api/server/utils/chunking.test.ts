import { describe, expect, it } from 'vitest'
import { splitIntoChunks } from './chunking'

describe('splitIntoChunks', () => {
  it('krótki dokument mieści się w jednym fragmencie z oznaczeniem stron', () => {
    const chunks = splitIntoChunks(['Strona pierwsza', 'Skan aneksu'], [2])
    expect(chunks).toHaveLength(1)
    expect(chunks[0]?.text).toContain('--- Strona 1 ---\nStrona pierwsza')
    expect(chunks[0]?.text).toContain('--- Strona 2 (OCR) ---\nSkan aneksu')
  })

  it('dzieli długi dokument po całych stronach', () => {
    const pages = Array.from({ length: 5 }, (_, i) => `${i}`.repeat(40))
    const chunks = splitIntoChunks(pages, [], 120)
    expect(chunks.map((c) => [c.firstPage, c.lastPage])).toEqual([
      [1, 2],
      [3, 4],
      [5, 5],
    ])
    expect(chunks.every((c) => c.text.length <= 120)).toBe(true)
  })

  it('tnie stronę dłuższą niż limit', () => {
    const chunks = splitIntoChunks(['x'.repeat(250)], [], 100)
    expect(chunks.length).toBe(3)
    expect(chunks.every((c) => c.firstPage === 1)).toBe(true)
  })
})
