'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { studioFetch, studioRequest } from '~/lib/studio-api'

import { StatusPill, StudioButton, StudioCard, StudioEmpty } from './primitives'

type HealthStatus = 'ok' | 'degraded' | 'down' | 'disabled'

interface HealthComponent {
  status: HealthStatus
  label: string
  latency_ms?: number
  message: string
  details?: {
    failed?: number
    enabled?: number
    never_fetched?: number
    failures?: Array<{
      id: string
      name: string
      last_fetched_at?: string | null
      last_error?: string | null
    }>
  }
}

interface OpsHealth {
  status: Exclude<HealthStatus, 'disabled'>
  checked_at: string
  uptime_seconds: number
  version: string
  components: Record<string, HealthComponent>
}

interface Backup {
  filename: string
  size: number
}

interface TaskLog {
  timestamp: number
  level: 'info' | 'warn' | 'error'
  message: string
}

interface OpsTask {
  id: string
  type: string
  status: string
  progress?: number
  progress_message?: string
  created_at: number
  started_at?: number
  completed_at?: number
  error?: string
  logs: TaskLog[]
  retry_count: number
}

interface CronDefinition {
  type: string
  name: string
  description: string
  cron_expression: string
  last_date?: string | null
  next_date?: string | null
}

const healthTone: Record<HealthStatus, string> = {
  ok: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  down: 'bg-red-500',
  disabled: 'bg-zinc-300 dark:bg-zinc-600',
}

const statusLabel: Record<HealthStatus, string> = {
  ok: '正常',
  degraded: '降级',
  down: '不可用',
  disabled: '未启用',
}

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  return `${(bytes / 1024 ** exponent).toFixed(exponent ? 1 : 0)} ${units[exponent]}`
}

const formatTime = (value?: string | number | null) => {
  if (!value) return '尚无记录'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('zh-CN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  return [
    days ? `${days} 天` : '',
    hours ? `${hours} 小时` : '',
    `${minutes} 分钟`,
  ]
    .filter(Boolean)
    .join(' ')
}

const responseError = async (response: Response) => {
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string }
  } | null
  return body?.error?.message || `下载失败（HTTP ${response.status}）`
}

export function OpsSection({
  notify,
}: {
  notify: (message: string, error?: boolean) => void
}) {
  const [health, setHealth] = useState<OpsHealth>()
  const [backups, setBackups] = useState<Backup[]>([])
  const [tasks, setTasks] = useState<OpsTask[]>([])
  const [cron, setCron] = useState<CronDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [backupPending, setBackupPending] = useState(false)
  const [action, setAction] = useState<string>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [nextHealth, nextBackups, nextTasks, nextCron] = await Promise.all([
        studioRequest<OpsHealth>('/marlin/ops/health'),
        studioRequest<Backup[]>('/backups'),
        studioRequest<OpsTask[]>('/tasks?page=1&size=30'),
        studioRequest<CronDefinition[]>('/cron-task'),
      ])
      setHealth(nextHealth)
      setBackups(nextBackups)
      setTasks(nextTasks)
      setCron(nextCron)
    } catch (error) {
      notify(error instanceof Error ? error.message : '运维数据加载失败', true)
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    void load()
  }, [load])

  const failedTasks = useMemo(
    () =>
      tasks.filter(({ status }) =>
        ['failed', 'partial_failed'].includes(status),
      ),
    [tasks],
  )

  const download = async (path: string, fallbackName: string) => {
    const response = await studioFetch(path)
    if (!response.ok) throw new Error(await responseError(response))
    const blob = await response.blob()
    const disposition = response.headers.get('content-disposition')
    const filename =
      disposition?.match(/filename="?([^";]+)"?/i)?.[1] || fallbackName
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
  }

  const createBackup = async () => {
    setBackupPending(true)
    try {
      await download('/backups/new', `marlin-backup-${Date.now()}.zip`)
      await load()
      notify('便携备份已生成并开始下载')
    } catch (error) {
      notify(error instanceof Error ? error.message : '备份生成失败', true)
    } finally {
      setBackupPending(false)
    }
  }

  const retryTask = async (task: OpsTask) => {
    setAction(`task:${task.id}`)
    try {
      await studioRequest(`/tasks/${task.id}/retry`, { method: 'POST' })
      await load()
      notify(`已重新提交任务 ${task.type}`)
    } catch (error) {
      notify(error instanceof Error ? error.message : '任务重试失败', true)
    } finally {
      setAction(undefined)
    }
  }

  const runCron = async (definition: CronDefinition) => {
    setAction(`cron:${definition.type}`)
    try {
      await studioRequest(`/cron-task/run/${definition.type}`, {
        method: 'POST',
      })
      await load()
      notify(`已提交定时任务：${definition.description}`)
    } catch (error) {
      notify(error instanceof Error ? error.message : '定时任务提交失败', true)
    } finally {
      setAction(undefined)
    }
  }

  const testEmail = async () => {
    if (!window.confirm('这会立即向站长邮箱发送一封测试邮件，确认继续吗？')) {
      return
    }
    setAction('email')
    try {
      const result = await studioRequest<{ message?: string; trace?: string }>(
        '/health/email/test',
      )
      if (result?.trace) throw new Error(result.message || '测试邮件发送失败')
      notify(result?.message || '测试邮件已发送')
    } catch (error) {
      notify(error instanceof Error ? error.message : '测试邮件发送失败', true)
    } finally {
      setAction(undefined)
    }
  }

  if (loading && !health) {
    return <StudioEmpty>正在读取服务状态、备份与任务日志…</StudioEmpty>
  }

  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">
            OPERATIONS
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">运维中心</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            依赖健康、便携备份、任务失败和定时作业集中在这里。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StudioButton
            tone="secondary"
            disabled={action === 'email'}
            onClick={() => void testEmail()}
          >
            {action === 'email' ? '正在发送…' : '测试邮件'}
          </StudioButton>
          <StudioButton
            tone="secondary"
            disabled={loading}
            onClick={() => void load()}
          >
            {loading ? '正在刷新…' : '刷新状态'}
          </StudioButton>
          <StudioButton
            disabled={backupPending}
            onClick={() => void createBackup()}
          >
            {backupPending ? '正在打包…' : '生成并下载备份'}
          </StudioButton>
        </div>
      </header>

      {health && (
        <>
          <StudioCard className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <span
                className={`size-4 rounded-full ${healthTone[health.status]}`}
              />
              <div>
                <p className="font-bold">系统{statusLabel[health.status]}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Core {health.version} · 已运行{' '}
                  {formatUptime(health.uptime_seconds)}
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-zinc-400">
              <p>最近检查</p>
              <p className="mt-1">{formatTime(health.checked_at)}</p>
            </div>
          </StudioCard>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(health.components).map(([key, component]) => (
              <StudioCard key={key} className="h-full">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`size-2.5 rounded-full ${healthTone[component.status]}`}
                    />
                    <h2 className="font-semibold">{component.label}</h2>
                  </div>
                  <span className="text-xs font-medium text-zinc-400">
                    {statusLabel[component.status]}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-500">
                  {component.message}
                </p>
                {component.latency_ms !== undefined && (
                  <p className="mt-2 text-xs text-zinc-400">
                    {component.latency_ms} ms
                  </p>
                )}
                {component.details?.failures?.map((failure) => (
                  <div
                    key={failure.id}
                    className="mt-3 rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                  >
                    <p className="font-semibold">{failure.name}</p>
                    <p>{failure.last_error}</p>
                  </div>
                ))}
              </StudioCard>
            ))}
          </div>
        </>
      )}

      <section className="grid gap-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              BACKUPS
            </p>
            <h2 className="mt-1 text-xl font-black">便携备份</h2>
          </div>
          <p className="text-xs text-zinc-400">{backups.length} 份</p>
        </div>
        {backups.length ? (
          <StudioCard className="divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
            {backups.map((backup) => (
              <div
                key={backup.filename}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="text-sm font-semibold">{backup.filename}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {formatBytes(backup.size)}
                  </p>
                </div>
                <StudioButton
                  tone="ghost"
                  onClick={() =>
                    void download(
                      `/backups/${encodeURIComponent(backup.filename)}`,
                      `${backup.filename}.zip`,
                    ).catch((error) =>
                      notify(
                        error instanceof Error ? error.message : '备份下载失败',
                        true,
                      ),
                    )
                  }
                >
                  下载
                </StudioButton>
              </div>
            ))}
          </StudioCard>
        ) : (
          <StudioEmpty>还没有可下载的备份。</StudioEmpty>
        )}
      </section>

      <section className="grid gap-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              TASK LOG
            </p>
            <h2 className="mt-1 text-xl font-black">近期任务与日志</h2>
          </div>
          <p className="text-xs text-zinc-400">
            {failedTasks.length} 个失败 · 最近 {tasks.length} 个
          </p>
        </div>
        {tasks.length ? (
          <div className="grid gap-3">
            {tasks.map((task) => (
              <StudioCard key={task.id} className="p-0">
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {task.type}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {formatTime(task.created_at)} · 重试 {task.retry_count}{' '}
                        次
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusPill value={task.status} />
                      <span className="text-zinc-300 transition group-open:rotate-180 dark:text-zinc-600">
                        ▾
                      </span>
                    </div>
                  </summary>
                  <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
                    {task.progress_message && (
                      <p className="mb-3 text-sm text-zinc-500">
                        {`${task.progress ?? 0}% · ${task.progress_message}`}
                      </p>
                    )}
                    {task.error && (
                      <pre className="mb-3 whitespace-pre-wrap rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-700 dark:bg-red-950/50 dark:text-red-300">
                        {task.error}
                      </pre>
                    )}
                    {task.logs.length ? (
                      <div className="grid gap-2 font-mono text-xs">
                        {task.logs.slice(-8).map((log) => (
                          <div
                            key={`${log.timestamp}-${log.level}-${log.message}`}
                            className="grid gap-1 rounded-xl bg-zinc-50 p-3 sm:grid-cols-[140px_50px_1fr] dark:bg-zinc-950"
                          >
                            <span className="text-zinc-400">
                              {formatTime(log.timestamp)}
                            </span>
                            <span>{log.level}</span>
                            <span className="break-words">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-400">此任务没有日志。</p>
                    )}
                    {['failed', 'partial_failed'].includes(task.status) && (
                      <StudioButton
                        className="mt-4"
                        disabled={action === `task:${task.id}`}
                        onClick={() => void retryTask(task)}
                      >
                        {action === `task:${task.id}`
                          ? '正在重试…'
                          : '重试任务'}
                      </StudioButton>
                    )}
                  </div>
                </details>
              </StudioCard>
            ))}
          </div>
        ) : (
          <StudioEmpty>目前没有任务记录。</StudioEmpty>
        )}
      </section>

      <section className="grid gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            SCHEDULE
          </p>
          <h2 className="mt-1 text-xl font-black">定时作业</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cron.map((definition) => (
            <StudioCard key={definition.type} className="flex flex-col">
              <p className="font-semibold">{definition.description}</p>
              <p className="mt-2 font-mono text-xs text-zinc-400">
                {definition.cron_expression}
              </p>
              <dl className="mt-4 grid gap-2 text-xs text-zinc-500">
                <div>
                  <dt className="inline text-zinc-400">上次：</dt>
                  <dd className="inline">{formatTime(definition.last_date)}</dd>
                </div>
                <div>
                  <dt className="inline text-zinc-400">下次：</dt>
                  <dd className="inline">{formatTime(definition.next_date)}</dd>
                </div>
              </dl>
              <StudioButton
                tone="secondary"
                className="mt-5 w-full"
                disabled={action === `cron:${definition.type}`}
                onClick={() => void runCron(definition)}
              >
                {action === `cron:${definition.type}`
                  ? '正在提交…'
                  : '立即运行'}
              </StudioButton>
            </StudioCard>
          ))}
        </div>
      </section>
    </div>
  )
}
