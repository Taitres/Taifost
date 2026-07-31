export const studioSections = [
  'overview',
  'materials',
  'media',
  'hotspots',
  'projects',
  'ai',
  'ops',
  'settings',
  'core',
] as const

export type StudioSection = (typeof studioSections)[number]

export interface StudioNavigationItem {
  id: StudioSection
  label: string
  description: string
  icon: string
}

export interface StudioNavigationGroup {
  label: string
  items: StudioNavigationItem[]
}

/**
 * The unified information architecture lives here so the shell, overview and
 * deep links share one vocabulary and one ownership boundary.
 */
export const studioNavigationGroups: StudioNavigationGroup[] = [
  {
    label: '内容生产',
    items: [
      { id: 'overview', label: '总览', description: '今日状态', icon: '⌁' },
      {
        id: 'materials',
        label: '素材库',
        description: '冻结与证据',
        icon: '◫',
      },
      {
        id: 'hotspots',
        label: '热点雷达',
        description: '采集与筛选',
        icon: '⌖',
      },
      {
        id: 'projects',
        label: '创作项目',
        description: '修订与发布',
        icon: '✎',
      },
      { id: 'ai', label: '写作角色', description: '职责与预算', icon: '✦' },
    ],
  },
  {
    label: '展示与运营',
    items: [
      {
        id: 'media',
        label: '媒体归档',
        description: 'OpenList 归档',
        icon: '▧',
      },
      {
        id: 'settings',
        label: '外观与导航',
        description: '主题与 SEO',
        icon: '⚙',
      },
    ],
  },
  {
    label: '系统与基础管理',
    items: [
      { id: 'ops', label: '运行保障', description: '流水线健康', icon: '◉' },
      {
        id: 'core',
        label: '基础管理',
        description: 'MX Space 原生能力',
        icon: '▦',
      },
    ],
  },
]

export const studioNavigationItems = studioNavigationGroups.flatMap(
  ({ items }) => items,
)

const studioSectionSet = new Set<string>(studioSections)

export const readStudioSection = (search: string, hash = ''): StudioSection => {
  if (/^#\//.test(hash)) return 'core'
  const section = new URLSearchParams(search).get('section')
  return section && studioSectionSet.has(section)
    ? (section as StudioSection)
    : 'overview'
}

export const studioSectionUrl = (
  section: StudioSection,
  href: string,
): string => {
  const url = new URL(href)
  if (section === 'overview') {
    url.searchParams.delete('section')
  } else {
    url.searchParams.set('section', section)
  }
  return `${url.pathname}${url.search}`
}
