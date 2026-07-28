'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

import { studioJson, studioRequest } from '~/lib/studio-api'

import {
  StatusPill,
  StudioButton,
  StudioCard,
  StudioEmpty,
  StudioInput,
  StudioLabel,
  StudioSelect,
} from './primitives'
import type { HotspotCandidate, HotspotSource, HotspotTheme } from './types'

export function HotspotsSection({
  themes,
  sources,
  candidates,
  reload,
  notify,
}: {
  themes: HotspotTheme[]
  sources: HotspotSource[]
  candidates: HotspotCandidate[]
  reload: () => Promise<void>
  notify: (message: string, error?: boolean) => void
}) {
  const [themeName, setThemeName] = useState('')
  const [keywords, setKeywords] = useState('')
  const [sourceForm, setSourceForm] = useState({
    name: '',
    url: '',
    format: 'rss',
    themeId: '',
    itemsPath: '',
  })
  const [collecting, setCollecting] = useState('')

  const createTheme = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await studioRequest('/marlin/hotspots/themes', {
        method: 'POST',
        body: studioJson({
          name: themeName,
          keywords: keywords
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          daily_quota: 20,
        }),
      })
      setThemeName('')
      setKeywords('')
      notify('热点主题已创建')
      await reload()
    } catch (error) {
      notify(error instanceof Error ? error.message : '创建失败', true)
    }
  }

  const createSource = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await studioRequest('/marlin/hotspots/sources', {
        method: 'POST',
        body: studioJson({
          name: sourceForm.name,
          url: sourceForm.url,
          format: sourceForm.format,
          theme_id: sourceForm.themeId || undefined,
          daily_quota: 20,
          config:
            sourceForm.format === 'json' && sourceForm.itemsPath
              ? { itemsPath: sourceForm.itemsPath }
              : {},
        }),
      })
      setSourceForm({
        name: '',
        url: '',
        format: 'rss',
        themeId: '',
        itemsPath: '',
      })
      notify('热点源已创建')
      await reload()
    } catch (error) {
      notify(error instanceof Error ? error.message : '创建失败', true)
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm text-zinc-500">每日配额 · 事件去重 · 人工筛选</p>
        <h2 className="text-2xl font-bold tracking-tight">热点雷达</h2>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <StudioCard>
          <h3 className="mb-4 font-semibold">新建主题</h3>
          <form className="grid gap-3" onSubmit={createTheme}>
            <StudioLabel label="主题名称">
              <StudioInput
                value={themeName}
                onChange={(event) => setThemeName(event.target.value)}
                placeholder="例如：AI 工程"
                required
              />
            </StudioLabel>
            <StudioLabel label="关键词" hint="用英文逗号分隔">
              <StudioInput
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
                placeholder="LLM, Agent, 开源"
              />
            </StudioLabel>
            <StudioButton>创建主题</StudioButton>
          </form>
        </StudioCard>

        <StudioCard>
          <h3 className="mb-4 font-semibold">添加采集源</h3>
          <form className="grid gap-3" onSubmit={createSource}>
            <div className="grid grid-cols-2 gap-3">
              <StudioLabel label="名称">
                <StudioInput
                  value={sourceForm.name}
                  onChange={(event) =>
                    setSourceForm({ ...sourceForm, name: event.target.value })
                  }
                  required
                />
              </StudioLabel>
              <StudioLabel label="格式">
                <StudioSelect
                  value={sourceForm.format}
                  onChange={(event) =>
                    setSourceForm({ ...sourceForm, format: event.target.value })
                  }
                >
                  <option value="rss">RSS</option>
                  <option value="atom">Atom</option>
                  <option value="json">JSON</option>
                </StudioSelect>
              </StudioLabel>
            </div>
            <StudioLabel label="地址">
              <StudioInput
                type="url"
                value={sourceForm.url}
                onChange={(event) =>
                  setSourceForm({ ...sourceForm, url: event.target.value })
                }
                placeholder="https://example.com/feed.xml"
                required
              />
            </StudioLabel>
            <div className="grid grid-cols-2 gap-3">
              <StudioLabel label="归属主题">
                <StudioSelect
                  value={sourceForm.themeId}
                  onChange={(event) =>
                    setSourceForm({
                      ...sourceForm,
                      themeId: event.target.value,
                    })
                  }
                >
                  <option value="">不指定</option>
                  {themes.map((theme) => (
                    <option value={theme.id} key={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </StudioSelect>
              </StudioLabel>
              {sourceForm.format === 'json' && (
                <StudioLabel label="列表路径" hint="可选">
                  <StudioInput
                    value={sourceForm.itemsPath}
                    onChange={(event) =>
                      setSourceForm({
                        ...sourceForm,
                        itemsPath: event.target.value,
                      })
                    }
                    placeholder="data.items"
                  />
                </StudioLabel>
              )}
            </div>
            <StudioButton>保存采集源</StudioButton>
          </form>
        </StudioCard>
      </div>

      <section className="grid gap-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              SOURCES
            </p>
            <h3 className="font-semibold">采集源</h3>
          </div>
          <StudioButton
            tone="secondary"
            onClick={async () => {
              try {
                setCollecting('all')
                await studioRequest('/marlin/hotspots/collect', {
                  method: 'POST',
                })
                notify('全部热点源采集完成')
                await reload()
              } catch (error) {
                notify(
                  error instanceof Error ? error.message : '采集失败',
                  true,
                )
              } finally {
                setCollecting('')
              }
            }}
            disabled={collecting === 'all'}
          >
            {collecting === 'all' ? '采集中…' : '采集全部'}
          </StudioButton>
        </div>
        {sources.length === 0 ? (
          <StudioEmpty>还没有采集源。</StudioEmpty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sources.map((source) => (
              <StudioCard key={source.id} className="grid gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="truncate font-semibold">{source.name}</h4>
                    <span className="rounded bg-zinc-100 px-2 py-1 font-mono text-[10px] uppercase dark:bg-zinc-800">
                      {source.format}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-zinc-400">
                    {source.url}
                  </p>
                </div>
                {source.last_error && (
                  <p className="line-clamp-2 text-xs text-red-500">
                    {source.last_error}
                  </p>
                )}
                <StudioButton
                  tone="secondary"
                  disabled={collecting === source.id}
                  onClick={async () => {
                    setCollecting(source.id)
                    try {
                      const result = await studioRequest<{
                        accepted: number
                        deduplicated: number
                      }>(`/marlin/hotspots/sources/${source.id}/collect`, {
                        method: 'POST',
                      })
                      notify(
                        `收录 ${result.accepted} 条，去重 ${result.deduplicated} 条`,
                      )
                      await reload()
                    } catch (error) {
                      notify(
                        error instanceof Error ? error.message : '采集失败',
                        true,
                      )
                    } finally {
                      setCollecting('')
                    }
                  }}
                >
                  {collecting === source.id ? '采集中…' : '立即采集'}
                </StudioButton>
              </StudioCard>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            CANDIDATES
          </p>
          <h3 className="font-semibold">候选热点</h3>
        </div>
        {candidates.length === 0 ? (
          <StudioEmpty>采集后，候选热点会出现在这里。</StudioEmpty>
        ) : (
          candidates.map((candidate) => (
            <StudioCard
              key={candidate.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold">{candidate.title}</h4>
                  <StatusPill value={candidate.status} />
                  <span className="text-xs text-zinc-400">
                    相关度 {candidate.score}
                  </span>
                </div>
                {candidate.summary && (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                    {candidate.summary}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {candidate.url && (
                  <StudioButton
                    tone="ghost"
                    onClick={() => window.open(candidate.url!, '_blank')}
                  >
                    原文
                  </StudioButton>
                )}
                <StudioButton
                  tone="secondary"
                  onClick={async () => {
                    await studioRequest(
                      `/marlin/hotspots/candidates/${candidate.id}/status`,
                      {
                        method: 'PATCH',
                        body: studioJson({ status: 'selected' }),
                      },
                    )
                    notify('已加入选题')
                    await reload()
                  }}
                >
                  选中
                </StudioButton>
                <StudioButton
                  tone="ghost"
                  onClick={async () => {
                    await studioRequest(
                      `/marlin/hotspots/candidates/${candidate.id}/status`,
                      {
                        method: 'PATCH',
                        body: studioJson({ status: 'dismissed' }),
                      },
                    )
                    await reload()
                  }}
                >
                  忽略
                </StudioButton>
              </div>
            </StudioCard>
          ))
        )}
      </section>
    </div>
  )
}
