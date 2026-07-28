import { describe, expect, it } from 'vitest'

import { applyMiddlewareRequestHeaders } from './middleware-request-headers'

describe('applyMiddlewareRequestHeaders', () => {
  it('preserves the locale rewrite while adding request context overrides', () => {
    const responseHeaders = new Headers({
      'x-middleware-rewrite': 'http://localhost:2323/zh/posts',
    })
    const requestHeaders = new Headers({
      host: 'blog.example.com',
      request_locale: 'zh',
    })

    applyMiddlewareRequestHeaders(responseHeaders, requestHeaders)

    expect(responseHeaders.get('x-middleware-rewrite')).toBe(
      'http://localhost:2323/zh/posts',
    )
    expect(responseHeaders.get('x-middleware-request-request_locale')).toBe(
      'zh',
    )
    expect(responseHeaders.get('x-middleware-override-headers')).toContain(
      'request_locale',
    )
  })
})
