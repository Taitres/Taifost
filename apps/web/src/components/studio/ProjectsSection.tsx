'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'

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
import type { Category, Material, Project } from './types'

interface ReviewCredential {
  id: string
  passcode: string | null
  review_path: string
  passcode_configured?: boolean
  email_delivery?: {
    status: 'not_requested' | 'sent' | 'failed'
    to?: string
    error?: string
  }
}

export function ProjectsSection({
  projects,
  materials,
  categories,
  timezone,
  reload,
  notify,
}: {
  projects: Project[]
  materials: Material[]
  categories: Category[]
  timezone: string
  reload: () => Promise<void>
  notify: (message: string, error?: boolean) => void
}) {
  const [selectedId, setSelectedId] = useState(projects[0]?.id ?? '')
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)
  const [credential, setCredential] = useState<ReviewCredential | null>(null)
  const [projectForm, setProjectForm] = useState({ title: '', goal: '' })
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const [revisionForm, setRevisionForm] = useState({
    title: '',
    slug: '',
    summary: '',
    content: '',
    categoryId: categories[0]?.id ?? '',
    tags: '',
  })
  const [scheduledAt, setScheduledAt] = useState('')
  const [reviewerEmail, setReviewerEmail] = useState('')
  const [rewritePending, setRewritePending] = useState(false)
  const [rewriteSelection, setRewriteSelection] = useState({
    start: 0,
    end: 0,
  })

  const loadProject = async (id = selectedId) => {
    if (!id) {
      setProject(null)
      return
    }
    setLoading(true)
    try {
      const detail = await studioRequest<Project>(`/marlin/projects/${id}`)
      setProject(detail)
      setSelectedMaterials(detail.materials?.map(({ id }) => id) ?? [])
    } catch (error) {
      notify(error instanceof Error ? error.message : '项目加载失败', true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedId && projects[0]) setSelectedId(projects[0].id)
  }, [projects, selectedId])

  useEffect(() => {
    void loadProject(selectedId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  useEffect(() => {
    if (!revisionForm.categoryId && categories[0]) {
      setRevisionForm((value) => ({
        ...value,
        categoryId: categories[0].id,
      }))
    }
  }, [categories, revisionForm.categoryId])

  const attachedIds = useMemo(
    () => new Set(project?.materials?.map(({ id }) => id)),
    [project],
  )

  const createProject = async (event: FormEvent) => {
    event.preventDefault()
    try {
      const created = await studioRequest<Project>('/marlin/projects', {
        method: 'POST',
        body: studioJson(projectForm),
      })
      setProjectForm({ title: '', goal: '' })
      await reload()
      setSelectedId(created.id)
      notify('创作项目已创建')
    } catch (error) {
      notify(error instanceof Error ? error.message : '创建失败', true)
    }
  }

  const afterMutation = async (message: string) => {
    notify(message)
    await Promise.all([reload(), loadProject()])
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="grid h-fit gap-4 xl:sticky xl:top-6">
        <StudioCard>
          <h3 className="mb-3 font-semibold">新建项目</h3>
          <form className="grid gap-3" onSubmit={createProject}>
            <StudioLabel label="项目名称">
              <StudioInput
                value={projectForm.title}
                onChange={(event) =>
                  setProjectForm({
                    ...projectForm,
                    title: event.target.value,
                  })
                }
                placeholder="本周长文"
                required
              />
            </StudioLabel>
            <StudioLabel label="创作目标">
              <StudioTextArea
                className="min-h-24"
                value={projectForm.goal}
                onChange={(event) =>
                  setProjectForm({
                    ...projectForm,
                    goal: event.target.value,
                  })
                }
                placeholder="写清楚目标读者、核心问题和预期结论"
              />
            </StudioLabel>
            <StudioButton>创建</StudioButton>
          </form>
        </StudioCard>
        <div className="grid gap-2">
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
              <div className="truncate font-semibold">{item.title}</div>
              <div
                className={`mt-2 text-xs ${
                  selectedId === item.id
                    ? 'text-zinc-300 dark:text-zinc-600'
                    : 'text-zinc-400'
                }`}
              >
                {item.status}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="min-w-0">
        {!selectedId ? (
          <StudioEmpty>先创建一个创作项目。</StudioEmpty>
        ) : loading && !project ? (
          <StudioEmpty>正在加载项目…</StudioEmpty>
        ) : project ? (
          <div className="grid gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <StatusPill value={project.status} />
                  <span className="font-mono text-xs text-zinc-400">
                    {project.id}
                  </span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight">
                  {project.title}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                  {project.goal || '尚未填写创作目标。'}
                </p>
              </div>
              {project.core_post_id && project.status !== 'withdrawn' && (
                <StudioButton
                  tone="danger"
                  onClick={async () => {
                    try {
                      await studioRequest(
                        `/marlin/projects/${project.id}/withdraw`,
                        { method: 'POST' },
                      )
                      await afterMutation('文章已撤回，Core 内容记录仍保留')
                    } catch (error) {
                      notify(
                        error instanceof Error ? error.message : '撤回失败',
                        true,
                      )
                    }
                  }}
                >
                  撤回文章
                </StudioButton>
              )}
            </div>

            <StudioCard>
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  01 · EVIDENCE
                </p>
                <h3 className="font-semibold">关联素材</h3>
              </div>
              {materials.length === 0 ? (
                <p className="text-sm text-zinc-500">请先在素材库导入内容。</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {materials.map((material) => (
                    <label
                      key={material.id}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-700"
                    >
                      <input
                        className="mt-1"
                        type="checkbox"
                        checked={selectedMaterials.includes(material.id)}
                        disabled={
                          attachedIds.has(material.id) ||
                          material.status === 'pending'
                        }
                        onChange={(event) =>
                          setSelectedMaterials((ids) =>
                            event.target.checked
                              ? [...ids, material.id]
                              : ids.filter((id) => id !== material.id),
                          )
                        }
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {material.title}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {attachedIds.has(material.id)
                            ? '已关联并冻结'
                            : material.status === 'pending'
                              ? '图片待处理，暂不可关联'
                              : material.kind}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <StudioButton
                className="mt-4"
                tone="secondary"
                disabled={
                  selectedMaterials.filter((id) => !attachedIds.has(id))
                    .length === 0
                }
                onClick={async () => {
                  try {
                    await studioRequest(
                      `/marlin/projects/${project.id}/materials`,
                      {
                        method: 'POST',
                        body: studioJson({
                          material_ids: selectedMaterials.filter(
                            (id) => !attachedIds.has(id),
                          ),
                        }),
                      },
                    )
                    await afterMutation('素材已关联')
                  } catch (error) {
                    notify(
                      error instanceof Error ? error.message : '关联失败',
                      true,
                    )
                  }
                }}
              >
                保存素材关系
              </StudioButton>
            </StudioCard>

            <StudioCard>
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  02 · REVISION
                </p>
                <h3 className="font-semibold">创建不可变修订</h3>
              </div>
              <form
                className="grid gap-4"
                onSubmit={async (event) => {
                  event.preventDefault()
                  try {
                    await studioRequest(
                      `/marlin/projects/${project.id}/revisions`,
                      {
                        method: 'POST',
                        body: studioJson({
                          title: revisionForm.title,
                          slug: revisionForm.slug,
                          summary: revisionForm.summary || null,
                          content: revisionForm.content,
                          category_id: revisionForm.categoryId,
                          tags: revisionForm.tags
                            .split(',')
                            .map((value) => value.trim())
                            .filter(Boolean),
                          metadata: { editor: 'shiro-studio' },
                        }),
                      },
                    )
                    setRevisionForm((value) => ({
                      ...value,
                      title: '',
                      slug: '',
                      summary: '',
                      content: '',
                      tags: '',
                    }))
                    await afterMutation('新修订已冻结')
                  } catch (error) {
                    notify(
                      error instanceof Error ? error.message : '创建修订失败',
                      true,
                    )
                  }
                }}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <StudioLabel label="文章标题">
                    <StudioInput
                      value={revisionForm.title}
                      onChange={(event) =>
                        setRevisionForm({
                          ...revisionForm,
                          title: event.target.value,
                        })
                      }
                      required
                    />
                  </StudioLabel>
                  <StudioLabel label="固定链接">
                    <StudioInput
                      value={revisionForm.slug}
                      onChange={(event) =>
                        setRevisionForm({
                          ...revisionForm,
                          slug: event.target.value,
                        })
                      }
                      placeholder="my-article"
                      required
                    />
                  </StudioLabel>
                </div>
                <StudioLabel label="摘要">
                  <StudioInput
                    value={revisionForm.summary}
                    onChange={(event) =>
                      setRevisionForm({
                        ...revisionForm,
                        summary: event.target.value,
                      })
                    }
                  />
                </StudioLabel>
                <div className="grid gap-3 md:grid-cols-2">
                  <StudioLabel label="Core 分类">
                    <StudioSelect
                      value={revisionForm.categoryId}
                      onChange={(event) =>
                        setRevisionForm({
                          ...revisionForm,
                          categoryId: event.target.value,
                        })
                      }
                      required
                    >
                      <option value="" disabled>
                        选择分类
                      </option>
                      {categories.map((category) => (
                        <option value={category.id} key={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </StudioSelect>
                  </StudioLabel>
                  <StudioLabel label="标签" hint="逗号分隔">
                    <StudioInput
                      value={revisionForm.tags}
                      onChange={(event) =>
                        setRevisionForm({
                          ...revisionForm,
                          tags: event.target.value,
                        })
                      }
                    />
                  </StudioLabel>
                </div>
                <StudioLabel label="Markdown 正文">
                  <StudioTextArea
                    className="min-h-[420px] font-mono text-sm leading-7"
                    value={revisionForm.content}
                    onChange={(event) =>
                      setRevisionForm({
                        ...revisionForm,
                        content: event.target.value,
                      })
                    }
                    onSelect={(event) =>
                      setRewriteSelection({
                        start: event.currentTarget.selectionStart,
                        end: event.currentTarget.selectionEnd,
                      })
                    }
                    required
                  />
                </StudioLabel>
                <div className="flex flex-wrap items-center gap-3">
                  <StudioButton
                    type="button"
                    tone="secondary"
                    disabled={
                      rewritePending ||
                      rewriteSelection.end <= rewriteSelection.start
                    }
                    onClick={async () => {
                      const { start, end } = rewriteSelection
                      const selected = revisionForm.content.slice(start, end)
                      if (!selected) return
                      setRewritePending(true)
                      try {
                        const result = await studioRequest<{
                          advice: string
                        }>(`/marlin/ai/projects/${project.id}/advice`, {
                          method: 'POST',
                          body: studioJson({
                            slot: 'quick-rewriter',
                            instruction: [
                              '改写下面选中的 Markdown 段落。',
                              '保留事实、链接、代码和原意；提升中文表达的准确性与可读性。',
                              'advice 字段只能放可直接替换原文的 Markdown，不要解释。',
                              `选中内容：\n${selected}`,
                            ].join('\n\n'),
                          }),
                        })
                        setRevisionForm((value) => ({
                          ...value,
                          content:
                            value.content.slice(0, start) +
                            result.advice +
                            value.content.slice(end),
                        }))
                        setRewriteSelection({
                          start,
                          end: start + result.advice.length,
                        })
                        notify('选中段落已由快速改写岗位替换')
                      } catch (error) {
                        notify(
                          error instanceof Error
                            ? error.message
                            : 'AI 改写失败',
                          true,
                        )
                      } finally {
                        setRewritePending(false)
                      }
                    }}
                  >
                    {rewritePending ? '正在改写…' : 'AI 改写选中段落'}
                  </StudioButton>
                  <span className="text-xs text-zinc-400">
                    仅替换当前选择；保存时仍会冻结为全新修订。
                  </span>
                </div>
                <StudioButton>冻结为新修订</StudioButton>
              </form>
              {!!project.revisions?.length && (
                <div className="mt-6 grid gap-2 border-t border-zinc-100 pt-5 dark:border-zinc-800">
                  {project.revisions.map((revision) => (
                    <div
                      className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-950"
                      key={revision.id}
                    >
                      <div>
                        <span className="font-semibold">
                          v{revision.version} · {revision.title}
                        </span>
                        <p className="mt-1 font-mono text-xs text-zinc-400">
                          {revision.id}
                        </p>
                      </div>
                      {revision.id === project.approved_revision_id && (
                        <StatusPill value="approved" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </StudioCard>

            <StudioCard>
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  03 · REVIEW
                </p>
                <h3 className="font-semibold">审阅与决策</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <StudioLabel
                  label="审阅人邮箱"
                  hint="可选；配置 Core 邮件后自动发送"
                >
                  <StudioInput
                    type="email"
                    value={reviewerEmail}
                    onChange={(event) => setReviewerEmail(event.target.value)}
                    placeholder="reviewer@example.com"
                  />
                </StudioLabel>
                <StudioButton
                  className="self-end"
                  disabled={!project.current_revision_id}
                  onClick={async () => {
                    try {
                      const result = await studioRequest<{
                        request: { id: string }
                        passcode: string | null
                        review_path: string
                        passcode_configured?: boolean
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
                        review_path: result.review_path,
                        passcode_configured: result.passcode_configured,
                        email_delivery: result.email_delivery,
                      })
                      await afterMutation(
                        result.email_delivery?.status === 'sent'
                          ? '审阅请求已创建并发送邮件'
                          : result.email_delivery?.status === 'failed'
                            ? '审阅请求已创建，但邮件发送失败'
                            : '审阅请求已创建',
                      )
                    } catch (error) {
                      notify(
                        error instanceof Error ? error.message : '创建审阅失败',
                        true,
                      )
                    }
                  }}
                >
                  为当前修订发起审阅
                </StudioButton>
              </div>
              {credential && (
                <div className="mt-4 rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/40">
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                    口令仅显示一次
                  </p>
                  {credential.passcode ? (
                    <p className="mt-2 font-mono text-3xl font-black tracking-[0.3em]">
                      {credential.passcode}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm font-semibold">
                      使用服务器预设的长期审批口令；邮件中不会包含口令。
                    </p>
                  )}
                  {credential.email_delivery?.status === 'sent' && (
                    <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
                      已发送至 {credential.email_delivery.to}
                    </p>
                  )}
                  {credential.email_delivery?.status === 'failed' && (
                    <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                      邮件失败：{credential.email_delivery.error}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StudioButton
                      tone="secondary"
                      onClick={() => {
                        const url = `${window.location.origin}/studio/review/${credential.id}`
                        void navigator.clipboard.writeText(
                          credential.passcode
                            ? `${url}\n口令：${credential.passcode}`
                            : url,
                        )
                        notify(
                          credential.passcode
                            ? '审阅链接和口令已复制'
                            : '审阅链接已复制（口令需另行告知）',
                        )
                      }}
                    >
                      复制审阅信息
                    </StudioButton>
                    <StudioButton
                      tone="ghost"
                      onClick={() =>
                        window.open(`/studio/review/${credential.id}`, '_blank')
                      }
                    >
                      打开审阅页
                    </StudioButton>
                  </div>
                </div>
              )}
              {!!project.reviews?.length && (
                <div className="mt-5 grid gap-2">
                  {project.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="flex items-center justify-between rounded-xl border border-zinc-100 px-4 py-3 text-sm dark:border-zinc-800"
                    >
                      <span className="font-mono text-xs">{review.id}</span>
                      <StatusPill value={review.status} />
                    </div>
                  ))}
                </div>
              )}
            </StudioCard>

            <StudioCard>
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  04 · PUBLICATION
                </p>
                <h3 className="font-semibold">发布</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  只有精确获批的修订可以发布。定时发布会锁定该修订。
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-[minmax(0,280px)_auto] md:items-end">
                <StudioLabel label="定时发布" hint="留空立即发布">
                  <StudioInput
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                  />
                  <span className="text-xs font-normal text-zinc-400">
                    按 {timezone} 输入，保存为 UTC 绝对时刻
                  </span>
                </StudioLabel>
                <StudioButton
                  disabled={!project.approved_revision_id}
                  onClick={async () => {
                    try {
                      await studioRequest(
                        `/marlin/projects/${project.id}/publish`,
                        {
                          method: 'POST',
                          body: studioJson({
                            scheduled_at: scheduledAt
                              ? zonedLocalDateTimeToIso(scheduledAt, timezone)
                              : undefined,
                          }),
                        },
                      )
                      await afterMutation(
                        scheduledAt ? '发布任务已排期' : '已发布到 Core',
                      )
                    } catch (error) {
                      notify(
                        error instanceof Error ? error.message : '发布失败',
                        true,
                      )
                    }
                  }}
                >
                  {scheduledAt ? '确认排期' : '发布获批修订'}
                </StudioButton>
              </div>
              {!!project.publications?.length && (
                <div className="mt-5 grid gap-2">
                  {project.publications.map((publication) => (
                    <div
                      key={publication.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-50 px-4 py-3 text-sm dark:bg-zinc-950"
                    >
                      <span>
                        修订{' '}
                        <span className="font-mono text-xs">
                          {publication.revision_id}
                        </span>
                      </span>
                      <StatusPill value={publication.status} />
                    </div>
                  ))}
                </div>
              )}
            </StudioCard>
          </div>
        ) : (
          <StudioEmpty>项目不存在或加载失败。</StudioEmpty>
        )}
      </section>
    </div>
  )
}
