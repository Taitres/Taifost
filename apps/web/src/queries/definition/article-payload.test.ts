import { describe, expect, it } from 'vitest'

import { normalizeNotePayload, withStableArticleCount } from './article-payload'

describe('Core v3 article payload normalization', () => {
  it('adds stable counters when Core omits the count aggregate', () => {
    expect(withStableArticleCount({ id: 'post-1', title: 'Post' })).toEqual({
      id: 'post-1',
      title: 'Post',
      count: { read: 0, like: 0 },
    })
  })

  it('wraps a bare v3 note while preserving adjacent notes', () => {
    expect(
      normalizeNotePayload({
        id: 'note-1',
        nid: 1,
        count: { read: 9 },
        next: { nid: 2 },
      }),
    ).toEqual({
      data: {
        id: 'note-1',
        nid: 1,
        count: { read: 9, like: 0 },
      },
      next: { nid: 2 },
      prev: null,
    })
  })

  it('normalizes an already wrapped note without losing metadata', () => {
    expect(
      normalizeNotePayload({
        data: { id: 'note-1', count: undefined },
        meta: { liked: false },
      }),
    ).toEqual({
      data: { id: 'note-1', count: { read: 0, like: 0 } },
      meta: { liked: false },
    })
  })
})
