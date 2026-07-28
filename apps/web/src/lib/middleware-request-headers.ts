export function applyMiddlewareRequestHeaders(
  responseHeaders: Headers,
  requestHeaders: Headers,
) {
  const overridden: string[] = []

  requestHeaders.forEach((value, key) => {
    responseHeaders.set(`x-middleware-request-${key}`, value)
    overridden.push(key)
  })
  responseHeaders.set('x-middleware-override-headers', overridden.join(','))
}
