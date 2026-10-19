/**
 * CORS ograniczony do domeny demo. Żądania POST z innych originów (albo bez originu)
 * są odrzucane — przeglądarka i tak by je zablokowała, a tak nie zużywają limitu API.
 */
export default defineEventHandler((event) => {
  const allowed = useRuntimeConfig(event)
    .allowedOrigins.split(',')
    .map((origin) => origin.trim())
  const origin = getRequestHeader(event, 'origin')
  const isAllowed = origin !== undefined && allowed.includes(origin)

  if (isAllowed) {
    setResponseHeaders(event, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    })
  }

  if (event.method === 'OPTIONS') {
    setResponseStatus(event, isAllowed ? 204 : 403)
    return ''
  }

  if (event.method === 'POST' && !isAllowed) {
    setResponseStatus(event, 403)
    return { error: { code: 'forbidden_origin', message: 'Niedozwolone źródło żądania.' } }
  }
})
