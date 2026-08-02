export const studioSections = [
  'overview',
  'materials',
  'media',
  'hotspots',
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
    label: '写作',
    items: [
      {
        id: 'overview',
        label: '开始创作',
        description: '粘贴即可成稿',
        icon: '⌁',
      },
      {
        id: 'hotspots',
        label: '热点灵感',
        description: '发现可写主题',
        icon: '⌖',
      },
    ],
  },
  {
    label: '内容记录',
    items: [
      {
        id: 'materials',
        label: '素材记录',
        description: '来源与分析',
        icon: '◫',
      },
      {
        id: 'media',
        label: '媒体归档',
        description: '自动保存的图片',
        icon: '▧',
      },
    ],
  },
  {
    label: '站点',
    items: [
      {
        id: 'settings',
        label: '外观与导航',
        description: '主题与 SEO',
        icon: '⚙',
      },
    ],
  },
  {
    label: '系统',
    items: [
      {
        id: 'ai',
        label: 'AI 配置中心',
        description: '统一模型与流水线',
        icon: '✦',
      },
      { id: 'ops', label: '运行保障', description: '服务健康', icon: '◉' },
      {
        id: 'core',
        label: '内容与站点',
        description: 'MX Space 唯一编辑后台',
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
