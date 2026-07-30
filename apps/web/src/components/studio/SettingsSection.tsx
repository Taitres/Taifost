'use client'

import { useEffect, useState } from 'react'

import {
  type MarlinThemeId,
  marlinThemes,
  resolveMarlinTheme,
} from '~/lib/marlin-theme'
import { studioJson, studioRequest } from '~/lib/studio-api'

import { StudioButton, StudioCard, StudioEmpty } from './primitives'

interface ThemeSnippet {
  raw: string
}

interface StoredThemeConfig {
  config?: {
    presentation?: {
      theme?: MarlinThemeId
    }
    [key: string]: unknown
  }
  [key: string]: unknown
}

export function SettingsSection({
  authToken,
  notify,
}: {
  authToken?: string
  notify: (message: string, error?: boolean) => void
}) {
  const [theme, setTheme] = useState<MarlinThemeId>('console')
  const [storedConfig, setStoredConfig] = useState<StoredThemeConfig | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    studioRequest<ThemeSnippet | null>('/snippets/by-path?path=theme%2Fshiro')
      .then((snippet) => {
        if (!snippet?.raw) {
          setStoredConfig({})
          return
        }
        const parsed = JSON.parse(snippet.raw) as StoredThemeConfig
        setStoredConfig(parsed)
        setTheme(resolveMarlinTheme(parsed.config?.presentation?.theme))
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
      const current = storedConfig ?? {}
      const next: StoredThemeConfig = {
        ...current,
        config: {
          ...current.config,
          presentation: {
            ...current.config?.presentation,
            theme,
          },
        },
      }
      await studioRequest('/snippets/by-path', {
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
      })
      await fetch('/api/theme-preview', { method: 'DELETE' })
      setStoredConfig(next)
      notify(`已发布 ${theme} 主题，聚合缓存正在刷新`)
    } catch (error) {
      notify(error instanceof Error ? error.message : '主题保存失败', true)
    } finally {
      setPending(false)
    }
  }

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
          <p className="font-semibold">当前准备发布：{theme}</p>
          <p className="mt-1 text-sm text-zinc-500">
            保存时只合并 presentation.theme，不会覆盖现有主题配置。
          </p>
        </div>
        <StudioButton disabled={pending} onClick={() => void save()}>
          {pending ? '正在发布…' : '发布为全站主题'}
        </StudioButton>
      </StudioCard>
    </div>
  )
}
