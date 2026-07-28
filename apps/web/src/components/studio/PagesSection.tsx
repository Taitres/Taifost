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
  StudioTextArea,
} from './primitives'
import type { CorePage } from './types'

const emptyForm = {
  title: '',
  slug: '',
  subtitle: '',
  text: '',
  order: '1',
}

export function PagesSection({
  pages,
  reload,
  notify,
}: {
  pages: CorePage[]
  reload: () => Promise<void>
  notify: (message: string, error?: boolean) => void
}) {
  const [selectedId, setSelectedId] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const page = pages.find(({ id }) => id === selectedId)
    if (!page) {
      setForm(emptyForm)
      return
    }
    setForm({
      title: page.title,
      slug: page.slug,
      subtitle: page.subtitle || '',
      text: page.text,
      order: String(page.order),
    })
  }, [pages, selectedId])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setPending(true)
    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        subtitle: form.subtitle || null,
        text: form.text,
        content_format: 'markdown',
        order: Number(form.order),
        images: [],
        meta: { editor: 'shiro-studio', review_bypass: true },
      }
      if (selectedId) {
        await studioRequest(`/pages/${selectedId}`, {
          method: 'PUT',
          body: studioJson(payload),
        })
        notify('独立页面已更新并立即生效')
      } else {
        const created = await studioRequest<CorePage>('/pages', {
          method: 'POST',
          headers: { 'idempotency-key': crypto.randomUUID() },
          body: studioJson(payload),
        })
        setSelectedId(created.id)
        notify('独立页面已创建并立即生效')
      }
      await reload()
    } catch (error) {
      notify(error instanceof Error ? error.message : '页面保存失败', true)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="grid h-fit gap-3 xl:sticky xl:top-6">
        <div>
          <p className="text-sm text-zinc-500">直接写入 Core，不经过审阅</p>
          <h2 className="text-2xl font-bold tracking-tight">独立页面</h2>
        </div>
        <StudioButton
          tone="secondary"
          onClick={() => {
            setSelectedId('')
            setForm(emptyForm)
          }}
        >
          新建页面
        </StudioButton>
        {pages.length === 0 ? (
          <StudioEmpty>还没有独立页面。</StudioEmpty>
        ) : (
          pages.map((page) => (
            <button
              key={page.id}
              className={`rounded-2xl border p-4 text-left transition ${
                page.id === selectedId
                  ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                  : 'border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900'
              }`}
              onClick={() => setSelectedId(page.id)}
            >
              <p className="truncate font-semibold">{page.title}</p>
              <p className="mt-1 truncate font-mono text-xs opacity-60">
                /{page.slug}
              </p>
            </button>
          ))
        )}
      </aside>

      <StudioCard>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              REVIEW BYPASS
            </p>
            <h3 className="font-semibold">
              {selectedId ? '编辑页面' : '创建页面'}
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              适用于关于、友链说明、使用条款等无需外部审阅的固定内容。
            </p>
          </div>
          {selectedId && (
            <div className="flex gap-2">
              <StudioButton
                tone="ghost"
                onClick={() => window.open(`/${form.slug}`, '_blank')}
              >
                查看页面
              </StudioButton>
              <StudioButton
                tone="danger"
                onClick={async () => {
                  if (
                    !window.confirm('确认删除这个独立页面？此操作不可撤销。')
                  ) {
                    return
                  }
                  try {
                    await studioRequest(`/pages/${selectedId}`, {
                      method: 'DELETE',
                    })
                    setSelectedId('')
                    setForm(emptyForm)
                    notify('独立页面已删除')
                    await reload()
                  } catch (error) {
                    notify(
                      error instanceof Error ? error.message : '页面删除失败',
                      true,
                    )
                  }
                }}
              >
                删除
              </StudioButton>
            </div>
          )}
        </div>
        <form className="grid gap-4" onSubmit={save}>
          <div className="grid gap-3 md:grid-cols-2">
            <StudioLabel label="页面标题">
              <StudioInput
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                required
              />
            </StudioLabel>
            <StudioLabel label="固定链接">
              <StudioInput
                value={form.slug}
                onChange={(event) =>
                  setForm({ ...form, slug: event.target.value })
                }
                placeholder="about"
                required
              />
            </StudioLabel>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
            <StudioLabel label="副标题" hint="可选">
              <StudioInput
                value={form.subtitle}
                onChange={(event) =>
                  setForm({ ...form, subtitle: event.target.value })
                }
              />
            </StudioLabel>
            <StudioLabel label="导航顺序">
              <StudioInput
                type="number"
                min="0"
                value={form.order}
                onChange={(event) =>
                  setForm({ ...form, order: event.target.value })
                }
                required
              />
            </StudioLabel>
          </div>
          <StudioLabel label="Markdown 正文">
            <StudioTextArea
              className="min-h-[520px] font-mono text-sm leading-7"
              value={form.text}
              onChange={(event) =>
                setForm({ ...form, text: event.target.value })
              }
              required
            />
          </StudioLabel>
          <StudioButton disabled={pending}>
            {pending ? '正在保存…' : selectedId ? '更新并立即生效' : '创建页面'}
          </StudioButton>
        </form>
      </StudioCard>
    </div>
  )
}
