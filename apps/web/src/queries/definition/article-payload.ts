export interface ArticleCount {
  read: number
  like: number
}

export function withStableArticleCount<T extends Record<string, any>>(
  article: T,
): T & { count: ArticleCount } {
  return {
    ...article,
    count: {
      read: article.count?.read ?? 0,
      like: article.count?.like ?? 0,
    },
  }
}

/** Normalizes both bare Core v3 notes and legacy wrapped note payloads. */
export function normalizeNotePayload(raw: any): any {
  if (!raw || typeof raw !== 'object') return { data: raw ?? null }
  if (raw.data && typeof raw.data === 'object' && raw.data.id !== undefined) {
    return { ...raw, data: withStableArticleCount(raw.data) }
  }
  const { next, prev, ...noteModel } = raw as Record<string, any>
  return {
    data: withStableArticleCount(noteModel),
    next: next ?? null,
    prev: prev ?? null,
  }
}
