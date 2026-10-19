import { type EventHandler, type EventHandlerRequest, type H3Event, setResponseStatus } from 'h3'

/** Błąd z kodem i komunikatem po polsku, który można bezpiecznie pokazać użytkownikowi. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

/** Zamienia wyjątki na odpowiedź { error: { code, message } } bez ujawniania szczegółów. */
export function defineApiHandler<T>(
  handler: (event: H3Event<EventHandlerRequest>) => Promise<T>,
): EventHandler<EventHandlerRequest, Promise<T | { error: { code: string; message: string } }>> {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event)
    } catch (error) {
      if (error instanceof ApiError) {
        setResponseStatus(event, error.status)
        return { error: { code: error.code, message: error.message } }
      }
      console.error('Unexpected error', error)
      setResponseStatus(event, 500)
      return { error: { code: 'internal', message: 'Wystąpił nieoczekiwany błąd serwera.' } }
    }
  })
}
