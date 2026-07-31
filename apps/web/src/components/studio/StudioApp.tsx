'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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
import { OpsSection } from './OpsSection'
import { OverviewSection } from './OverviewSection'
import { PagesSection } from './PagesSection'
import { StudioButton } from './primitives'
import { ProjectsSection } from './ProjectsSection'
import { SettingsSection } from './SettingsSection'
import type { StudioData, StudioLoadFailure } from './studio-data'
import { emptyStudioData, loadStudioSnapshot } from './studio-data'
import type { StudioSection as Section } from './studio-navigation'
import { readStudioSection, studioSectionUrl } from './studio-navigation'
import { StudioLogin } from './StudioLogin'

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
  { id: 'ops', label: '运维中心', description: '健康与备份', icon: '◉' },
  { id: 'settings', label: '站点设置', description: '主题与展示', icon: '⚙' },
]

export function StudioApp() {
  const [auth, setAuth] = useState<'loading' | 'yes' | 'no'>('loading')
  const [previewToken, setPreviewToken] = useState<string>()
  const [section, setSection] = useState<Section>('overview')
  const [data, setData] = useState<StudioData>(emptyStudioData)
  const dataRef = useRef<StudioData>(emptyStudioData)
  const [loadFailures, setLoadFailures] = useState<StudioLoadFailure[]>([])
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
      const snapshot = await loadStudioSnapshot(
        (path) => studioRequest<unknown>(path),
        dataRef.current,
      )
      dataRef.current = snapshot.data
      setData(snapshot.data)
      setLoadFailures(snapshot.failures)
      if (snapshot.failures.length > 0) {
        notify(
          `部分模块暂不可用：${snapshot.failures
            .map(({ label }) => label)
            .join('、')}；其余数据已正常显示`,
          true,
        )
      }
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

  useEffect(() => {
    const syncSectionFromUrl = () => {
      setSection(readStudioSection(window.location.search))
    }
    syncSectionFromUrl()
    window.addEventListener('popstate', syncSectionFromUrl)
    return () => window.removeEventListener('popstate', syncSectionFromUrl)
  }, [])

  const navigate = useCallback((nextSection: Section) => {
    setSection(nextSection)
    const nextUrl = studioSectionUrl(nextSection, window.location.href)
    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.pushState(null, '', nextUrl)
    }
  }, [])

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
    <main className="min-h-screen max-w-full overflow-x-clip bg-[#f5f4ef] text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto grid min-h-screen w-full min-w-0 max-w-[1680px] grid-cols-[minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-zinc-200 bg-white/80 p-5 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/80 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:p-6">
          <div className="flex items-center justify-between lg:block">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-black text-white dark:bg-white dark:text-zinc-950">
                  M
                </div>
                <div>
                  <p className="text-sm font-black tracking-tight">
                    MARLIN.LOG 管理后台
                  </p>
                  <p className="text-xs text-zinc-400">Taifost · Core v3</p>
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
                onClick={() => navigate(item.id)}
                aria-current={section === item.id ? 'page' : undefined}
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
                  loading
                    ? 'animate-pulse bg-amber-500'
                    : loadFailures.length > 0
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
              />
              <span>
                {loading
                  ? '正在同步 Core'
                  : loadFailures.length > 0
                    ? `${loadFailures.length} 个模块暂不可用`
                    : 'Core v3 已连接'}
              </span>
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
                  dataRef.current = emptyStudioData
                  setData(emptyStudioData)
                  setLoadFailures([])
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
            <OverviewSection
              data={data}
              failures={loadFailures}
              onNavigate={navigate}
            />
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
              timezone={data.siteTimezone}
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
          {section === 'ops' && <OpsSection notify={notify} />}
          {section === 'settings' && (
            <SettingsSection
              authToken={previewToken}
              notify={notify}
              reload={load}
            />
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
