'use client'

import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Markdown } from '~/components/ui/markdown'
import { zonedLocalDateTimeToIso } from '~/lib/site-timezone'
import { studioJson, studioRequest } from '~/lib/studio-api'

import {
  StatusPill,
  StudioButton,
  StudioCard,
  StudioEmpty,
  StudioInput,
  StudioLabel,
  StudioSelect,
  StudioTextArea,
} from './primitives'
import type { Category, Material, Project, Revision } from './types'

interface ReviewCredential {
  id: string
  passcode: string | null
  email_delivery?: {
    status: 'not_requested' | 'sent' | 'failed'
    to?: string
    error?: string
  }
}

interface DraftForm {
  title: string
  slug: string
  summary: string
  content: string
  categoryId: string
  tags: string
}

const emptyDraft = (categoryId = ''): DraftForm => ({
  title: '',
  slug: '',
  summary: '',
  content: '',
  categoryId,
  tags: '',
})

const formFromRevision = (revision: Revision): DraftForm => ({
  title: revision.title,
  slug: revision.slug,
  summary: revision.summary || '',
  content: revision.content,
  categoryId: revision.category_id,
  tags: revision.tags.join(', '),
})

const draftKey = (projectId: string) => `marlin:writing-draft:${projectId}`
const snapshot = (form: DraftForm) => JSON.stringify(form)

const exportRevision = (revision: Revision) => {
  const blob = new Blob([revision.content], {
    type: 'text/markdown;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${revision.slug || 'article'}.md`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

const statusText = (status: string) =>
  (
    ({
      draft: '正在准备',
      ready: '初稿可编辑',
      in_review: '外部审阅中',
      approved: '可以发布',
      changes_requested: '等待修改',
      scheduled: '已安排发布',
      published: '已发布',
      withdrawn: '已撤回',
    }) as Record<string, string>
  )[status] || status

export function ProjectsSection({
  projects,
  categories,
  timezone,
  focusedProjectId,
  onStartNew,
  reload,
  notify,
}: {
  projects: Project[]
  materials: Material[]
  categories: Category[]
  timezone: string
  focusedProjectId?: string
  onStartNew: () => void
  reload: () => Promise<void>
  notify: (message: string, error?: boolean) => void
}) {
  const [selectedId, setSelectedId] = useState(
    focusedProjectId || projects[0]?.id || '',
  )
  const [project, setProject] = useState<Project | null>(null)
  const [form, setForm] = useState<DraftForm>(() =>
    emptyDraft(categories[0]?.id),
  )
  const [savedSnapshot, setSavedSnapshot] = useState('')
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<
    'save' | 'publish' | 'schedule' | 'delete' | ''
  >('')
  const [editorMode, setEditorMode] = useState<'edit' | 'split' | 'preview'>(
    'split',
  )
  const [scheduledAt, setScheduledAt] = useState('')
  const [reviewerEmail, setReviewerEmail] = useState('')
  const [credential, setCredential] = useState<ReviewCredential | null>(null)

  const loadProject = useCallback(
    async (id: string, restoreLocal = true) => {
      if (!id) {
        setProject(null)
        return null
      }
      setLoading(true)
      try {
        const detail = await studioRequest<Project>(`/marlin/projects/${id}`)
        setProject(detail)
        const latest = detail.revisions?.[0]
        const persisted = restoreLocal
          ? window.localStorage.getItem(draftKey(id))
          : null
        let nextForm = latest
          ? formFromRevision(latest)
          : {
              ...emptyDraft(categories[0]?.id),
              title: detail.title,
              slug: detail.title
                .toLowerCase()
                .replaceAll(/[^\p{L}\p{N}]+/gu, '-')
                .replaceAll(/^-+|-+$/g, ''),
            }
        if (persisted) {
          try {
            nextForm = JSON.parse(persisted) as DraftForm
          } catch {
            window.localStorage.removeItem(draftKey(id))
          }
        }
        setForm(nextForm)
        setSavedSnapshot(snapshot(latest ? formFromRevision(latest) : nextForm))
        return detail
      } catch (error) {
        notify(error instanceof Error ? error.message : '文章加载失败', true)
        return null
      } finally {
        setLoading(false)
      }
    },
    [categories, notify],
  )

  useEffect(() => {
    if (focusedProjectId) setSelectedId(focusedProjectId)
  }, [focusedProjectId])

  useEffect(() => {
    if (!selectedId && projects[0]) setSelectedId(projects[0].id)
  }, [projects, selectedId])

  useEffect(() => {
    void loadProject(selectedId)
  }, [loadProject, selectedId])

  useEffect(() => {
    if (!selectedId || !form.content) return
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(draftKey(selectedId), snapshot(form))
    }, 500)
    return () => window.clearTimeout(timer)
  }, [form, selectedId])

  const dirty = useMemo(
    () => Boolean(form.content) && snapshot(form) !== savedSnapshot,
    [form, savedSnapshot],
  )
  const generation = project?.revisions?.[0]?.metadata?.generation
  const aiReview = generation?.review
  const reviewRiskCount =
    (aiReview?.issues.length || 0) + (aiReview?.remaining_risks.length || 0)

  const save = async (quiet = false) => {
    if (!project) return null
    if (!form.title.trim() || !form.content.trim() || !form.categoryId) {
      notify('标题、正文和分类不能为空', true)
      return null
    }
    if (!dirty && project.current_revision_id)
      return project.current_revision_id
    if (!quiet) setAction('save')
    try {
      const revision = await studioRequest<Revision>(
        `/marlin/projects/${project.id}/revisions`,
        {
          method: 'POST',
          body: studioJson({
            title: form.title.trim(),
            slug: form.slug.trim() || project.id,
            summary: form.summary.trim() || null,
            content: form.content,
            category_id: form.categoryId,
            tags: form.tags
              .split(/[,，]/)
              .map((value) => value.trim())
              .filter(Boolean),
            metadata: { editor: 'personal-writing-desk' },
          }),
        },
      )
      window.localStorage.removeItem(draftKey(project.id))
      setSavedSnapshot(snapshot(form))
      await Promise.all([reload(), loadProject(project.id, false)])
      if (!quiet) notify('修改已保存')
      return revision.id
    } catch (error) {
      notify(error instanceof Error ? error.message : '保存失败', true)
      return null
    } finally {
      if (!quiet) setAction('')
    }
  }

  const publish = async (schedule?: string) => {
    if (!project) return
    setAction(schedule ? 'schedule' : 'publish')
    try {
      const revisionId = await save(true)
      if (!revisionId) return
      await studioRequest(`/marlin/projects/${project.id}/publish-current`, {
        method: 'POST',
        body: studioJson({
          scheduled_at: schedule
            ? zonedLocalDateTimeToIso(schedule, timezone)
            : undefined,
        }),
      })
      setScheduledAt('')
      await Promise.all([reload(), loadProject(project.id, false)])
      notify(schedule ? '已安排发布' : '文章已发布')
    } catch (error) {
      notify(error instanceof Error ? error.message : '发布失败', true)
    } finally {
      setAction('')
    }
  }

  const deleteProject = async () => {
    if (!project) return
    if (project.core_post_id && project.status !== 'withdrawn') {
      notify('请先撤回已发布文章，再删除本地草稿与历史', true)
      return
    }
    const confirmed = window.confirm(
      `确定删除“${project.title}”吗？草稿、修订、审阅和发布记录都会删除；共享素材和 OpenList 图片不会被删除。此操作不可撤销。`,
    )
    if (!confirmed) return
    setAction('delete')
    try {
      await studioRequest(`/marlin/projects/${project.id}`, {
        method: 'DELETE',
      })
      window.localStorage.removeItem(draftKey(project.id))
      const nextId = projects.find(({ id }) => id !== project.id)?.id || ''
      setProject(null)
      setSelectedId(nextId)
      setForm(emptyDraft(categories[0]?.id))
      setSavedSnapshot('')
      await reload()
      notify('项目草稿及关联历史已删除')
    } catch (error) {
      notify(error instanceof Error ? error.message : '删除失败', true)
    } finally {
      setAction('')
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="grid h-fit gap-3 xl:sticky xl:top-6">
        <StudioButton className="w-full" onClick={onStartNew}>
          + 粘贴链接或 Markdown
        </StudioButton>
        <div className="grid max-h-[70vh] gap-2 overflow-y-auto pr-1">
          {projects.map((item) => (
            <button
              key={item.id}
              className={`rounded-2xl border p-4 text-left transition ${
                selectedId === item.id
                  ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                  : 'border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900'
              }`}
              onClick={() => setSelectedId(item.id)}
            >
              <div className="line-clamp-2 font-semibold">{item.title}</div>
              <div
                className={`mt-2 text-xs ${
                  selectedId === item.id
                    ? 'text-zinc-300 dark:text-zinc-600'
                    : 'text-zinc-400'
                }`}
              >
                {statusText(item.status)}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="min-w-0">
        {!selectedId ? (
          <StudioEmpty>
            粘贴一条链接或 Markdown，AI 会在这里交付初稿。
          </StudioEmpty>
        ) : loading && !project ? (
          <StudioEmpty>正在打开文章…</StudioEmpty>
        ) : project ? (
          <div className="grid gap-5">
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <StatusPill value={project.status} />
                  <span className="text-xs text-zinc-400">
                    {statusText(project.status)}
                  </span>
                  {dirty && (
                    <span className="text-xs font-medium text-amber-600">
                      有未保存修改
                    </span>
                  )}
                </div>
                <h1 className="line-clamp-2 text-3xl font-black tracking-tight">
                  {project.title}
                </h1>
              </div>
              <div className="flex flex-wrap gap-2">
                {project.core_post_id && project.status !== 'withdrawn' ? (
                  <StudioButton
                    tone="danger"
                    onClick={async () => {
                      try {
                        await studioRequest(
                          `/marlin/projects/${project.id}/withdraw`,
                          { method: 'POST' },
                        )
                        await Promise.all([
                          reload(),
                          loadProject(project.id, false),
                        ])
                        notify('文章已撤回')
                      } catch (error) {
                        notify(
                          error instanceof Error ? error.message : '撤回失败',
                          true,
                        )
                      }
                    }}
                  >
                    撤回
                  </StudioButton>
                ) : (
                  <StudioButton
                    disabled={Boolean(action) || !form.content}
                    onClick={() => void publish()}
                  >
                    {action === 'publish' ? '正在发布…' : '发布文章'}
                  </StudioButton>
                )}
                <StudioButton
                  tone="danger"
                  disabled={Boolean(action)}
                  onClick={() => void deleteProject()}
                >
                  {action === 'delete' ? '正在删除…' : '删除项目'}
                </StudioButton>
              </div>
            </header>

            {generation?.mode === 'ai-pipeline' && (
              <StudioCard
                className={`grid gap-3 border-l-4 ${
                  reviewRiskCount > 0
                    ? 'border-l-amber-500'
                    : 'border-l-emerald-500'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {`AI 已完成 ${generation.stages?.length || 6} 阶段流水线`}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      已自动分析、规划、写作、事实核验、终审和整理发布信息
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      reviewRiskCount > 0
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
                    }`}
                  >
                    {reviewRiskCount > 0
                      ? `${reviewRiskCount} 项需要你留意`
                      : '未发现待处理风险'}
                  </span>
                </div>
                {aiReview && reviewRiskCount > 0 && (
                  <details className="rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
                    <summary className="cursor-pointer font-semibold">
                      查看 AI 审查提示
                    </summary>
                    <ul className="mt-3 list-inside list-disc space-y-2 text-amber-900 dark:text-amber-100">
                      {aiReview.issues.map((issue) => (
                        <li
                          key={`${issue.severity}:${issue.claim}:${issue.reason}`}
                        >
                          {issue.claim}：{issue.reason}；建议{issue.suggestion}
                        </li>
                      ))}
                      {aiReview.remaining_risks.map((risk) => (
                        <li key={risk}>{risk}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </StudioCard>
            )}

            <StudioCard className="grid gap-4 p-4 sm:p-6">
              <form
                className="grid gap-4"
                onSubmit={(event: FormEvent) => {
                  event.preventDefault()
                  void save()
                }}
              >
                <StudioLabel label="标题">
                  <StudioInput
                    className="text-lg font-semibold"
                    value={form.title}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                    required
                  />
                </StudioLabel>

                <div className="grid gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">正文</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        编辑内容即可；每次保存都可以恢复
                      </p>
                    </div>
                    <div className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-950">
                      {(
                        [
                          ['edit', '编辑'],
                          ['split', '分栏'],
                          ['preview', '预览'],
                        ] as const
                      ).map(([mode, label]) => (
                        <StudioButton
                          key={mode}
                          type="button"
                          tone="ghost"
                          className={`min-h-8 px-3 py-1 text-xs ${
                            editorMode === mode
                              ? 'bg-white shadow-sm dark:bg-zinc-800'
                              : ''
                          }`}
                          onClick={() => setEditorMode(mode)}
                        >
                          {label}
                        </StudioButton>
                      ))}
                    </div>
                  </div>
                  <div
                    className={`grid gap-3 ${
                      editorMode === 'split' ? 'lg:grid-cols-2' : ''
                    }`}
                  >
                    {editorMode !== 'preview' && (
                      <StudioTextArea
                        aria-label="Markdown 正文"
                        className="min-h-[560px] font-mono text-sm leading-7"
                        value={form.content}
                        onChange={(event) =>
                          setForm({ ...form, content: event.target.value })
                        }
                        required
                      />
                    )}
                    {editorMode !== 'edit' && (
                      <div className="min-h-[560px] min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-700 dark:bg-zinc-950">
                        {form.content ? (
                          <Markdown
                            value={form.content}
                            className="min-w-0 overflow-hidden"
                          />
                        ) : (
                          <p className="text-sm text-zinc-400">
                            初稿生成后会显示在这里。
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <details className="rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
                    摘要、分类、标签与链接设置
                    <span className="ml-2 font-normal text-zinc-400">
                      AI 已自动填写，可后期修改
                    </span>
                  </summary>
                  <div className="grid gap-4 border-t border-zinc-100 p-4 dark:border-zinc-800">
                    <StudioLabel label="摘要">
                      <StudioTextArea
                        className="min-h-24"
                        value={form.summary}
                        onChange={(event) =>
                          setForm({ ...form, summary: event.target.value })
                        }
                      />
                    </StudioLabel>
                    <div className="grid gap-3 md:grid-cols-2">
                      <StudioLabel label="分类">
                        <StudioSelect
                          value={form.categoryId}
                          onChange={(event) =>
                            setForm({ ...form, categoryId: event.target.value })
                          }
                          required
                        >
                          {categories.map((category) => (
                            <option value={category.id} key={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </StudioSelect>
                      </StudioLabel>
                      <StudioLabel label="标签" hint="逗号分隔">
                        <StudioInput
                          value={form.tags}
                          onChange={(event) =>
                            setForm({ ...form, tags: event.target.value })
                          }
                        />
                      </StudioLabel>
                    </div>
                    <StudioLabel label="固定链接">
                      <StudioInput
                        value={form.slug}
                        onChange={(event) =>
                          setForm({ ...form, slug: event.target.value })
                        }
                      />
                    </StudioLabel>
                  </div>
                </details>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-zinc-400">
                    未提交的文字会在当前浏览器自动保存
                  </p>
                  <StudioButton disabled={Boolean(action)}>
                    {action === 'save'
                      ? '正在保存…'
                      : dirty
                        ? '保存修改'
                        : '已保存'}
                  </StudioButton>
                </div>
              </form>
            </StudioCard>

            <details className="group rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <summary className="cursor-pointer list-none px-5 py-4 font-semibold">
                来源与历史
                <span className="ml-2 text-xs font-normal text-zinc-400">
                  {`默认隐藏 · ${project.materials?.length || 0} 个来源 · ${project.revisions?.length || 0} 次保存`}
                </span>
              </summary>
              <div className="grid gap-5 border-t border-zinc-100 p-5 dark:border-zinc-800">
                {!!project.materials?.length && (
                  <div>
                    <h3 className="text-sm font-semibold">内容来源</h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {project.materials.map((material) => (
                        <div
                          key={material.id}
                          className="rounded-xl bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-950"
                        >
                          <p className="truncate font-medium">
                            {material.title}
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            已自动冻结与分析
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!!project.revisions?.length && (
                  <div>
                    <h3 className="text-sm font-semibold">恢复历史</h3>
                    <div className="mt-3 grid gap-2">
                      {project.revisions.map((revision) => (
                        <div
                          key={revision.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-100 px-3 py-2 dark:border-zinc-800"
                        >
                          <span className="text-sm">
                            {new Date(revision.created_at).toLocaleString(
                              'zh-CN',
                            )}
                            <span className="ml-2 text-xs text-zinc-400">
                              第 {revision.version} 次保存
                            </span>
                          </span>
                          <div className="flex gap-1">
                            <StudioButton
                              tone="ghost"
                              className="min-h-8 px-2 py-1 text-xs"
                              onClick={() => {
                                setForm(formFromRevision(revision))
                                setEditorMode('split')
                                notify('历史内容已载入，保存后会成为当前文章')
                              }}
                            >
                              恢复到编辑器
                            </StudioButton>
                            <StudioButton
                              tone="ghost"
                              className="min-h-8 px-2 py-1 text-xs"
                              onClick={() => exportRevision(revision)}
                            >
                              导出
                            </StudioButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </details>

            <details className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <summary className="cursor-pointer px-5 py-4 font-semibold">
                定时发布与外部审阅
                <span className="ml-2 text-xs font-normal text-zinc-400">
                  个人写作通常不需要
                </span>
              </summary>
              <div className="grid gap-6 border-t border-zinc-100 p-5 dark:border-zinc-800">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,300px)_auto] sm:items-end">
                  <StudioLabel label="定时发布" hint={timezone}>
                    <StudioInput
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(event) => setScheduledAt(event.target.value)}
                    />
                  </StudioLabel>
                  <StudioButton
                    tone="secondary"
                    disabled={!scheduledAt || Boolean(action)}
                    onClick={() => void publish(scheduledAt)}
                  >
                    {action === 'schedule' ? '正在安排…' : '安排发布'}
                  </StudioButton>
                </div>

                <div className="border-t border-zinc-100 pt-5 dark:border-zinc-800">
                  <p className="text-sm font-semibold">邀请他人审阅</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    只在你真的需要别人把关时使用
                  </p>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <StudioLabel label="审阅人邮箱" hint="可选">
                      <StudioInput
                        type="email"
                        value={reviewerEmail}
                        onChange={(event) =>
                          setReviewerEmail(event.target.value)
                        }
                        placeholder="reviewer@example.com"
                      />
                    </StudioLabel>
                    <StudioButton
                      tone="secondary"
                      disabled={!project.current_revision_id}
                      onClick={async () => {
                        try {
                          const result = await studioRequest<{
                            request: { id: string }
                            passcode: string | null
                            email_delivery?: ReviewCredential['email_delivery']
                          }>(`/marlin/projects/${project.id}/reviews`, {
                            method: 'POST',
                            body: studioJson({
                              expires_in_hours: 72,
                              reviewer_email: reviewerEmail || undefined,
                            }),
                          })
                          setCredential({
                            id: result.request.id,
                            passcode: result.passcode,
                            email_delivery: result.email_delivery,
                          })
                          await loadProject(project.id, false)
                          notify('审阅链接已创建')
                        } catch (error) {
                          notify(
                            error instanceof Error
                              ? error.message
                              : '创建审阅失败',
                            true,
                          )
                        }
                      }}
                    >
                      创建审阅链接
                    </StudioButton>
                  </div>
                  {credential && (
                    <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
                      <p>
                        审阅地址：{window.location.origin}/studio/review/
                        {credential.id}
                      </p>
                      <p className="mt-1">
                        {`口令：${credential.passcode || '使用服务器预设口令'}`}
                      </p>
                      <StudioButton
                        tone="ghost"
                        className="mt-2"
                        onClick={() => {
                          const url = `${window.location.origin}/studio/review/${credential.id}`
                          void navigator.clipboard.writeText(
                            credential.passcode
                              ? `${url}\n口令：${credential.passcode}`
                              : url,
                          )
                          notify('审阅信息已复制')
                        }}
                      >
                        复制审阅信息
                      </StudioButton>
                    </div>
                  )}
                </div>
              </div>
            </details>
          </div>
        ) : (
          <StudioEmpty>文章不存在或加载失败。</StudioEmpty>
        )}
      </section>
    </div>
  )
}
