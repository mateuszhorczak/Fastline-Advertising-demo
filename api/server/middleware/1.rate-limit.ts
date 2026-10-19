import { checkRateLimit } from '../utils/rate-limit'

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') return

  const ip = getRequestHeader(event, 'cf-connecting-ip') ?? getRequestIP(event) ?? 'unknown'
  if (!(await checkRateLimit(event, ip))) {
    setResponseStatus(event, 429)
    setResponseHeader(event, 'Retry-After', 60)
    return {
      error: {
        code: 'rate_limited',
        message: 'Zbyt wiele żądań. Spróbuj ponownie za minutę.',
      },
    }
  }
})
