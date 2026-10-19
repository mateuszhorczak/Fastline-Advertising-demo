import { z } from 'zod'

type JsonSchema = { [key: string]: unknown }

// słowa kluczowe JSON Schema, których Gemini nie obsługuje — walidację i tak robi Zod
const UNSUPPORTED = new Set(['$schema', 'pattern', 'minLength', 'maxLength'])

function isObject(value: unknown): value is JsonSchema {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function simplify(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(simplify)
  if (!isObject(node)) return node

  // { anyOf: [{ type: 'string' }, { type: 'null' }] } -> { type: ['string', 'null'] }
  const anyOf = node.anyOf
  if (Array.isArray(anyOf) && anyOf.length === 2) {
    const nonNull = anyOf.find((s) => isObject(s) && s.type !== 'null')
    const hasNull = anyOf.some((s) => isObject(s) && s.type === 'null')
    if (hasNull && isObject(nonNull) && typeof nonNull.type === 'string') {
      const { anyOf: _anyOf, ...rest } = node
      return simplify({ ...nonNull, ...rest, type: [nonNull.type, 'null'] })
    }
  }

  return Object.fromEntries(
    Object.entries(node)
      .filter(([key]) => !UNSUPPORTED.has(key))
      .map(([key, value]) => [key, simplify(value)]),
  )
}

/** JSON Schema dla `responseJsonSchema` Gemini, generowany z tego samego schematu Zod. */
export function toGeminiSchema(schema: z.ZodType): JsonSchema {
  return simplify(z.toJSONSchema(schema)) as JsonSchema
}
