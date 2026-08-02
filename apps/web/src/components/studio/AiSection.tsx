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
  StudioTextArea,
} from './primitives'
import type {
  AiAssignment,
  AiConfig,
  AiProvider,
  AiProviderAdapter,
  AiRole,
  AiTaskKey,
} from './types'

const taskGroups: Array<{
  label: string
  description: string
  tasks: Array<[AiTaskKey, string]>
}> = [
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

const roleDefinitions: Array<{
  slot: AiRole['slot']
  name: string
  description: string
}> = [
  {
    slot: 'material-recognizer',
    name: '素材识别员',
    description: '判断哪些冻结素材适合围绕同一主题合写',
  },
  {
    slot: 'material-analyst',
    name: '素材分析员',
    description: '提取事实、观点、引用和不确定性',
  },
  {
    slot: 'topic-planner',
    name: '选题策划',
    description: '确定受众、角度和文章结构',
  },
  {
    slot: 'writer',
    name: '主笔',
    description: '依据素材和计划完成 Markdown 初稿',
  },
  {
    slot: 'quick-rewriter',
    name: '改写编辑',
    description: '在不改变事实的前提下优化选中内容',
  },
  {
    slot: 'fact-checker',
    name: '事实核验员',
    description: '识别无证据、夸大和矛盾表述',
  },
  {
    slot: 'reviewer',
    name: '终审编辑',
    description: '修正结构、逻辑和表达并输出成稿',
  },
  {
    slot: 'seo-editor',
    name: 'SEO 编辑',
    description: '生成准确自然的标题、摘要和标签',
  },
]

const roleTask: Record<string, AiTaskKey> = {
  'material-recognizer': 'material_grouping',
  'material-analyst': 'material_analysis',
  'topic-planner': 'topic_planning',
  writer: 'writing',
  'quick-rewriter': 'quick_rewrite',
  reviewer: 'review',
  'fact-checker': 'fact_check',
  'seo-editor': 'seo',
}

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
  adapter: provider.adapter,
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
  const [roles, setRoles] = useState<AiRole[]>([])
  const [adapters, setAdapters] = useState<AiProviderAdapter[]>([])
  const [models, setModels] = useState<
    Record<string, Array<{ id: string; name?: string }>>
  >({})
  const [pending, setPending] = useState('')

  useEffect(() => {
    setProviders(config.providers)
    setDefaultProviderId(config.default_provider_id || '')
    setDefaultModel(config.default_model || '')
    setAssignments(config.assignments || {})
    setRoles(config.roles || [])
  }, [config])

  useEffect(() => {
    void studioRequest<{ adapters: AiProviderAdapter[] }>(
      '/marlin/ai/config/adapters',
    )
      .then((result) => setAdapters(result.adapters))
      .catch((error) =>
        notify(error instanceof Error ? error.message : '读取接入器失败', true),
      )
  }, [notify])

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

  const updateRole = (slot: string, patch: Partial<AiRole>) => {
    setRoles((items) =>
      items.map((role) => (role.slot === slot ? { ...role, ...patch } : role)),
    )
  }

  const save = async () => {
    setPending('save')
    try {
      const roleAssignments = Object.fromEntries(
        roles.map((role) => [
          roleTask[role.slot],
          { provider_id: role.provider_id, model: role.model },
        ]),
      )
      const next = await studioRequest<AiConfig>('/marlin/ai/config', {
        method: 'PUT',
        body: studioJson({
          providers: providers.map(prepareProvider),
          default_provider_id: defaultProviderId || undefined,
          default_model: defaultModel || undefined,
          assignments: { ...assignments, ...roleAssignments },
        }),
      })
      setProviders(next.providers)
      setAssignments(next.assignments)
      setDefaultProviderId(next.default_provider_id || '')
      setDefaultModel(next.default_model || '')
      const rolesToSave = roles.length > 0 ? roles : next.roles
      for (const role of rolesToSave) {
        await studioRequest('/marlin/ai/roles', {
          method: 'POST',
          body: studioJson({
            slot: role.slot,
            provider_id: role.provider_id,
            model: role.model,
            system_prompt: role.system_prompt,
            temperature: role.temperature,
            max_tokens: role.max_tokens,
            daily_budget_cents: role.daily_budget_cents,
            enabled: role.enabled,
          }),
        })
      }
      setRoles(rolesToSave)
      notify('模型接入器与 AI 角色提示词已生效')
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

  const addProvider = (adapter: AiProviderAdapter) => {
    const base = cleanId(adapter.name) || 'provider'
    const used = new Set(providers.map(({ id }) => id))
    let id = base
    let index = 2
    while (used.has(id)) id = `${base}-${index++}`
    const provider: AiProvider = {
      id,
      name: adapter.name,
      adapter: adapter.id,
      type: adapter.type,
      api_key: '',
      endpoint: adapter.endpoint,
      append_v1: adapter.append_v1,
      default_model: adapter.default_model,
      enabled: true,
      credential_configured: false,
    }
    setProviders((items) => [...items, provider])
    if (!defaultProviderId) {
      setDefaultProviderId(id)
      setDefaultModel(adapter.default_model)
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
            接入器统一处理不同服务的协议和地址；写作流水线由七个 AI
            角色协作，每个角色都能选择模型并编写自己的系统提示词。
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
            接入器由 Core
            提供并统一用于连接测试、模型发现和实际生成。密钥只保存在
            Core，页面不会回显。
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
                  <StudioLabel label="接入器">
                    <StudioSelect
                      value={provider.adapter || 'openai-compatible'}
                      onChange={(event) => {
                        const adapter = adapters.find(
                          ({ id }) => id === event.target.value,
                        )
                        if (!adapter) return
                        updateProvider(provider.id, {
                          adapter: adapter.id,
                          type: adapter.type,
                          endpoint: adapter.endpoint || provider.endpoint || '',
                          append_v1: adapter.append_v1,
                          default_model:
                            provider.default_model || adapter.default_model,
                        })
                      }}
                    >
                      {adapters.map((adapter) => (
                        <option value={adapter.id} key={adapter.id}>
                          {adapter.name}
                        </option>
                      ))}
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
                      disabled={
                        adapters.find(({ id }) => id === provider.adapter)
                          ?.custom_endpoint === false
                      }
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
          {adapters.map((adapter) => (
            <StudioButton
              key={adapter.id}
              type="button"
              tone="secondary"
              onClick={() => addProvider(adapter)}
            >
              + {adapter.name}
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
            <h3 className="font-semibold">AI 写作角色</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              流水线会按角色依次工作。提示词会作为该角色的系统指令真实发送给所选模型。
            </p>
          </div>
          {roles.length === 0 ? (
            <StudioEmpty>
              先保存模型服务，Core 会建立七个默认角色；随后可立即修改提示词。
            </StudioEmpty>
          ) : (
            <div className="grid gap-4">
              {roleDefinitions.map((definition) => {
                const role = roles.find(({ slot }) => slot === definition.slot)
                if (!role) return null
                const selected = assignmentValue({
                  provider_id: role.provider_id,
                  model: role.model,
                })
                return (
                  <div
                    className="grid gap-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700"
                    key={role.slot}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold">{definition.name}</h4>
                        <p className="mt-1 text-xs text-zinc-500">
                          {definition.description}
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={role.enabled}
                          onChange={(event) =>
                            updateRole(role.slot, {
                              enabled: event.target.checked,
                            })
                          }
                        />
                        启用角色
                      </label>
                    </div>
                    <StudioLabel label="角色模型">
                      <StudioSelect
                        value={selected}
                        onChange={(event) => {
                          const assignment = readAssignmentValue(
                            event.target.value,
                          )
                          if (!assignment) return
                          updateRole(role.slot, assignment)
                        }}
                      >
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
                    <StudioLabel
                      label="系统提示词"
                      hint={`${role.system_prompt.length}/20000`}
                    >
                      <StudioTextArea
                        className="min-h-36 leading-6"
                        maxLength={20_000}
                        value={role.system_prompt}
                        onChange={(event) =>
                          updateRole(role.slot, {
                            system_prompt: event.target.value,
                          })
                        }
                      />
                    </StudioLabel>
                    <details className="rounded-xl bg-zinc-50 p-3 text-sm dark:bg-zinc-950">
                      <summary className="cursor-pointer font-medium">
                        高级参数
                      </summary>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <StudioLabel label="温度" hint="0–2">
                          <StudioInput
                            type="number"
                            min={0}
                            max={2}
                            step={0.05}
                            value={role.temperature}
                            onChange={(event) =>
                              updateRole(role.slot, {
                                temperature: Number(event.target.value),
                              })
                            }
                          />
                        </StudioLabel>
                        <StudioLabel label="最大输出 Token">
                          <StudioInput
                            type="number"
                            min={128}
                            max={128_000}
                            value={role.max_tokens}
                            onChange={(event) =>
                              updateRole(role.slot, {
                                max_tokens: Number(event.target.value),
                              })
                            }
                          />
                        </StudioLabel>
                        <StudioLabel label="每日预算（美分）" hint="0 为不限">
                          <StudioInput
                            type="number"
                            min={0}
                            value={role.daily_budget_cents}
                            onChange={(event) =>
                              updateRole(role.slot, {
                                daily_budget_cents: Number(event.target.value),
                              })
                            }
                          />
                        </StudioLabel>
                      </div>
                    </details>
                  </div>
                )
              })}
            </div>
          )}
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
