'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { studioJson, studioRequest } from '~/lib/studio-api'

import {
  StudioButton,
  StudioCard,
  StudioEmpty,
  StudioInput,
  StudioLabel,
  StudioSelect,
  StudioTextArea,
} from './primitives'
import type { AiRole, Project } from './types'

const slots = [
  ['material-analyst', '素材分析'],
  ['topic-planner', '选题策划'],
  ['writer', '内容写作'],
  ['reviewer', '编辑审校'],
  ['fact-checker', '事实核验'],
  ['seo-editor', 'SEO 编辑'],
] as const

export function AiSection({
  roles,
  projects,
  reload,
  notify,
}: {
  roles: AiRole[]
  projects: Project[]
  reload: () => Promise<void>
  notify: (message: string, error?: boolean) => void
}) {
  const [slot, setSlot] = useState('topic-planner')
  const [form, setForm] = useState({
    providerId: '',
    model: '',
    systemPrompt: '',
    temperature: '0.4',
    maxTokens: '4096',
    dailyBudgetCents: '0',
  })
  const [advice, setAdvice] = useState({
    projectId: projects[0]?.id ?? '',
    instruction: '',
  })
  const [result, setResult] = useState<null | {
    advice: string
    risks: string[]
    suggested_outline: string[]
    confidence: number
    usage?: { daily_spent_cents?: number; daily_budget_cents?: number }
  }>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const role = roles.find((item) => item.slot === slot)
    setForm({
      providerId: role?.provider_id ?? '',
      model: role?.model ?? '',
      systemPrompt: role?.system_prompt ?? '',
      temperature: String(role?.temperature ?? 0.4),
      maxTokens: String(role?.max_tokens ?? 4096),
      dailyBudgetCents: String(role?.daily_budget_cents ?? 0),
    })
  }, [roles, slot])

  useEffect(() => {
    if (!advice.projectId && projects[0]) {
      setAdvice((value) => ({ ...value, projectId: projects[0].id }))
    }
  }, [advice.projectId, projects])

  const saveRole = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await studioRequest('/marlin/ai/roles', {
        method: 'POST',
        body: studioJson({
          slot,
          provider_id: form.providerId,
          model: form.model,
          system_prompt: form.systemPrompt,
          temperature: Number(form.temperature),
          max_tokens: Number(form.maxTokens),
          daily_budget_cents: Number(form.dailyBudgetCents),
          enabled: true,
        }),
      })
      notify('AI 角色配置已保存')
      await reload()
    } catch (error) {
      notify(error instanceof Error ? error.message : '保存失败', true)
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm text-zinc-500">固定职责 · 独立模型 · 每日预算</p>
        <h2 className="text-2xl font-bold tracking-tight">AI 编辑部</h2>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <StudioCard>
          <div className="mb-5 flex flex-wrap gap-2">
            {slots.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setSlot(value)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                  slot === value
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <form className="grid gap-4" onSubmit={saveRole}>
            <div className="grid gap-3 md:grid-cols-2">
              <StudioLabel label="Core Provider ID">
                <StudioInput
                  value={form.providerId}
                  onChange={(event) =>
                    setForm({ ...form, providerId: event.target.value })
                  }
                  placeholder="openrouter-main"
                  required
                />
              </StudioLabel>
              <StudioLabel label="模型">
                <StudioInput
                  value={form.model}
                  onChange={(event) =>
                    setForm({ ...form, model: event.target.value })
                  }
                  placeholder="openai/gpt-5.5"
                  required
                />
              </StudioLabel>
            </div>
            <StudioLabel label="系统提示词">
              <StudioTextArea
                className="min-h-48"
                value={form.systemPrompt}
                onChange={(event) =>
                  setForm({ ...form, systemPrompt: event.target.value })
                }
                placeholder="说明该角色的边界、输出质量和证据要求"
              />
            </StudioLabel>
            <div className="grid grid-cols-3 gap-3">
              <StudioLabel label="温度">
                <StudioInput
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={form.temperature}
                  onChange={(event) =>
                    setForm({ ...form, temperature: event.target.value })
                  }
                />
              </StudioLabel>
              <StudioLabel label="最大 Token">
                <StudioInput
                  type="number"
                  value={form.maxTokens}
                  onChange={(event) =>
                    setForm({ ...form, maxTokens: event.target.value })
                  }
                />
              </StudioLabel>
              <StudioLabel label="日预算（分）" hint="0=不限">
                <StudioInput
                  type="number"
                  min="0"
                  value={form.dailyBudgetCents}
                  onChange={(event) =>
                    setForm({ ...form, dailyBudgetCents: event.target.value })
                  }
                />
              </StudioLabel>
            </div>
            <StudioButton>保存角色</StudioButton>
          </form>
        </StudioCard>

        <StudioCard className="grid h-fit gap-4 xl:sticky xl:top-6">
          <div>
            <h3 className="font-semibold">向角色征求建议</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              输出必须通过结构校验；调用成本会记录到该角色的日预算。
            </p>
          </div>
          {projects.length === 0 ? (
            <StudioEmpty>先创建项目，再调用 AI。</StudioEmpty>
          ) : (
            <>
              <StudioLabel label="项目">
                <StudioSelect
                  value={advice.projectId}
                  onChange={(event) =>
                    setAdvice({ ...advice, projectId: event.target.value })
                  }
                >
                  {projects.map((project) => (
                    <option value={project.id} key={project.id}>
                      {project.title}
                    </option>
                  ))}
                </StudioSelect>
              </StudioLabel>
              <StudioLabel label="本次任务">
                <StudioTextArea
                  className="min-h-32"
                  value={advice.instruction}
                  onChange={(event) =>
                    setAdvice({ ...advice, instruction: event.target.value })
                  }
                  placeholder="基于关联素材给出三种选题角度，并说明风险。"
                />
              </StudioLabel>
              <StudioButton
                disabled={pending || !advice.instruction}
                onClick={async () => {
                  setPending(true)
                  try {
                    const response = await studioRequest<typeof result>(
                      `/marlin/ai/projects/${advice.projectId}/advice`,
                      {
                        method: 'POST',
                        body: studioJson({
                          slot,
                          instruction: advice.instruction,
                        }),
                      },
                    )
                    setResult(response)
                    notify('AI 建议已完成并通过结构校验')
                  } catch (error) {
                    notify(
                      error instanceof Error ? error.message : '调用失败',
                      true,
                    )
                  } finally {
                    setPending(false)
                  }
                }}
              >
                {pending ? '思考中…' : '生成结构化建议'}
              </StudioButton>
            </>
          )}
          {result && (
            <div className="grid gap-3 border-t border-zinc-100 pt-4 text-sm dark:border-zinc-800">
              <p className="leading-6">{result.advice}</p>
              {result.suggested_outline.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-bold text-zinc-400">
                    建议结构
                  </p>
                  <ol className="list-inside list-decimal space-y-1">
                    {result.suggested_outline.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                </div>
              )}
              {result.risks.length > 0 && (
                <div className="rounded-xl bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  {result.risks.join('；')}
                </div>
              )}
              <p className="text-xs text-zinc-400">
                置信度 {Math.round(result.confidence * 100)}%
              </p>
            </div>
          )}
        </StudioCard>
      </div>
    </div>
  )
}
