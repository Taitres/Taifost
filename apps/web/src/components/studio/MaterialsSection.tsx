'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

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
import type { Material } from './types'

export function MaterialsSection({
  materials,
  reload,
  notify,
}: {
  materials: Material[]
  reload: () => Promise<void>
  notify: (message: string, error?: boolean) => void
}) {
  const [pending, setPending] = useState(false)
  const [form, setForm] = useState({
    title: '',
    kind: 'markdown',
    sourceType: 'manual',
    sourceRef: '',
    content: '',
    originalFilename: '',
  })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setPending(true)
    try {
      if (form.kind === 'url') {
        const result = await studioRequest<{
          deduplicated: boolean
          material: Material
        }>('/marlin/materials/from-url', {
          method: 'POST',
          body: studioJson({
            url: form.sourceRef,
            title: form.title || undefined,
            metadata: { imported_from: 'shiro-studio' },
          }),
        })
        notify(
          result.deduplicated
            ? '链接内容已存在，已追加导入证据'
            : '链接正文已抓取并冻结',
        )
        setForm((value) => ({
          ...value,
          title: '',
          sourceRef: '',
          content: '',
        }))
        await reload()
        return
      }

      const result = await studioRequest<{
        deduplicated: boolean
        material: Material
      }>('/marlin/materials', {
        method: 'POST',
        body: studioJson({
          title: form.title,
          kind: form.kind,
          source_type: form.sourceType,
          source_ref: form.sourceRef || undefined,
          original_filename: form.originalFilename || undefined,
          content: form.content,
          mime_type:
            form.kind === 'markdown'
              ? 'text/markdown'
              : form.kind === 'html'
                ? 'text/html'
                : 'text/plain',
          metadata: { imported_from: 'shiro-studio' },
        }),
      })
      notify(result.deduplicated ? '内容已存在，已追加导入证据' : '素材已冻结')
      setForm((value) => ({
        ...value,
        title: '',
        content: '',
        originalFilename: '',
      }))
      await reload()
    } catch (error) {
      notify(error instanceof Error ? error.message : '导入失败', true)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="grid content-start gap-4">
        <div>
          <p className="text-sm text-zinc-500">冻结、去重、保留导入证据</p>
          <h2 className="text-2xl font-bold tracking-tight">素材库</h2>
        </div>
        {materials.length === 0 ? (
          <StudioEmpty>还没有素材，从右侧导入第一条内容。</StudioEmpty>
        ) : (
          materials.map((material) => (
            <StudioCard key={material.id} className="grid gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{material.title}</h3>
                  <p className="mt-1 font-mono text-xs text-zinc-400">
                    SHA-256 {material.content_hash.slice(0, 16)}…
                  </p>
                </div>
                <StatusPill value={material.status} />
              </div>
              <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {material.content}
              </p>
              {material.analysis && (
                <div className="rounded-xl bg-zinc-50 p-3 text-xs dark:bg-zinc-950">
                  <p className="line-clamp-2 leading-5 text-zinc-500 dark:text-zinc-400">
                    {material.analysis.summary || '分析已完成'}
                  </p>
                  {!!material.analysis.tags?.length && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {material.analysis.tags.slice(0, 8).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-white px-2 py-1 text-zinc-500 dark:bg-zinc-900"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {!!material.analysis.media?.length && (
                    <p className="mt-2 text-zinc-400">
                      图片归档：
                      {
                        material.analysis.media.filter(
                          ({ status }) => status === 'archived',
                        ).length
                      }{' '}
                      成功 /{' '}
                      {
                        material.analysis.media.filter(
                          ({ status }) => status === 'failed',
                        ).length
                      }{' '}
                      失败 /{' '}
                      {
                        material.analysis.media.filter(
                          ({ status }) => status === 'ignored',
                        ).length
                      }{' '}
                      已忽略
                    </p>
                  )}
                  {material.analysis.media
                    ?.filter(({ status }) => status === 'failed')
                    .slice(0, 2)
                    .map((item) => (
                      <p
                        key={item.sourceUrl || item.source_url}
                        className="mt-1 break-all text-red-600 dark:text-red-400"
                      >
                        {item.error}
                      </p>
                    ))}
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>
                  {material.kind} · {material.byte_size} bytes
                </span>
                <div className="flex gap-1">
                  {material.status !== 'archived' && (
                    <>
                      <StudioButton
                        tone="ghost"
                        className="min-h-8 px-2 py-1 text-xs"
                        onClick={async () => {
                          try {
                            await studioRequest(
                              `/marlin/materials/${material.id}/analyze`,
                              {
                                method: 'POST',
                                body: studioJson({
                                  force: false,
                                  archive_images: true,
                                }),
                              },
                            )
                            notify('分析完成；图片归档结果已写入素材')
                            await reload()
                          } catch (error) {
                            notify(
                              error instanceof Error
                                ? error.message
                                : '分析失败',
                              true,
                            )
                          }
                        }}
                      >
                        {material.status === 'pending'
                          ? '重试图片并分析'
                          : material.analysis
                            ? '查看分析'
                            : '分析'}
                      </StudioButton>
                      {material.status === 'pending' && (
                        <StudioButton
                          tone="ghost"
                          className="min-h-8 px-2 py-1 text-xs text-amber-700 dark:text-amber-300"
                          onClick={async () => {
                            try {
                              await studioRequest(
                                `/marlin/materials/${material.id}/analyze`,
                                {
                                  method: 'POST',
                                  body: studioJson({
                                    force: true,
                                    archive_images: false,
                                    ignore_failed_images: true,
                                  }),
                                },
                              )
                              notify('已明确忽略远程图片，素材可进入创作')
                              await reload()
                            } catch (error) {
                              notify(
                                error instanceof Error
                                  ? error.message
                                  : '忽略失败',
                                true,
                              )
                            }
                          }}
                        >
                          忽略图片并继续
                        </StudioButton>
                      )}
                      <StudioButton
                        tone="ghost"
                        className="min-h-8 px-2 py-1 text-xs"
                        onClick={async () => {
                          try {
                            await studioRequest(
                              `/marlin/materials/${material.id}/archive`,
                              { method: 'POST' },
                            )
                            notify('素材已归档，原始内容仍保留')
                            await reload()
                          } catch (error) {
                            notify(
                              error instanceof Error
                                ? error.message
                                : '归档失败',
                              true,
                            )
                          }
                        }}
                      >
                        归档
                      </StudioButton>
                    </>
                  )}
                </div>
              </div>
            </StudioCard>
          ))
        )}
      </section>

      <StudioCard className="sticky top-6 grid h-fit gap-4">
        <div>
          <h3 className="font-semibold">导入素材</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            当前支持 Markdown、HTML、JSON、纯文本与公开链接正文。
          </p>
        </div>
        <form className="grid gap-4" onSubmit={submit}>
          <StudioLabel label="标题">
            <StudioInput
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              required={form.kind !== 'url'}
            />
          </StudioLabel>
          <div className="grid grid-cols-2 gap-3">
            <StudioLabel label="内容类型">
              <StudioSelect
                value={form.kind}
                onChange={(event) =>
                  setForm({ ...form, kind: event.target.value })
                }
              >
                <option value="markdown">Markdown</option>
                <option value="html">HTML</option>
                <option value="json">JSON</option>
                <option value="text">纯文本</option>
                <option value="url">网页正文</option>
              </StudioSelect>
            </StudioLabel>
            <StudioLabel label="来源">
              <StudioSelect
                value={form.sourceType}
                onChange={(event) =>
                  setForm({ ...form, sourceType: event.target.value })
                }
              >
                <option value="manual">手动录入</option>
                <option value="upload">文件上传</option>
                <option value="url">公开链接</option>
                <option value="chatgpt-share">ChatGPT 分享</option>
                <option value="claude-share">Claude 分享</option>
              </StudioSelect>
            </StudioLabel>
          </div>
          <StudioLabel
            label="本地文件"
            hint="Markdown / JSON / HTML / TXT，最大 5MB"
          >
            <StudioInput
              type="file"
              accept=".md,.markdown,.json,.html,.htm,.txt,text/plain,text/markdown,text/html,application/json"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                if (file.size > 5_000_000) {
                  notify('文件超过 5MB，未读取', true)
                  event.target.value = ''
                  return
                }
                const extension = file.name.split('.').pop()?.toLowerCase()
                const kind =
                  extension === 'md' || extension === 'markdown'
                    ? 'markdown'
                    : extension === 'json'
                      ? 'json'
                      : extension === 'html' || extension === 'htm'
                        ? 'html'
                        : 'text'
                setForm({
                  ...form,
                  title: form.title || file.name,
                  kind,
                  sourceType: 'upload',
                  sourceRef: '',
                  content: await file.text(),
                  originalFilename: file.name,
                })
              }}
            />
          </StudioLabel>
          <StudioLabel label="来源地址" hint="可选">
            <StudioInput
              value={form.sourceRef}
              onChange={(event) =>
                setForm({ ...form, sourceRef: event.target.value })
              }
              placeholder={
                form.kind === 'url' ? 'https://…（必填）' : 'https://…'
              }
              required={form.kind === 'url'}
            />
          </StudioLabel>
          {form.kind !== 'url' && (
            <StudioLabel label="原始内容">
              <StudioTextArea
                className="min-h-64 font-mono text-xs leading-6"
                value={form.content}
                onChange={(event) =>
                  setForm({ ...form, content: event.target.value })
                }
                required
              />
            </StudioLabel>
          )}
          <StudioButton disabled={pending}>
            {pending ? '正在导入…' : '冻结并导入'}
          </StudioButton>
        </form>
      </StudioCard>
    </div>
  )
}
