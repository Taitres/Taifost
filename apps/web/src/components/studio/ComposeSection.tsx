'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { studioJson, studioRequest } from '~/lib/studio-api'

import {
  StatusPill,
  StudioButton,
  StudioCard,
  StudioTextArea,
} from './primitives'
import type { Project } from './types'

interface ComposeResult {
  project: Project
  revision: { id: string; title: string }
  deduplicated: boolean
  ignored_images?: number
  generation_mode?: 'ai' | 'local'
}

const progressSteps = [
  '读取来源',
  '归档图片与分析内容',
  'AI 组织结构与元数据',
  '生成可编辑初稿',
]

const statusLabel = (status: string) =>
  (
    ({
      draft: '准备中',
      ready: '可编辑',
      in_review: '审阅中',
      approved: '待发布',
      changes_requested: '待修改',
      scheduled: '已排期',
      published: '已发布',
      withdrawn: '已撤回',
    }) as Record<string, string>
  )[status] || status

export function ComposeSection({
  projects,
  reload,
  notify,
  onCreated,
}: {
  projects: Project[]
  reload: () => Promise<void>
  notify: (message: string, error?: boolean) => void
  onCreated: (projectId: string) => void
}) {
  const [source, setSource] = useState('')
  const [instruction, setInstruction] = useState('')
  const [pending, setPending] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!pending) {
      setStep(0)
      return
    }
    const readTimer = window.setTimeout(() => setStep(1), 1_800)
    const analyzeTimer = window.setTimeout(() => setStep(2), 6_000)
    const draftTimer = window.setTimeout(() => setStep(3), 14_000)
    return () => {
      window.clearTimeout(readTimer)
      window.clearTimeout(analyzeTimer)
      window.clearTimeout(draftTimer)
    }
  }, [pending])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!source.trim()) return
    setPending(true)
    try {
      const result = await studioRequest<ComposeResult>('/marlin/compose', {
        method: 'POST',
        body: studioJson({
          source: source.trim(),
          instruction: instruction.trim(),
        }),
      })
      await reload()
      notify(
        result.generation_mode === 'local'
          ? '初稿已完成；当前使用本地智能整理，配置 AI 后会自动升级为完整改写'
          : result.ignored_images
            ? `初稿已完成；${result.ignored_images} 张无法归档的图片已自动跳过`
            : '初稿已完成，现在只需检查和发布',
      )
      setSource('')
      setInstruction('')
      onCreated(result.project.id)
    } catch (error) {
      notify(error instanceof Error ? error.message : '生成初稿失败', true)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-10">
      <section className="mx-auto w-full max-w-5xl pt-3 sm:pt-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-white dark:bg-white dark:text-zinc-950">
            个人创作模式
          </span>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
            给我一条链接，
            <br />
            剩下交给 AI。
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-zinc-500 sm:text-base">
            粘贴公开链接或
            Markdown。系统会自动抓取、归档图片、理解内容、生成标题、
            摘要、分类、标签和完整初稿。
          </p>
        </div>

        <StudioCard className="mx-auto mt-8 max-w-4xl border-zinc-300 p-3 shadow-xl shadow-zinc-200/50 dark:border-zinc-700 dark:shadow-black/20 sm:p-5">
          <form className="grid gap-3" onSubmit={submit}>
            <StudioTextArea
              aria-label="链接或 Markdown"
              className="min-h-56 resize-y border-0 bg-transparent px-3 py-3 text-base leading-7 shadow-none focus:ring-0 sm:min-h-64"
              value={source}
              disabled={pending}
              onChange={(event) => setSource(event.target.value)}
              placeholder={[
                '粘贴 https://... ',
                '',
                '或直接粘贴 Markdown：',
                '# 我想写的主题',
                '',
                '这是现有的资料与想法……',
              ].join('\n')}
              required
            />

            {pending ? (
              <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950">
                <div className="grid grid-cols-4 gap-2">
                  {progressSteps.map((label, index) => (
                    <div key={label} className="min-w-0">
                      <div
                        className={`h-1.5 rounded-full transition ${
                          index <= step
                            ? 'bg-zinc-950 dark:bg-white'
                            : 'bg-zinc-200 dark:bg-zinc-800'
                        }`}
                      />
                      <p
                        className={`mt-2 hidden truncate text-[11px] sm:block ${
                          index === step
                            ? 'font-semibold text-zinc-800 dark:text-zinc-100'
                            : 'text-zinc-400'
                        }`}
                      >
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm font-medium">
                  {progressSteps[step]}……较长的来源可能需要一两分钟
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    上传 Markdown
                    <input
                      className="sr-only"
                      type="file"
                      accept=".md,.markdown,.txt,text/plain,text/markdown"
                      onChange={async (event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        if (file.size > 5_000_000) {
                          notify('文件超过 5MB，未读取', true)
                          return
                        }
                        setSource(await file.text())
                      }}
                    />
                  </label>
                  <details className="group relative">
                    <summary className="cursor-pointer list-none rounded-xl px-3 py-2 text-xs font-semibold text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      可选：说一句你想怎么写
                    </summary>
                    <div className="absolute bottom-12 left-0 z-10 w-[min(520px,calc(100vw-4rem))] rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
                      <StudioTextArea
                        aria-label="可选写作要求"
                        className="min-h-24"
                        value={instruction}
                        onChange={(event) => setInstruction(event.target.value)}
                        placeholder="例如：写给普通读者，语气克制，重点说清楚实际影响。留空就使用默认写法。"
                      />
                    </div>
                  </details>
                </div>
                <StudioButton
                  className="min-w-36 rounded-2xl"
                  disabled={!source.trim()}
                >
                  生成可编辑初稿 →
                </StudioButton>
              </div>
            )}
          </form>
        </StudioCard>
      </section>

      {projects.length > 0 && (
        <section className="mx-auto w-full max-w-5xl">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                RECENT WRITING
              </p>
              <h2 className="mt-1 text-xl font-bold">最近的文章</h2>
            </div>
            <p className="text-xs text-zinc-400">
              随时继续编辑，不需要提前配置
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projects.slice(0, 6).map((project) => (
              <button
                key={project.id}
                className="text-left"
                onClick={() => onCreated(project.id)}
              >
                <StudioCard className="h-full transition hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-md dark:hover:border-zinc-600">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 font-semibold">
                      {project.title}
                    </h3>
                    <StatusPill value={project.status} />
                  </div>
                  <p className="mt-4 text-xs text-zinc-400">
                    {statusLabel(project.status)} · 点击继续编辑
                  </p>
                </StudioCard>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
