'use client'

import { useEffect, useState } from 'react'

import {
  type MarlinThemeId,
  marlinThemes,
  resolveMarlinTheme,
} from '~/lib/marlin-theme'
import { DEFAULT_SITE_TIMEZONE, isValidTimeZone } from '~/lib/site-timezone'
import { studioJson, studioRequest } from '~/lib/studio-api'

import {
  StudioButton,
  StudioCard,
  StudioEmpty,
  StudioInput,
  StudioLabel,
  StudioTextArea,
} from './primitives'

interface ThemeSnippet {
  raw: string
}

interface SeoConfig {
  title?: string
  description?: string
  keywords?: string[]
}

interface StoredThemeConfig {
  config?: {
    presentation?: {
      theme?: MarlinThemeId
      timezone?: string
      navigation?: PresentationNavigationItem[]
    }
    [key: string]: unknown
  }
  footer?: {
    link_sections?: LinkSection[]
    linkSections?: LinkSection[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

const recommendedNavigation: PresentationNavigationItem[] = [
  { name: '首页', href: '/' },
  { name: '文稿', href: '/posts' },
  { name: '手记', href: '/notes' },
  { name: '时光', href: '/timeline' },
  { name: '思考', href: '/thinking' },
  { name: '项目', href: '/projects' },
]

const emptyFooterSection = (): LinkSection => ({
  name: '新分组',
  links: [{ name: '新链接', href: '/' }],
})

export function SettingsSection({
  authToken,
  notify,
  reload,
}: {
  authToken?: string
  notify: (message: string, error?: boolean) => void
  reload: () => Promise<void>
}) {
  const [theme, setTheme] = useState<MarlinThemeId>('console')
  const [timezone, setTimezone] = useState(DEFAULT_SITE_TIMEZONE)
  const [navigation, setNavigation] = useState<PresentationNavigationItem[]>([])
  const [footerSections, setFooterSections] = useState<LinkSection[]>([])
  const [seo, setSeo] = useState({
    title: '',
    description: '',
    keywords: '',
  })
  const [storedConfig, setStoredConfig] = useState<StoredThemeConfig | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    Promise.all([
      studioRequest<ThemeSnippet | null>(
        '/snippets/by-path?path=theme%2Fshiro',
      ),
      studioRequest<SeoConfig>('/options/seo'),
    ])
      .then(([snippet, seoConfig]) => {
        setSeo({
          title: seoConfig.title || '',
          description: seoConfig.description || '',
          keywords: seoConfig.keywords?.join(', ') || '',
        })
        if (!snippet?.raw) {
          setStoredConfig({})
          return
        }
        const parsed = JSON.parse(snippet.raw) as StoredThemeConfig
        setStoredConfig(parsed)
        setTheme(resolveMarlinTheme(parsed.config?.presentation?.theme))
        setTimezone(
          parsed.config?.presentation?.timezone || DEFAULT_SITE_TIMEZONE,
        )
        setNavigation(parsed.config?.presentation?.navigation ?? [])
        setFooterSections(
          parsed.footer?.link_sections ?? parsed.footer?.linkSections ?? [],
        )
      })
      .catch((error) => {
        notify(
          error instanceof Error ? error.message : '站点设置加载失败',
          true,
        )
      })
      .finally(() => setLoading(false))
  }, [notify])

  const preview = async (nextTheme: MarlinThemeId) => {
    if (!authToken) {
      notify('为保证预览仅站长可见，请退出后重新登录工作室', true)
      return
    }
    const previewWindow = window.open('about:blank', 'marlin-theme-preview')
    const response = await fetch('/api/theme-preview', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${authToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ theme: nextTheme }),
    })
    if (!response.ok) {
      previewWindow?.close()
      notify('临时预览授权失败，请重新登录工作室', true)
      return
    }
    if (previewWindow) previewWindow.location.href = '/'
    notify(`已打开 ${nextTheme} 临时预览，30 分钟后失效`)
  }

  const save = async () => {
    setPending(true)
    try {
      if (!isValidTimeZone(timezone)) {
        throw new Error(`无效的 IANA 时区：${timezone}`)
      }
      if (navigation.some(({ name, href }) => !name.trim() || !href.trim())) {
        throw new Error('顶部导航的名称和地址不能为空')
      }
      if (
        footerSections.some(
          (section) =>
            !section.name.trim() ||
            section.links.some(
              ({ name, href }) => !name.trim() || !href.trim(),
            ),
        )
      ) {
        throw new Error('页脚分组、链接名称和地址不能为空')
      }

      const current = storedConfig ?? {}
      const footerKey =
        current.footer && 'link_sections' in current.footer
          ? 'link_sections'
          : 'linkSections'
      const next: StoredThemeConfig = {
        ...current,
        config: {
          ...current.config,
          presentation: {
            ...current.config?.presentation,
            theme,
            timezone,
            navigation,
          },
        },
        footer: {
          ...current.footer,
          [footerKey]: footerSections,
        },
      }
      await Promise.all([
        studioRequest('/snippets/by-path', {
          method: 'PUT',
          headers: { 'idempotency-key': crypto.randomUUID() },
          body: studioJson({
            path: 'theme/shiro',
            type: 'json',
            private: false,
            method: 'GET',
            enable: true,
            comment: 'Shiro public theme and site presentation settings',
            raw: JSON.stringify(next, null, 2),
          }),
        }),
        studioRequest('/options/seo', {
          method: 'PATCH',
          body: studioJson({
            title: seo.title.trim(),
            description: seo.description.trim(),
            keywords: seo.keywords
              .split(/[,，\n]/)
              .map((value) => value.trim())
              .filter(Boolean),
          }),
        }),
      ])
      await fetch('/api/theme-preview', { method: 'DELETE' })
      setStoredConfig(next)
      await reload()
      notify('站点设置已发布，聚合缓存正在刷新')
    } catch (error) {
      notify(error instanceof Error ? error.message : '站点设置保存失败', true)
    } finally {
      setPending(false)
    }
  }

  const updateNavigation = (
    index: number,
    patch: Partial<PresentationNavigationItem>,
  ) =>
    setNavigation((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    )

  const updateFooterSection = (index: number, patch: Partial<LinkSection>) =>
    setFooterSections((sections) =>
      sections.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, ...patch } : section,
      ),
    )

  const updateFooterLink = (
    sectionIndex: number,
    linkIndex: number,
    patch: Partial<LinkSection['links'][number]>,
  ) =>
    setFooterSections((sections) =>
      sections.map((section, currentSectionIndex) =>
        currentSectionIndex === sectionIndex
          ? {
              ...section,
              links: section.links.map((link, currentLinkIndex) =>
                currentLinkIndex === linkIndex ? { ...link, ...patch } : link,
              ),
            }
          : section,
      ),
    )

  if (loading) {
    return <StudioEmpty>正在读取 theme/shiro 配置…</StudioEmpty>
  }

  return (
    <div className="grid gap-6">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
          SITE PRESENTATION
        </p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">站点设置</h2>
        <p className="mt-2 text-sm leading-7 text-zinc-500 dark:text-zinc-400">
          主题与明暗模式相互独立。临时预览仅对已登录的站长生效，不会影响访客；
          发布后 Core 会清理聚合缓存并把选择同步到所有公开页面。
        </p>
      </div>

      <StudioCard>
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            IDENTITY & TIME
          </p>
          <h3 className="font-semibold">站点信息与时区</h3>
          <p className="mt-1 text-sm text-zinc-500">
            时间以 UTC 持久化；后台的定时发布输入按此 IANA 时区解释。
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <StudioLabel label="站点标题">
            <StudioInput
              value={seo.title}
              onChange={(event) =>
                setSeo({ ...seo, title: event.target.value })
              }
              required
            />
          </StudioLabel>
          <StudioLabel label="站点时区" hint="IANA">
            <StudioInput
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder={DEFAULT_SITE_TIMEZONE}
              required
            />
          </StudioLabel>
          <StudioLabel label="站点描述">
            <StudioTextArea
              className="min-h-24"
              value={seo.description}
              onChange={(event) =>
                setSeo({ ...seo, description: event.target.value })
              }
              required
            />
          </StudioLabel>
          <StudioLabel label="SEO 关键词" hint="逗号或换行分隔">
            <StudioTextArea
              className="min-h-24"
              value={seo.keywords}
              onChange={(event) =>
                setSeo({ ...seo, keywords: event.target.value })
              }
            />
          </StudioLabel>
        </div>
      </StudioCard>

      <StudioCard>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              HEADER NAVIGATION
            </p>
            <h3 className="font-semibold">顶部导航</h3>
            <p className="mt-1 text-sm text-zinc-500">
              一层有序链接；留空时沿用 Shiro 默认导航。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {navigation.length === 0 && (
              <StudioButton
                tone="ghost"
                onClick={() =>
                  setNavigation(
                    recommendedNavigation.map((item) => ({ ...item })),
                  )
                }
              >
                载入推荐导航
              </StudioButton>
            )}
            <StudioButton
              tone="secondary"
              onClick={() =>
                setNavigation((items) => [
                  ...items,
                  { name: '新链接', href: '/', enabled: true },
                ])
              }
            >
              添加链接
            </StudioButton>
          </div>
        </div>
        <div className="grid gap-3">
          {navigation.length === 0 ? (
            <StudioEmpty>当前使用 Shiro 默认顶部导航。</StudioEmpty>
          ) : (
            navigation.map((item, index) => (
              <div
                // Rows have no persisted identity; controlled inputs keep
                // index keys safe while allowing names/URLs to be edited.
                // eslint-disable-next-line @eslint-react/no-array-index-key
                key={index}
                className="grid gap-2 rounded-xl border border-zinc-100 p-3 dark:border-zinc-800 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto]"
              >
                <StudioInput
                  aria-label={`导航 ${index + 1} 名称`}
                  value={item.name}
                  onChange={(event) =>
                    updateNavigation(index, { name: event.target.value })
                  }
                />
                <StudioInput
                  aria-label={`导航 ${index + 1} 地址`}
                  value={item.href}
                  onChange={(event) =>
                    updateNavigation(index, {
                      href: event.target.value,
                      external: /^https?:\/\//.test(event.target.value),
                    })
                  }
                />
                <div className="flex gap-1">
                  <StudioButton
                    tone="ghost"
                    aria-label={`上移导航 ${index + 1}`}
                    disabled={index === 0}
                    onClick={() =>
                      setNavigation((items) => {
                        const next = [...items]
                        ;[next[index - 1], next[index]] = [
                          next[index],
                          next[index - 1],
                        ]
                        return next
                      })
                    }
                  >
                    ↑
                  </StudioButton>
                  <StudioButton
                    tone="ghost"
                    aria-label={`下移导航 ${index + 1}`}
                    disabled={index === navigation.length - 1}
                    onClick={() =>
                      setNavigation((items) => {
                        const next = [...items]
                        ;[next[index], next[index + 1]] = [
                          next[index + 1],
                          next[index],
                        ]
                        return next
                      })
                    }
                  >
                    ↓
                  </StudioButton>
                  <StudioButton
                    tone="ghost"
                    aria-label={`删除导航 ${index + 1}`}
                    onClick={() =>
                      setNavigation((items) =>
                        items.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    删除
                  </StudioButton>
                </div>
              </div>
            ))
          )}
        </div>
      </StudioCard>

      <StudioCard>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              FOOTER NAVIGATION
            </p>
            <h3 className="font-semibold">页脚导航</h3>
            <p className="mt-1 text-sm text-zinc-500">
              分组管理站内页面、分类、文章和外部链接。
            </p>
          </div>
          <StudioButton
            tone="secondary"
            onClick={() =>
              setFooterSections((sections) => [
                ...sections,
                emptyFooterSection(),
              ])
            }
          >
            添加分组
          </StudioButton>
        </div>
        <div className="grid gap-4">
          {footerSections.length === 0 ? (
            <StudioEmpty>还没有页脚导航分组。</StudioEmpty>
          ) : (
            footerSections.map((section, sectionIndex) => (
              <div
                // eslint-disable-next-line @eslint-react/no-array-index-key
                key={sectionIndex}
                className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800"
              >
                <div className="mb-3 flex gap-2">
                  <StudioInput
                    aria-label={`页脚分组 ${sectionIndex + 1} 名称`}
                    value={section.name}
                    onChange={(event) =>
                      updateFooterSection(sectionIndex, {
                        name: event.target.value,
                      })
                    }
                  />
                  <StudioButton
                    tone="ghost"
                    onClick={() =>
                      setFooterSections((sections) =>
                        sections.filter(
                          (_, currentIndex) => currentIndex !== sectionIndex,
                        ),
                      )
                    }
                  >
                    删除分组
                  </StudioButton>
                </div>
                <div className="grid gap-2">
                  {section.links.map((link, linkIndex) => (
                    <div
                      // eslint-disable-next-line @eslint-react/no-array-index-key
                      key={linkIndex}
                      className="grid gap-2 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)_auto]"
                    >
                      <StudioInput
                        aria-label={`页脚链接 ${sectionIndex + 1}-${linkIndex + 1} 名称`}
                        value={link.name}
                        onChange={(event) =>
                          updateFooterLink(sectionIndex, linkIndex, {
                            name: event.target.value,
                          })
                        }
                      />
                      <StudioInput
                        aria-label={`页脚链接 ${sectionIndex + 1}-${linkIndex + 1} 地址`}
                        value={link.href}
                        onChange={(event) =>
                          updateFooterLink(sectionIndex, linkIndex, {
                            href: event.target.value,
                            external: /^https?:\/\//.test(event.target.value),
                          })
                        }
                      />
                      <StudioButton
                        tone="ghost"
                        onClick={() =>
                          updateFooterSection(sectionIndex, {
                            links: section.links.filter(
                              (_, currentIndex) => currentIndex !== linkIndex,
                            ),
                          })
                        }
                      >
                        删除
                      </StudioButton>
                    </div>
                  ))}
                  <StudioButton
                    tone="ghost"
                    className="justify-self-start"
                    onClick={() =>
                      updateFooterSection(sectionIndex, {
                        links: [
                          ...section.links,
                          { name: '新链接', href: '/' },
                        ],
                      })
                    }
                  >
                    添加组内链接
                  </StudioButton>
                </div>
              </div>
            ))
          )}
        </div>
      </StudioCard>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
          PUBLIC THEME
        </p>
        <h3 className="font-semibold">公开主题</h3>
      </div>

      <div
        className="grid gap-4 lg:grid-cols-3"
        role="radiogroup"
        aria-label="公开站点主题"
      >
        {marlinThemes.map((item) => {
          const selected = theme === item.id
          return (
            <StudioCard
              key={item.id}
              className={`relative overflow-hidden p-0 transition ${
                selected
                  ? 'border-zinc-950 ring-2 ring-zinc-950 dark:border-white dark:ring-white'
                  : ''
              }`}
            >
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                className="w-full p-5 text-left"
                onClick={() => setTheme(item.id)}
              >
                <span
                  className="mb-5 block h-24 rounded-xl border border-black/10"
                  style={{
                    background:
                      item.id === 'reader'
                        ? 'linear-gradient(135deg, #f6f0e4 0 66%, #9a3412 66%)'
                        : item.id === 'signal'
                          ? 'linear-gradient(90deg, #f5ff00 0 50%, #3157ff 50%)'
                          : 'linear-gradient(135deg, #0f172a 0 34%, #39c5bb 34% 38%, #f8fafc 38%)',
                  }}
                />
                <span className="flex items-center justify-between gap-3">
                  <span className="text-xl font-black">{item.name}</span>
                  <span
                    className="size-3 rounded-full"
                    style={{ background: item.accent }}
                  />
                </span>
                <span className="mt-2 block text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  {item.description}
                </span>
              </button>
              <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
                <StudioButton
                  tone="ghost"
                  className="w-full"
                  disabled={!authToken}
                  onClick={() => void preview(item.id)}
                >
                  {authToken ? '站长临时预览' : '重新登录后可预览'}
                </StudioButton>
              </div>
            </StudioCard>
          )
        })}
      </div>

      <StudioCard className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-semibold">
            当前准备发布：{theme} · {timezone}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            保存会合并主题、导航、页脚和 SEO，不覆盖其他 Shiro 配置。
          </p>
        </div>
        <StudioButton disabled={pending} onClick={() => void save()}>
          {pending ? '正在发布…' : '发布全部站点设置'}
        </StudioButton>
      </StudioCard>
    </div>
  )
}
