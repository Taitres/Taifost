import { describe, expect, it, vi } from 'vitest'

import { nativeConsoleUrl, syncUnifiedAdminEntry } from './unified-admin'

describe('unified admin', () => {
  it('routes legacy admin hashes into the embedded Core console', () => {
    expect(
      nativeConsoleUrl('https://api.taitres.com/', '#/posts/edit?id=post-1'),
    ).toBe('https://api.taitres.com/proxy/qaqdmin#/posts/edit?id=post-1')
    expect(nativeConsoleUrl('https://api.taitres.com', '')).toBe(
      'https://api.taitres.com/proxy/qaqdmin#/dashboard',
    )
  })

  it('moves Core admin links to the unified dashboard on the public site', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        web_url: 'https://www.taitres.com',
        admin_url: 'https://api.taitres.com/qaqdmin',
      })
      .mockResolvedValueOnce({})

    await expect(
      syncUnifiedAdminEntry(request, 'https://www.taitres.com'),
    ).resolves.toEqual({
      status: 'updated',
      adminUrl: 'https://www.taitres.com/dashboard',
    })
    expect(request).toHaveBeenNthCalledWith(2, '/options/url', {
      method: 'PATCH',
      body: JSON.stringify({
        adminUrl: 'https://www.taitres.com/dashboard',
      }),
    })
  })

  it('never replaces the public admin URL with a local development origin', async () => {
    const request = vi.fn().mockResolvedValue({
      webUrl: 'https://www.taitres.com',
      adminUrl: 'https://www.taitres.com/dashboard',
    })

    await expect(
      syncUnifiedAdminEntry(request, 'http://127.0.0.1:2323'),
    ).resolves.toEqual({
      status: 'skipped',
      adminUrl: 'https://www.taitres.com/dashboard',
    })
    expect(request).toHaveBeenCalledTimes(1)
  })
})
