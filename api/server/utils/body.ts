import type { H3Event } from 'h3'
import type { z } from 'zod'
import { ApiError } from './errors'

/** Czyta JSON z limitem rozmiaru i waliduje go schematem Zod. */
export async function readJsonBody<T extends z.ZodType>(
  event: H3Event,
  schema: T,
  maxBytes: number,
): Promise<z.infer<T>> {
  const declared = Number(getRequestHeader(event, 'content-length') ?? 0)
  if (declared > maxBytes) throw tooLarge()

  const raw = (await readRawBody(event, 'utf8')) ?? ''
  if (new TextEncoder().encode(raw).byteLength > maxBytes) throw tooLarge()

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    throw new ApiError(400, 'invalid_json', 'Nieprawidłowy format żądania.')
  }

  const parsed = schema.safeParse(json)
  if (!parsed.success) throw new ApiError(400, 'invalid_request', 'Nieprawidłowe dane żądania.')
  return parsed.data
}

function tooLarge() {
  return new ApiError(413, 'payload_too_large', 'Dokument jest zbyt duży do analizy.')
}
