import type {
  CategoryModel,
  NoteModel,
  PageModel,
  PostModel,
} from '@mx-space/api-client'

import { isDev } from '~/lib/env'
import { getAggregationData } from '~/providers/root/aggregation-data-provider'

export function urlBuilder(path = '') {
  if (isDev) return new URL(path, 'http://localhost:2323')
  return new URL(path, getAggregationData()?.url.webUrl)
}

export function isPostModel(model: any): model is PostModel {
  return (
    isDefined(model.title) && isDefined(model.slug) && !isDefined(model.order)
  )
}

export function isPageModel(model: any): model is PageModel {
  return (
    isDefined(model.title) && isDefined(model.slug) && isDefined(model.order)
  )
}

export function isNoteModel(model: any): model is NoteModel {
  return isDefined(model.title) && isDefined(model.nid)
}

/**
 * Build the canonical v3 note URL `/notes/yyyy/m/d/<slug>` from a NoteModel.
 *
 * The v3 backend exposes note detail at `/notes/:year/:month/:day/:slug` and
 * the rest of the codebase links to notes by this pattern (e.g. RSS, JSON-LD,
 * navigation). Falls back to the legacy `/notes/<nid>` form when the note has
 * no `created` timestamp (which would only happen for hand-crafted fixtures).
 */
export function buildNoteHref(
  note: Pick<NoteModel, 'nid' | 'slug' | 'created'>,
) {
  if (note.created) {
    const d = new Date(note.created)
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      const day = d.getDate()
      if (note.slug) {
        return `/notes/${y}/${m}/${day}/${encodeURIComponent(note.slug)}`
      }
    }
  }
  return `/notes/${note.nid}`
}

function buildUrl(model: PostModel | NoteModel | PageModel) {
  if (isPostModel(model)) {
    // TODO
    if (!model.category) {
      console.error('PostModel.category is missing!!!!!')
      return '#'
    }
    return `/posts/${
      (model.category as CategoryModel).slug
    }/${encodeURIComponent(model.slug)}`
  } else if (isPageModel(model)) {
    return `/${model.slug}`
  } else if (isNoteModel(model)) {
    return buildNoteHref(model)
  }

  return '/'
}

function isDefined(data: any) {
  return data !== undefined && data !== null
}

urlBuilder.build = buildUrl
