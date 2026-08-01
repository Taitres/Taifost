'use client'

import { useEffect, useMemo, useState } from 'react'

import { studioJson, studioRequest } from '~/lib/studio-api'

import {
  StudioButton,
  StudioCard,
  StudioEmpty,
  StudioInput,
  StudioLabel,
  StudioSelect,
} from './primitives'
import type {
  AiAssignment,
  AiConfig,
  AiProvider,
  AiProviderType,
  AiTaskKey,
} from './types'

const taskGroups: Array<{
  label: string
  description: string
  tasks: Array<[AiTaskKey, string]>
}> = [
  {
    label: '一键写作流水线',
    description: '提交来源后自动依次执行，无需逐个操作。',
    tasks: [
      ['material_analysis', '素材分析'],
      ['topic_planning', '选题规划'],
      ['writing', '完整写作'],
      ['fact_check', '事实核验'],
      ['review', '终审修订'],
      ['seo', '发布信息'],
    ],
  },
  {
    label: '站点其他 AI 能力',
    description: 'Core 的摘要、翻译、评论与洞察也统一从这里选模型。',
    tasks: [
      ['quick_rewrite', '编辑器快速改写'],
      ['summary', '文章摘要'],
      ['comment_review', '评论审核'],
      ['translation', '文章翻译'],
      ['translation_review', '翻译审校'],
      ['insights', '文章洞察'],
      ['insights_translation', '洞察翻译'],
    ],
  },
]

const providerPresets: Array<{
  label: string
  type: AiProviderType
  endpoint: string
  model: string
}> = [
  {
    label: 'OpenAI',
    type: 'openai-compatible',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-5.2',
  },
  {
    label: 'DeepSeek',
    type: 'openai-compatible',
    endpoint: 'https://api.deepseek.com',
    model: 'deepseek-chat',
  },
  {
    label: 'OpenRouter',
    type: 'openai-compatible',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-5.2',
  },
  {
    label: 'Anthropic',
    type: 'anthropic',
    endpoint: 'https://api.anthropic.com',
    model: 'claude-sonnet-4-5',
  },
]

const cleanId = (value: string) =>
  value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')

const assignmentValue = (assignment: AiAssignment) =>
  JSON.stringify([assignment.provider_id, assignment.model])

const readAssignmentValue = (value: string): AiAssignment | undefined => {
  if (!value) return undefined
  const [providerId, model] = JSON.parse(value) as [string, string]
  return { provider_id: providerId, model }
}

const prepareProvider = (provider: AiProvider) => ({
  id: provider.id,
  name: provider.name,
  type: provider.type,
  api_key: provider.api_key,
  endpoint: provider.endpoint || undefined,
  model_list_url: provider.model_list_url || undefined,
  append_v1: provider.append_v1,
  default_model: provider.default_model,
  enabled: provider.enabled,
  context_window: provider.context_window,
  max_tokens: provider.max_tokens,
})

export function AiSection({
  config,
  reload,
  notify,
}: {
  config: AiConfig
  reload: () => Promise<void>
  notify: (message: string, error?: boolean) => void
}) {
  const [providers, setProviders] = useState<AiProvider[]>([])
  const [defaultProviderId, setDefaultProviderId] = useState('')
  const [defaultModel, setDefaultModel] = useState('')
  const [assignments, setAssignments] = useState<
    Partial<Record<AiTaskKey, AiAssignment>>
  >({})
  const [models, setModels] = useState<
    Record<string, Array<{ id: string; name?: string }>>
  >({})
  const [pending, setPending] = useState('')

  useEffect(() => {
    setProviders(config.providers)
    setDefaultProviderId(config.default_provider_id || '')
    setDefaultModel(config.default_model || '')
    setAssignments(config.assignments || {})
  }, [config])

  const modelChoices = useMemo(() => {
    const values: AiAssignment[] = []
    for (const provider of providers.filter(({ enabled }) => enabled)) {
      const ids = new Set([
        provider.default_model,
        ...(models[provider.id] || []).map(({ id }) => id),
      ])
      for (const model of ids) {
        if (model) values.push({ provider_id: provider.id, model })
      }
    }
    return values
  }, [models, providers])

  const updateProvider = (id: string, patch: Partial<AiProvider>) => {
    setProviders((items) =>
      items.map((provider) =>
        provider.id === id ? { ...provider, ...patch } : provider,
      ),
    )
  }

  const save = async () => {
    setPending('save')
    try {
      const next = await studioRequest<AiConfig>('/marlin/ai/config', {
        method: 'PUT',
        body: studioJson({
          providers: providers.map(prepareProvider),
          default_provider_id: defaultProviderId || undefined,
          default_model: defaultModel || undefined,
          assignments,
        }),
      })
      setProviders(next.providers)
      setAssignments(next.assignments)
      setDefaultProviderId(next.default_provider_id || '')
      setDefaultModel(next.default_model || '')
      notify('AI 配置已统一应用到完整流水线和 Core')
      await reload()
      return true
    } catch (error) {
      notify(error instanceof Error ? error.message : '保存失败', true)
      return false
    } finally {
      setPending('')
    }
  }

  const test = async (providerId: string) => {
    const provider = providers.find(({ id }) => id === providerId)
    if (provider && (!provider.credential_configured || provider.api_key)) {
      const saved = await save()
      if (!saved) return
    }
    setPending(`test:${providerId}`)
    try {
      await studioRequest('/marlin/ai/config/test', {
        method: 'POST',
        body: studioJson({ provider_id: providerId }),
      })
      notify('连接成功，模型可以正常调用')
    } catch (error) {
      notify(error instanceof Error ? error.message : '连接失败', true)
    } finally {
      setPending('')
    }
  }

  const loadModels = async (providerId: string) => {
    const provider = providers.find(({ id }) => id === providerId)
    if (provider && (!provider.credential_configured || provider.api_key)) {
      const saved = await save()
      if (!saved) return
    }
    setPending(`models:${providerId}`)
    try {
      const result = await studioRequest<{
        models: Array<{ id: string; name?: string }>
      }>(
        `/marlin/ai/config/models?provider_id=${encodeURIComponent(providerId)}`,
      )
      setModels((value) => ({ ...value, [providerId]: result.models }))
      notify(`已读取 ${result.models.length} 个可用模型`)
    } catch (error) {
      notify(error instanceof Error ? error.message : '读取模型失败', true)
    } finally {
      setPending('')
    }
  }

  const addProvider = (preset: (typeof providerPresets)[number]) => {
    const base = cleanId(preset.label) || 'provider'
    const used = new Set(providers.map(({ id }) => id))
    let id = base
    let index = 2
    while (used.has(id)) id = `${base}-${index++}`
    const provider: AiProvider = {
      id,
      name: preset.label,
      type: preset.type,
      api_key: '',
      endpoint: preset.endpoint,
      append_v1: true,
      default_model: preset.model,
      enabled: true,
      credential_configured: false,
    }
    setProviders((items) => [...items, provider])
    if (!defaultProviderId) {
      setDefaultProviderId(id)
      setDefaultModel(preset.model)
    }
  }

  return (
    <div className="grid gap-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">
            配置一次 · 全站复用 · 自动执行
          </p>
          <h2 className="text-2xl font-bold tracking-tight">AI 配置中心</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
            这里只需配置模型服务和默认模型。写作、核验、审校、SEO，以及 Core
            的摘要和翻译都会直接继承；只有需要不同模型的任务才单独选择。
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            config.ready
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
          }`}
        >
          {config.ready ? 'AI 流水线已就绪' : '尚未完成 AI 配置'}
        </span>
      </div>

      <StudioCard className="grid gap-5">
        <div>
          <h3 className="font-semibold">模型服务</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            选择常用服务可自动填好地址；密钥只保存在 Core，页面不会回显。
          </p>
        </div>
        {providers.length === 0 ? (
          <StudioEmpty>选择下方服务开始配置，通常只需要一个。</StudioEmpty>
        ) : (
          <div className="grid gap-4">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="grid gap-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      aria-label="启用模型服务"
                      type="checkbox"
                      checked={provider.enabled}
                      onChange={(event) =>
                        updateProvider(provider.id, {
                          enabled: event.target.checked,
                        })
                      }
                    />
                    <span className="font-semibold">{provider.name}</span>
                    {provider.credential_configured && !provider.api_key && (
                      <span className="text-xs text-emerald-600">
                        密钥已保存
                      </span>
                    )}
                  </div>
                  <StudioButton
                    type="button"
                    tone="ghost"
                    onClick={() => {
                      setProviders((items) =>
                        items.filter(({ id }) => id !== provider.id),
                      )
                      if (defaultProviderId === provider.id) {
                        setDefaultProviderId('')
                        setDefaultModel('')
                      }
                    }}
                  >
                    移除
                  </StudioButton>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <StudioLabel label="名称">
                    <StudioInput
                      value={provider.name}
                      onChange={(event) =>
                        updateProvider(provider.id, {
                          name: event.target.value,
                        })
                      }
                    />
                  </StudioLabel>
                  <StudioLabel label="Provider ID" hint="保存后不要随意修改">
                    <StudioInput value={provider.id} disabled />
                  </StudioLabel>
                  <StudioLabel label="协议">
                    <StudioSelect
                      value={provider.type}
                      onChange={(event) =>
                        updateProvider(provider.id, {
                          type: event.target.value as AiProviderType,
                        })
                      }
                    >
                      <option value="openai-compatible">OpenAI 兼容</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="generic">通用协议</option>
                    </StudioSelect>
                  </StudioLabel>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <StudioLabel
                    label="API Key"
                    hint={
                      provider.credential_configured
                        ? '留空即保留现有密钥'
                        : '首次配置必填'
                    }
                  >
                    <StudioInput
                      type="password"
                      autoComplete="new-password"
                      value={provider.api_key}
                      placeholder={
                        provider.credential_configured
                          ? '••••••••（已保存）'
                          : '粘贴 API Key'
                      }
                      onChange={(event) =>
                        updateProvider(provider.id, {
                          api_key: event.target.value,
                        })
                      }
                    />
                  </StudioLabel>
                  <StudioLabel label="接口地址">
                    <StudioInput
                      value={provider.endpoint || ''}
                      onChange={(event) =>
                        updateProvider(provider.id, {
                          endpoint: event.target.value,
                        })
                      }
                    />
                  </StudioLabel>
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
                  <StudioLabel label="该服务默认模型">
                    <StudioInput
                      list={`models-${provider.id}`}
                      value={provider.default_model}
                      onChange={(event) => {
                        updateProvider(provider.id, {
                          default_model: event.target.value,
                        })
                        if (defaultProviderId === provider.id) {
                          setDefaultModel(event.target.value)
                        }
                      }}
                    />
                    <datalist id={`models-${provider.id}`}>
                      {(models[provider.id] || []).map((model) => (
                        <option value={model.id} key={model.id}>
                          {model.name || model.id}
                        </option>
                      ))}
                    </datalist>
                  </StudioLabel>
                  <StudioButton
                    type="button"
                    tone="secondary"
                    disabled={Boolean(pending)}
                    onClick={() => void loadModels(provider.id)}
                  >
                    {pending === `models:${provider.id}`
                      ? '读取中…'
                      : '读取模型'}
                  </StudioButton>
                  <StudioButton
                    type="button"
                    tone="secondary"
                    disabled={Boolean(pending)}
                    onClick={() => void test(provider.id)}
                  >
                    {pending === `test:${provider.id}` ? '测试中…' : '测试连接'}
                  </StudioButton>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          {providerPresets.map((preset) => (
            <StudioButton
              key={preset.label}
              type="button"
              tone="secondary"
              onClick={() => addProvider(preset)}
            >
              + {preset.label}
            </StudioButton>
          ))}
        </div>
      </StudioCard>

      {providers.length > 0 && (
        <StudioCard className="grid gap-5">
          <div>
            <h3 className="font-semibold">全局默认模型</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              新增的 AI 能力也会自动继承它，不需要重复配置。
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <StudioLabel label="默认服务">
              <StudioSelect
                value={defaultProviderId}
                onChange={(event) => {
                  const id = event.target.value
                  const provider = providers.find((item) => item.id === id)
                  setDefaultProviderId(id)
                  setDefaultModel(provider?.default_model || '')
                }}
              >
                <option value="">请选择</option>
                {providers
                  .filter(({ enabled }) => enabled)
                  .map((provider) => (
                    <option value={provider.id} key={provider.id}>
                      {provider.name}
                    </option>
                  ))}
              </StudioSelect>
            </StudioLabel>
            <StudioLabel label="默认模型">
              <StudioInput
                value={defaultModel}
                onChange={(event) => setDefaultModel(event.target.value)}
                placeholder="先选择服务"
              />
            </StudioLabel>
          </div>
        </StudioCard>
      )}

      {providers.length > 0 && (
        <StudioCard className="grid gap-6">
          <div>
            <h3 className="font-semibold">任务模型</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              默认全部继承全局模型。只有确实需要更快、更强或更省的任务才覆盖。
            </p>
          </div>
          {taskGroups.map((group) => (
            <div className="grid gap-3" key={group.label}>
              <div>
                <p className="text-sm font-semibold">{group.label}</p>
                <p className="text-xs text-zinc-500">{group.description}</p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {group.tasks.map(([key, label]) => (
                  <StudioLabel label={label} key={key}>
                    <StudioSelect
                      value={
                        assignments[key]
                          ? assignmentValue(assignments[key])
                          : ''
                      }
                      onChange={(event) => {
                        const next = { ...assignments }
                        const assignment = readAssignmentValue(
                          event.target.value,
                        )
                        if (assignment) next[key] = assignment
                        else delete next[key]
                        setAssignments(next)
                      }}
                    >
                      <option value="">
                        {`继承全局（${defaultModel || '尚未选择'}）`}
                      </option>
                      {modelChoices.map((assignment) => (
                        <option
                          value={assignmentValue(assignment)}
                          key={assignmentValue(assignment)}
                        >
                          {
                            providers.find(
                              ({ id }) => id === assignment.provider_id,
                            )?.name
                          }{' '}
                          · {assignment.model}
                        </option>
                      ))}
                    </StudioSelect>
                  </StudioLabel>
                ))}
              </div>
            </div>
          ))}
        </StudioCard>
      )}

      <div className="sticky bottom-4 z-10 flex justify-end">
        <StudioButton
          className="min-w-44 rounded-2xl shadow-xl"
          disabled={
            Boolean(pending) ||
            providers.length === 0 ||
            !defaultProviderId ||
            !defaultModel
          }
          onClick={() => void save()}
        >
          {pending === 'save' ? '正在应用…' : '保存并应用到全部 AI'}
        </StudioButton>
      </div>
    </div>
  )
}
