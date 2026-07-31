import { describe, expect, it } from 'vitest'

import { readStudioSection, studioSectionUrl } from './studio-navigation'

describe('Studio navigation', () => {
  it('accepts only registered section names', () => {
    expect(readStudioSection('?section=projects')).toBe('projects')
    expect(readStudioSection('?section=core')).toBe('core')
    expect(readStudioSection('', '#/posts/edit?id=post-1')).toBe('core')
    expect(readStudioSection('?section=unknown')).toBe('overview')
    expect(readStudioSection('')).toBe('overview')
  })

  it('creates stable deep links without retaining overview noise', () => {
    expect(
      studioSectionUrl('projects', 'https://www.taitres.com/studio?foo=bar'),
    ).toBe('/studio?foo=bar&section=projects')
    expect(
      studioSectionUrl(
        'overview',
        'https://www.taitres.com/studio?foo=bar&section=projects#/posts',
      ),
    ).toBe('/studio?foo=bar')
  })
})
