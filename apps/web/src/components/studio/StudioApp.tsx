'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  StudioApiError,
  studioCheckAuth,
  studioLogout,
  studioRequest,
} from '~/lib/studio-api'

import { AiSection } from './AiSection'
import { HotspotsSection } from './HotspotsSection'
import { MaterialsSection } from './MaterialsSection'
import { MediaSection } from './MediaSection'
import { PagesSection } from './PagesSection'
import { StatusPill, StudioButton, StudioCard } from './primitives'
import { ProjectsSection } from './ProjectsSection'
import { SettingsSection } from './SettingsSection'
import { StudioLogin } from './StudioLogin'
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

type Section =
  | 'overview'
  | 'materials'
  | 'media'
  | 'hotspots'
  | 'projects'
  | 'pages'
  | 'ai'
  | 'settings'

const navigation: Array<{
  id: Section
  label: string
  description: string
  icon: string
}> = [
  { id: 'overview', label: '总览', description: '今日状态', icon: '⌁' },
  { id: 'materials', label: '素材库', description: '冻结与证据', icon: '◫' },
  { id: 'media', label: '媒体库', description: '归档与引用', icon: '▧' },
  { id: 'hotspots', label: '热点雷达', description: '采集与筛选', icon: '⌖' },
  { id: 'projects', label: '创作项目', description: '修订与发布', icon: '✎' },
  { id: 'pages', label: '独立页面', description: '跳过审阅', icon: '▤' },
  { id: 'ai', label: 'AI 编辑部', description: '角色与预算', icon: '✦' },
  { id: 'settings', label: '站点设置', description: '主题与展示', icon: '⚙' },
]

interface StudioData {
  materials: Material[]
  media: MediaAsset[]
  projects: Project[]
  themes: HotspotTheme[]
  sources: HotspotSource[]
  candidates: HotspotCandidate[]
  roles: AiRole[]
  categories: Category[]
  pages: CorePage[]
}

const emptyData: StudioData = {
  materials: [],
  media: [],
  projects: [],
  themes: [],
  sources: [],
  candidates: [],
  roles: [],
  categories: [],
  pages: [],
}

export function StudioApp() {
  const [auth, setAuth] = useState<'loading' | 'yes' | 'no'>('loading')
  const [previewToken, setPreviewToken] = useState<string>()
  const [section, setSection] = useState<Section>('overview')
  const [data, setData] = useState<StudioData>(emptyData)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<{
    message: string
    error: boolean
  } | null>(null)

  const notify = useCallback((message: string, error = false) => {
    setNotice({ message, error })
    window.setTimeout(() => setNotice(null), 4000)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [
        materials,
        media,
        projects,
        themes,
        sources,
        candidates,
        roles,
        categories,
        pages,
      ] = await Promise.all([
        studioRequest<Material[]>('/marlin/materials?page=1&size=100'),
        studioRequest<MediaAsset[]>('/marlin/materials/media'),
        studioRequest<Project[]>('/marlin/projects?page=1&size=100'),
        studioRequest<HotspotTheme[]>('/marlin/hotspots/themes'),
        studioRequest<HotspotSource[]>('/marlin/hotspots/sources'),
        studioRequest<HotspotCandidate[]>(
          '/marlin/hotspots/candidates?page=1&size=100',
        ),
        studioRequest<AiRole[]>('/marlin/ai/roles'),
        studioRequest<Category[]>('/categories?page=1&size=100'),
        studioRequest<CorePage[]>('/pages?page=1&size=100'),
      ])
      setData({
        materials,
        media,
        projects,
        themes,
        sources,
        candidates,
        roles,
        categories,
        pages,
      })
    } catch (error) {
      if (error instanceof StudioApiError && error.status === 401) {
        setAuth('no')
      } else {
        notify(
          error instanceof Error ? error.message : '工作室数据加载失败',
          true,
        )
      }
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    studioCheckAuth().then((ok) => {
      setAuth(ok ? 'yes' : 'no')
      if (ok) void load()
    })
  }, [load])

  if (auth === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f4ef] text-sm text-zinc-500 dark:bg-zinc-950">
        正在连接 Core…
      </main>
    )
  }

  if (auth === 'no') {
    return (
      <StudioLogin
        onSuccess={(token) => {
          setPreviewToken(token)
          setAuth('yes')
          void load()
        }}
      />
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f4ef] text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto grid min-h-screen max-w-[1680px] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-zinc-200 bg-white/80 p-5 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/80 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:p-6">
          <div className="flex items-center justify-between lg:block">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-black text-white dark:bg-white dark:text-zinc-950">
                  M
                </div>
                <div>
                  <p className="text-sm font-black tracking-tight">
                    MARLIN.LOG
                  </p>
                  <p className="text-xs text-zinc-400">Content Studio</p>
                </div>
              </div>
            </div>
            <StudioButton
              tone="ghost"
              className="lg:hidden"
              onClick={() => void load()}
            >
              刷新
            </StudioButton>
          </div>
          <nav className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:mt-10 lg:grid-cols-1">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`flex min-w-0 items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                  section === item.id
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="hidden size-8 shrink-0 items-center justify-center rounded-xl bg-current/10 text-lg sm:flex">
                  {item.icon}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {item.label}
                  </span>
                  <span
                    className={`hidden truncate text-[11px] sm:block ${
                      section === item.id
                        ? 'text-zinc-300 dark:text-zinc-500'
                        : 'text-zinc-400'
                    }`}
                  >
                    {item.description}
                  </span>
                </span>
              </button>
            ))}
          </nav>
          <div className="mt-6 hidden border-t border-zinc-100 pt-5 dark:border-zinc-800 lg:block">
            <div className="mb-3 flex items-center gap-2 text-xs text-zinc-400">
              <span
                className={`size-2 rounded-full ${
                  loading ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'
                }`}
              />
              <span>{loading ? '正在同步 Core' : 'Core v3 已连接'}</span>
            </div>
            <div className="grid gap-2">
              <StudioButton tone="secondary" onClick={() => void load()}>
                刷新数据
              </StudioButton>
              <StudioButton
                tone="ghost"
                onClick={async () => {
                  await studioLogout().catch(() => null)
                  setPreviewToken(undefined)
                  setAuth('no')
                }}
              >
                退出登录
              </StudioButton>
            </div>
          </div>
        </aside>

        <div className="min-w-0 p-5 sm:p-8 lg:p-10 xl:p-12">
          {section === 'overview' && (
            <Overview data={data} onNavigate={setSection} />
          )}
          {section === 'materials' && (
            <MaterialsSection
              materials={data.materials}
              reload={load}
              notify={notify}
            />
          )}
          {section === 'media' && <MediaSection media={data.media} />}
          {section === 'hotspots' && (
            <HotspotsSection
              themes={data.themes}
              sources={data.sources}
              candidates={data.candidates}
              reload={load}
              notify={notify}
            />
          )}
          {section === 'projects' && (
            <ProjectsSection
              projects={data.projects}
              materials={data.materials}
              categories={data.categories}
              reload={load}
              notify={notify}
            />
          )}
          {section === 'pages' && (
            <PagesSection pages={data.pages} reload={load} notify={notify} />
          )}
          {section === 'ai' && (
            <AiSection
              roles={data.roles}
              projects={data.projects}
              reload={load}
              notify={notify}
            />
          )}
          {section === 'settings' && (
            <SettingsSection authToken={previewToken} notify={notify} />
          )}
        </div>
      </div>

      {notice && (
        <div
          className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl px-4 py-3 text-sm font-medium shadow-2xl ${
            notice.error
              ? 'bg-red-600 text-white'
              : 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
          }`}
        >
          {notice.message}
        </div>
      )}
    </main>
  )
}

function Overview({
  data,
  onNavigate,
}: {
  data: StudioData
  onNavigate: (section: Section) => void
}) {
  const pendingReviews = data.projects.filter(
    ({ status }) => status === 'in_review',
  ).length
  const metrics = [
    {
      label: '冻结素材',
      value: data.materials.length,
      detail: `${data.materials.filter(({ status }) => status === 'ready').length} 条可用`,
      section: 'materials' as Section,
    },
    {
      label: '热点候选',
      value: data.candidates.length,
      detail: `${data.candidates.filter(({ status }) => status === 'selected').length} 条已选`,
      section: 'hotspots' as Section,
    },
    {
      label: '创作项目',
      value: data.projects.length,
      detail: `${data.projects.filter(({ status }) => status === 'published').length} 篇已发布`,
      section: 'projects' as Section,
    },
    {
      label: 'AI 角色',
      value: data.roles.length,
      detail: `共 7 个固定职责`,
      section: 'ai' as Section,
    },
  ]

  return (
    <div className="grid gap-8">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-zinc-500">
          {new Intl.DateTimeFormat('zh-CN', {
            dateStyle: 'full',
          }).format(new Date())}
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
          让证据先于观点，
          <br />
          让批准先于发布。
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-500 dark:text-zinc-400">
          素材冻结、热点采集、AI 协作、不可变修订、外部审阅和 Core
          发布现在处在一条可追溯的内容流水线上。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <button
            key={metric.label}
            className="text-left"
            onClick={() => onNavigate(metric.section)}
          >
            <StudioCard className="h-full transition hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-md dark:hover:border-zinc-600">
              <p className="text-sm text-zinc-500">{metric.label}</p>
              <p className="mt-3 text-4xl font-black">{metric.value}</p>
              <p className="mt-2 text-xs text-zinc-400">{metric.detail}</p>
            </StudioCard>
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <StudioCard>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                PROJECTS
              </p>
              <h2 className="font-semibold">最近项目</h2>
            </div>
            <StudioButton tone="ghost" onClick={() => onNavigate('projects')}>
              查看全部
            </StudioButton>
          </div>
          <div className="grid gap-2">
            {data.projects.slice(0, 6).map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-950"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {project.title}
                  </p>
                  <p className="mt-1 truncate text-xs text-zinc-400">
                    {project.goal || '尚未填写目标'}
                  </p>
                </div>
                <StatusPill value={project.status} />
              </div>
            ))}
            {data.projects.length === 0 && (
              <p className="py-10 text-center text-sm text-zinc-400">
                还没有创作项目。
              </p>
            )}
          </div>
        </StudioCard>

        <StudioCard className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            REVIEW QUEUE
          </p>
          <p className="mt-4 text-5xl font-black">{pendingReviews}</p>
          <p className="mt-2 text-sm text-zinc-400">个等待决策的审阅请求</p>
          <div className="mt-8 space-y-3 text-sm leading-6 text-zinc-300 dark:text-zinc-600">
            <p>审阅请求固定到一个不可变修订。</p>
            <p>审阅通过不会自动发布，发布仍需所有者确认。</p>
          </div>
        </StudioCard>
      </div>
    </div>
  )
}
