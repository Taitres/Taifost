import { apiClient } from '~/lib/request'

import { defineQuery } from '../helper'
import { normalizeNotePayload } from './article-payload'

const LATEST_KEY = 'latest'
export const note = {
  byId: (idOrPath: string, password?: string | null, lang?: string) =>
    defineQuery({
      queryKey: ['note', idOrPath, lang],

      queryFn: async ({ queryKey }) => {
        const [, idOrPath, lang] = queryKey as [
          string,
          string,
          string | undefined,
        ]

        if (idOrPath === LATEST_KEY) {
          return normalizeNotePayload(await apiClient.note.getLatest())
        }

        // The v3 backend exposes note detail at two URLs:
        //   GET /api/v3/notes/nid/:nid                      — legacy numeric id
        //   GET /api/v3/notes/:year/:month/:day/:slug       — canonical date+slug
        // We dispatch based on whether the path looks like a plain nid or
        // the yyyy/m/d/<slug> shape.
        const parsed = parseNotePath(idOrPath)

        const raw = parsed
          ? await apiClient.note.getNoteBySlugDate(
              parsed.year,
              parsed.month,
              parsed.day,
              parsed.slug,
              {
                password: password || undefined,
                lang: lang || undefined,
                prefer: 'lexical',
              },
            )
          : await apiClient.note.getNoteByNid(Number.parseInt(idOrPath, 10), {
              password: password || undefined,
              lang: lang || undefined,
              prefer: 'lexical',
            })

        return normalizeNotePayload(raw)
      },
    }),
}

const NOTE_PATH_RE = /^(\d{1,4})\/(\d{1,2})\/(\d{1,2})\/([^/]+)/

function parseNotePath(
  raw: string,
): { year: number; month: number; day: number; slug: string } | null {
  // `raw` is either `"1"` (legacy nid) or `"2026/6/17/fix-api-v3-..."`.
  const match = NOTE_PATH_RE.exec(raw)
  if (!match) return null
  const [, y, m, d, slug] = match
  return {
    year: Number.parseInt(y, 10),
    month: Number.parseInt(m, 10),
    day: Number.parseInt(d, 10),
    slug: decodeURIComponent(slug),
  }
}
