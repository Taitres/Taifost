import { DEFAULT_SITE_TIMEZONE } from '~/lib/site-timezone'
import { StudioApiError } from '~/lib/studio-api'

import type {
  AiRole,
  Category,
  CorePage,
  HotspotCandidate,
  HotspotSource,
  HotspotTheme,
  Material,
  MediaAsset,
  Project,
} from './types'

export interface StudioData {
  materials: Material[]
  media: MediaAsset[]
  projects: Project[]
  themes: HotspotTheme[]
  sources: HotspotSource[]
  candidates: HotspotCandidate[]
  roles: AiRole[]
  categories: Category[]
  pages: CorePage[]
  siteTimezone: string
}

export type StudioDataKey =
  | 'materials'
  | 'media'
  | 'projects'
  | 'themes'
  | 'sources'
  | 'candidates'
  | 'roles'
  | 'categories'
  | 'pages'
  | 'siteTimezone'

export interface StudioLoadFailure {
  key: StudioDataKey
  label: string
  message: string
}

export interface StudioSnapshot {
  data: StudioData
  failures: StudioLoadFailure[]
}

export type StudioRequestAdapter = (path: string) => Promise<unknown>

export const emptyStudioData: StudioData = {
  materials: [],
  media: [],
  projects: [],
  themes: [],
  sources: [],
  candidates: [],
  roles: [],
  categories: [],
  pages: [],
  siteTimezone: DEFAULT_SITE_TIMEZONE,
}

const modules: Array<{
  key: StudioDataKey
  label: string
  path: string
}> = [
  {
    key: 'materials',
    label: '素材库',
    path: '/marlin/materials?page=1&size=100',
  },
  { key: 'media', label: '媒体库', path: '/marlin/materials/media' },
  {
    key: 'projects',
    label: '创作项目',
    path: '/marlin/projects?page=1&size=100',
  },
  { key: 'themes', label: '热点主题', path: '/marlin/hotspots/themes' },
  { key: 'sources', label: '热点来源', path: '/marlin/hotspots/sources' },
  {
    key: 'candidates',
    label: '热点候选',
    path: '/marlin/hotspots/candidates?page=1&size=100',
  },
  { key: 'roles', label: 'AI 角色', path: '/marlin/ai/roles' },
  {
    key: 'categories',
    label: '文章分类',
    path: '/categories?page=1&size=100',
  },
  { key: 'pages', label: '独立页面', path: '/pages?page=1&size=100' },
  {
    key: 'siteTimezone',
    label: '站点时区',
    path: '/snippets/by-path?path=theme%2Fshiro',
  },
]

const reasonMessage = (reason: unknown) =>
  reason instanceof Error ? reason.message : 'Core 请求失败'

const readTimezone = (value: unknown) => {
  if (!value || typeof value !== 'object' || !('raw' in value)) {
    return DEFAULT_SITE_TIMEZONE
  }
  const { raw } = value
  if (typeof raw !== 'string' || !raw) return DEFAULT_SITE_TIMEZONE

  const parsed = JSON.parse(raw) as {
    config?: { presentation?: { timezone?: string } }
  }
  return parsed.config?.presentation?.timezone || DEFAULT_SITE_TIMEZONE
}

const readList = <T>(value: unknown): T[] => {
  if (!Array.isArray(value)) {
    throw new TypeError('Core 返回了无效的列表数据')
  }
  return value as T[]
}

const assignModuleValue = (
  data: StudioData,
  key: StudioDataKey,
  value: unknown,
) => {
  switch (key) {
    case 'materials':
      data.materials = readList<Material>(value)
      break
    case 'media':
      data.media = readList<MediaAsset>(value)
      break
    case 'projects':
      data.projects = readList<Project>(value)
      break
    case 'themes':
      data.themes = readList<HotspotTheme>(value)
      break
    case 'sources':
      data.sources = readList<HotspotSource>(value)
      break
    case 'candidates':
      data.candidates = readList<HotspotCandidate>(value)
      break
    case 'roles':
      data.roles = readList<AiRole>(value)
      break
    case 'categories':
      data.categories = readList<Category>(value)
      break
    case 'pages':
      data.pages = readList<CorePage>(value)
      break
    case 'siteTimezone':
      data.siteTimezone = readTimezone(value)
      break
  }
}

/**
 * Loads the owner-facing Studio snapshot without coupling unrelated modules.
 * A failed Core module keeps its last known value while successful modules
 * continue to update. Authentication expiry remains a hard failure.
 */
export async function loadStudioSnapshot(
  request: StudioRequestAdapter,
  previous: StudioData,
): Promise<StudioSnapshot> {
  const results = await Promise.allSettled(
    modules.map(({ path }) => request(path)),
  )
  const expiredSession = results.find(
    (result) =>
      result.status === 'rejected' &&
      result.reason instanceof StudioApiError &&
      result.reason.status === 401,
  )
  if (expiredSession?.status === 'rejected') {
    throw expiredSession.reason
  }

  const data: StudioData = { ...previous }
  const failures: StudioLoadFailure[] = []

  results.forEach((result, index) => {
    const module = modules[index]
    if (!module) return

    if (result.status === 'rejected') {
      failures.push({
        key: module.key,
        label: module.label,
        message: reasonMessage(result.reason),
      })
      return
    }

    try {
      assignModuleValue(data, module.key, result.value)
    } catch (error) {
      failures.push({
        key: module.key,
        label: module.label,
        message: reasonMessage(error),
      })
    }
  })

  return { data, failures }
}
