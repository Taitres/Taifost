'use client'

import { StatusPill, StudioButton, StudioCard } from './primitives'
import type { StudioData, StudioLoadFailure } from './studio-data'
import type { StudioSection } from './studio-navigation'

interface OverviewSectionProps {
  data: StudioData
  failures: StudioLoadFailure[]
  onNavigate: (section: StudioSection) => void
}

const featureGroups: Array<{
  index: string
  title: string
  description: string
  sections: Array<{ id: StudioSection; label: string }>
}> = [
  {
    index: '01',
    title: '素材入库',
    description: '导入、冻结、去重、图片归档与内容分析',
    sections: [
      { id: 'materials', label: '素材库' },
      { id: 'media', label: '媒体库' },
    ],
  },
  {
    index: '02',
    title: '热点筛选',
    description: '维护主题和来源，把候选信号转成创作入口',
    sections: [{ id: 'hotspots', label: '热点雷达' }],
  },
  {
    index: '03',
    title: 'AI 协作',
    description: '配置固定职责、预算和选中段落改写',
    sections: [{ id: 'ai', label: 'AI 编辑部' }],
  },
  {
    index: '04',
    title: '修订与审核',
    description: '工作副本、不可变版本、外部审阅与显式发布',
    sections: [{ id: 'projects', label: '创作项目' }],
  },
  {
    index: '05',
    title: '站点内容',
    description: '独立页面、导航、三套主题、时区与 SEO',
    sections: [
      { id: 'pages', label: '独立页面' },
      { id: 'settings', label: '站点设置' },
    ],
  },
  {
    index: '06',
    title: '运行保障',
    description: '健康检查、便携备份、任务日志与定时任务',
    sections: [{ id: 'ops', label: '运维中心' }],
  },
]

const sectionFailureKeys: Partial<
  Record<StudioSection, StudioLoadFailure['key'][]>
> = {
  materials: ['materials'],
  media: ['media'],
  hotspots: ['themes', 'sources', 'candidates'],
  projects: ['projects', 'categories'],
  pages: ['pages'],
  ai: ['roles'],
  settings: ['siteTimezone'],
}

export function OverviewSection({
  data,
  failures,
  onNavigate,
}: OverviewSectionProps) {
  const pendingReviews = data.projects.filter(
    ({ status }) => status === 'in_review',
  ).length
  const metrics: Array<{
    label: string
    value: number
    detail: string
    section: StudioSection
  }> = [
    {
      label: '冻结素材',
      value: data.materials.length,
      detail: `${data.materials.filter(({ status }) => status === 'ready').length} 条可用`,
      section: 'materials',
    },
    {
      label: '热点候选',
      value: data.candidates.length,
      detail: `${data.candidates.filter(({ status }) => status === 'selected').length} 条已选`,
      section: 'hotspots',
    },
    {
      label: '创作项目',
      value: data.projects.length,
      detail: `${data.projects.filter(({ status }) => status === 'published').length} 篇已发布`,
      section: 'projects',
    },
    {
      label: 'AI 角色',
      value: data.roles.length,
      detail: '共 7 个固定职责',
      section: 'ai',
    },
  ]
  const failureKeys = new Set(failures.map(({ key }) => key))
  const sectionHasFailure = (section: StudioSection) =>
    sectionFailureKeys[section]?.some((key) => failureKeys.has(key)) ?? false

  return (
    <div className="grid gap-8">
      <div className="max-w-4xl">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            MARLIN 第一版
          </span>
          <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            已集成 Taifost + Core v3
          </span>
        </div>
        <p className="text-sm font-medium text-zinc-500">
          {new Intl.DateTimeFormat('zh-CN', {
            dateStyle: 'full',
            timeZone: data.siteTimezone,
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

      {failures.length > 0 && (
        <StudioCard className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                部分 Core 模块暂不可用
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-800/80 dark:text-amber-300/80">
                其他模块仍可正常使用；刷新后会自动重试。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {failures.map((failure) => (
                <span
                  key={failure.key}
                  title={failure.message}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-800 shadow-sm dark:bg-amber-950 dark:text-amber-200"
                >
                  {failure.label}
                </span>
              ))}
            </div>
          </div>
        </StudioCard>
      )}

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

      <section aria-labelledby="v1-feature-map">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              V1 CAPABILITIES
            </p>
            <h2
              id="v1-feature-map"
              className="text-2xl font-bold tracking-tight"
            >
              第一版功能入口
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-zinc-500">
            点击任一阶段直接进入对应后台模块；地址栏会保留当前模块，可刷新、收藏和分享给自己。
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featureGroups.map((group) => {
            const hasFailure = group.sections.some(({ id }) =>
              sectionHasFailure(id),
            )
            return (
              <StudioCard key={group.index} className="group grid gap-5">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-3xl font-black text-zinc-200 transition group-hover:text-zinc-300 dark:text-zinc-800 dark:group-hover:text-zinc-700">
                    {group.index}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      hasFailure
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {hasFailure ? '部分异常' : '可用'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold">{group.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                    {group.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.sections.map(({ id, label }) => (
                    <StudioButton
                      key={id}
                      tone="secondary"
                      className="min-h-9 px-3 py-1.5 text-xs"
                      onClick={() => onNavigate(id)}
                    >
                      {label} →
                    </StudioButton>
                  ))}
                </div>
              </StudioCard>
            )
          })}
        </div>
      </section>

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
