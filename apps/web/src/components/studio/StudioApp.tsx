'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  StudioApiError,
  studioCheckAuth,
  studioLogout,
  studioRequest,
} from '~/lib/studio-api'

import { AiSection } from './AiSection'
import { ComposeSection } from './ComposeSection'
import { HotspotsSection } from './HotspotsSection'
import { MaterialsSection } from './MaterialsSection'
import { MediaSection } from './MediaSection'
import { NativeConsoleSection } from './NativeConsoleSection'
import { OpsSection } from './OpsSection'
import { StudioButton } from './primitives'
import { ProjectsSection } from './ProjectsSection'
import { SettingsSection } from './SettingsSection'
import type { StudioData, StudioLoadFailure } from './studio-data'
import { emptyStudioData, loadStudioSnapshot } from './studio-data'
import type { StudioSection as Section } from './studio-navigation'
import {
  readStudioSection,
  studioNavigationGroups,
  studioNavigationItems,
  studioSectionUrl,
} from './studio-navigation'
import { StudioLogin } from './StudioLogin'
import { syncUnifiedAdminEntry } from './unified-admin'

export function StudioApp() {
  const [auth, setAuth] = useState<'loading' | 'yes' | 'no'>('loading')
  const [previewToken, setPreviewToken] = useState<string>()
  const [section, setSection] = useState<Section>('overview')
  const [nativeHash, setNativeHash] = useState('')
  const [focusedProjectId, setFocusedProjectId] = useState('')
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

  const syncAdminEntry = useCallback(async () => {
    try {
      const result = await syncUnifiedAdminEntry(
        (path, init) => studioRequest<unknown>(path, init),
        window.location.origin,
      )
      if (result.status === 'updated') {
        notify('Core 生成的管理链接已统一到当前后台')
      }
    } catch {
      // The console remains usable if this optional configuration sync fails.
    }
  }, [notify])

  useEffect(() => {
    studioCheckAuth().then((ok) => {
      setAuth(ok ? 'yes' : 'no')
      if (ok) {
        void load()
        void syncAdminEntry()
      }
    })
  }, [load, syncAdminEntry])

  useEffect(() => {
    const syncSectionFromUrl = () => {
      const { hash, search } = window.location
      setSection(readStudioSection(search, hash))
      setNativeHash(/^#\//.test(hash) ? hash : '')
    }
    syncSectionFromUrl()
    window.addEventListener('popstate', syncSectionFromUrl)
    window.addEventListener('hashchange', syncSectionFromUrl)
    return () => {
      window.removeEventListener('popstate', syncSectionFromUrl)
      window.removeEventListener('hashchange', syncSectionFromUrl)
    }
  }, [])

  const navigate = useCallback((nextSection: Section) => {
    setSection(nextSection)
    setNativeHash('')
    const nextUrl = studioSectionUrl(nextSection, window.location.href)
    if (
      `${window.location.pathname}${window.location.search}${window.location.hash}` !==
      nextUrl
    ) {
      window.history.pushState(null, '', nextUrl)
    }
  }, [])

  const logout = useCallback(async () => {
    await studioLogout().catch(() => null)
    setPreviewToken(undefined)
    dataRef.current = emptyStudioData
    setData(emptyStudioData)
    setLoadFailures([])
    setAuth('no')
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
          void syncAdminEntry()
        }}
      />
    )
  }

  if (section === 'core') {
    return (
      <NativeConsoleSection
        legacyHash={nativeHash}
        onBack={() => navigate('overview')}
        onLogout={() => void logout()}
      />
    )
  }

  return (
    <main className="min-h-screen max-w-full overflow-x-clip bg-[#f5f4ef] text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto grid min-h-screen w-full min-w-0 max-w-[1680px] grid-cols-[minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-zinc-200 bg-white/80 p-5 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/80 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:p-6">
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
          <nav className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:hidden">
            {studioNavigationItems.map((item) => (
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
          <nav className="mt-8 hidden min-h-0 flex-1 gap-5 overflow-y-auto lg:grid">
            {studioNavigationGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                  {group.label}
                </p>
                <div className="grid gap-1">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      aria-current={section === item.id ? 'page' : undefined}
                      className={`flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                        section === item.id
                          ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                          : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-current/10 text-lg">
                        {item.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {item.label}
                        </span>
                        <span
                          className={`block truncate text-[11px] ${
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
                </div>
              </div>
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
              <StudioButton tone="ghost" onClick={() => void logout()}>
                退出登录
              </StudioButton>
            </div>
          </div>
        </aside>

        <div className="min-w-0 p-5 sm:p-8 lg:p-10 xl:p-12">
          {section === 'overview' && (
            <ComposeSection
              aiConfig={data.aiConfig}
              projects={data.projects}
              reload={load}
              notify={notify}
              onCreated={(projectId) => {
                setFocusedProjectId(projectId)
                navigate('projects')
              }}
              onConfigureAi={() => navigate('ai')}
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
              focusedProjectId={focusedProjectId}
              onStartNew={() => navigate('overview')}
              reload={load}
              notify={notify}
            />
          )}
          {section === 'ai' && (
            <AiSection config={data.aiConfig} reload={load} notify={notify} />
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
