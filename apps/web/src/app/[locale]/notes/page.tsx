import type { NoteModel, PaginateResult } from '@mx-space/api-client'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import type { Locale } from '~/i18n/config'
import { apiClient } from '~/lib/request'
import { definePrerenderPage } from '~/lib/request.server'
import { buildNoteHref } from '~/lib/url-builder'

export default definePrerenderPage<{ locale: Locale }>()({
  async fetcher() {
    // v3 list endpoint — returns `{ data: NoteModel[], pagination }` after
    // our `getDataFromResponse` normalises the v3 envelope.
    return await apiClient.note.getList(1, 10, {
      lang: undefined,
    })
  },
  Component: async ({ data, params }) => {
    const list = data as PaginateResult<NoteModel> | undefined
    const notes = list?.data ?? []

    if (!notes.length) {
      notFound()
    }

    const t = await getTranslations({
      namespace: 'note',
      locale: params.locale,
    })

    // Group notes by year for the timeline-style list view.
    const groups = new Map<number, NoteModel[]>()
    for (const note of notes) {
      if (!note.created) continue
      const d = new Date(note.created)
      if (Number.isNaN(d.getTime())) continue
      const year = d.getFullYear()
      const bucket = groups.get(year) ?? []
      bucket.push(note)
      groups.set(year, bucket)
    }

    const sortedYears = Array.from(groups.entries()).sort(([a], [b]) => b - a)

    return (
      <div className="mx-auto mt-12 w-full max-w-3xl space-y-12">
        <header>
          <h1 className="text-3xl font-medium">{t('notes_index_title')}</h1>
          <p className="mt-2 text-sm opacity-70">
            {t('notes_index_total', { count: notes.length })}
          </p>
        </header>

        {sortedYears.map(([year, items]) => (
          <section key={year} className="space-y-4">
            <h2 className="flex items-baseline gap-3 text-2xl font-medium">
              <span>{year}</span>
              <small className="text-base opacity-60">{items.length}</small>
            </h2>
            <ul className="space-y-3">
              {items.map((note) => (
                <li key={note.id} className="flex items-baseline gap-4">
                  <time
                    dateTime={note.created}
                    className="w-24 shrink-0 text-sm tabular-nums opacity-60"
                  >
                    {new Date(note.created!).toLocaleDateString('en-CA', {
                      month: '2-digit',
                      day: '2-digit',
                    })}
                  </time>
                  <a
                    href={buildNoteHref(note)}
                    className="cyber-link--underline min-w-0 truncate"
                  >
                    {note.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    )
  },
})
