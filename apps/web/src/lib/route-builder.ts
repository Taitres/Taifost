export const enum Routes {
  Home = '//',

  Posts = '/posts',
  Post = '/posts/',

  Notes = '/notes',
  Note = '/notes/',
  NoteTopics = '/notes/series',
  NoteTopic = '/notes/series/',

  Timelime = '/timeline',

  Login = '/login',

  Page = '/',

  Projects = '/projects',
  Project = '/projects/',

  Says = '/says',
  Friends = '/friends',
  Thinking = '/thinking',
  ThinkingItem = '/thinking/',
  Tag = '/posts/tag',

  PageDeletd = '/common/deleted',
}

type Noop = never
type Pagination = {
  size?: number
  page?: number
}

type WithId = {
  id: string | number
}
type HomeParams = Noop
export type PostsParams = Pagination & {
  sortBy?: string
  orderBy?: 'desc' | 'asc'
}

type PostParams = {
  category: string
  slug: string
}
type NotesParams = Noop
type NoteParams = WithId & {
  password?: string
  /**
   * v3 note URL shape: `/notes/<year>/<month>/<day>/<slug>`.
   * When provided, the route builder emits this path verbatim instead of the
   * legacy `/notes/<nid>` form so the v3 backend can resolve the route.
   */
  url?: string
  slug?: string
  created?: string
}
type TimelineParams = {
  type: 'note' | 'post' | 'all'
  selectId?: string
}

type OnlySlug = {
  slug: string
}

type OnlyId = {
  id: string
}

type Tag = { name: string }
export type RouteParams<T extends Routes> = T extends Routes.Home
  ? HomeParams
  : T extends Routes.Note
    ? NoteParams
    : T extends Routes.Notes
      ? NotesParams
      : T extends Routes.Posts
        ? PostsParams
        : T extends Routes.Post
          ? PostParams
          : T extends Routes.Timelime
            ? TimelineParams
            : T extends Routes.NoteTopic
              ? OnlySlug
              : T extends Routes.NoteTopics
                ? Noop
                : T extends Routes.Page
                  ? OnlySlug
                  : T extends Routes.Project
                    ? OnlyId
                    : T extends Routes.Tag
                      ? Tag
                      : T extends Routes.ThinkingItem
                        ? OnlyId
                        : {}

export function routeBuilder<T extends Routes>(
  route: T,
  params: RouteParams<typeof route>,
) {
  let href: string = route
  switch (route) {
    case Routes.Note: {
      const p = params as NoteParams

      // Prefer the explicit v3 `/notes/yyyy/m/d/<slug>` URL when the caller
      // hands us the timestamp and slug of a known note. Falls back to the
      // legacy `/notes/<nid>` route for nid-only consumers.
      let useV3Path = false
      let slug = ''
      let year = ''
      let month = ''
      let day = ''
      if (p.created && p.slug) {
        const d = new Date(p.created)
        if (!Number.isNaN(d.getTime())) {
          useV3Path = true
          slug = p.slug
          year = String(d.getFullYear())
          month = String(d.getMonth() + 1)
          day = String(d.getDate())
        }
      }

      if (useV3Path) {
        href += `${year}/${month}/${day}/${encodeURIComponent(slug)}`
      } else {
        href += p.id
      }

      if (p.password) {
        href += `?password=${p.password}`
      }
      break
    }
    case Routes.Post: {
      const p = params as PostParams
      href += `${p.category}/${p.slug}`
      break
    }
    case Routes.Posts: {
      const p = params as PostsParams
      href += `?${new URLSearchParams(p as any).toString()}`
      break
    }
    case Routes.Timelime: {
      const p = params as TimelineParams
      href += `?${new URLSearchParams(p as any).toString()}`
      break
    }
    case Routes.NoteTopic:
    case Routes.Page: {
      const p = params as OnlySlug
      href += p.slug
      break
    }

    case Routes.Home: {
      href = '/'
      break
    }
    case Routes.Tag: {
      const p = params as Tag
      href += `/${p.name}`
      break
    }
    case Routes.Project: {
      const p = params as OnlyId
      href += p.id
      break
    }
    case Routes.ThinkingItem: {
      const p = params as OnlyId
      href += `${p.id}`
      break
    }
  }
  return href
}
