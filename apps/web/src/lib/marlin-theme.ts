export const marlinThemeIds = ['console', 'reader', 'signal'] as const

export type MarlinThemeId = (typeof marlinThemeIds)[number]

export const MARLIN_THEME_PREVIEW_COOKIE = 'marlin_theme_preview'
export const MARLIN_THEME_PREVIEW_TOKEN_COOKIE = 'marlin_theme_preview_token'

export const marlinThemes: Array<{
  id: MarlinThemeId
  name: string
  description: string
  accent: string
}> = [
  {
    id: 'console',
    name: 'Console',
    description: '精确、克制的终端工作台，适合技术文章与项目记录。',
    accent: '#39c5bb',
  },
  {
    id: 'reader',
    name: 'Reader',
    description: '温暖、安静的纸张阅读体验，突出正文和长篇内容。',
    accent: '#b45309',
  },
  {
    id: 'signal',
    name: 'Signal',
    description: '高对比编辑部风格，以醒目的网格和信号色强调动态。',
    accent: '#f5ff00',
  },
]

export const isMarlinThemeId = (value: unknown): value is MarlinThemeId =>
  typeof value === 'string' && marlinThemeIds.includes(value as MarlinThemeId)

export const resolveMarlinTheme = (value: unknown): MarlinThemeId =>
  isMarlinThemeId(value) ? value : 'console'
