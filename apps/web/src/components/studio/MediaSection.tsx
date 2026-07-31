'use client'

import { StatusPill, StudioCard, StudioEmpty } from './primitives'
import type { MediaAsset } from './types'

export function MediaSection({ media }: { media: MediaAsset[] }) {
  const unused = media.filter(({ usage }) => usage === 'unused').length
  const unresolved = media.filter(({ usage }) => usage === 'unresolved').length

  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">
            OpenList 归档、引用关系与失败状态
          </p>
          <h2 className="text-2xl font-bold tracking-tight">媒体归档</h2>
        </div>
        <p className="text-sm text-zinc-500">
          {media.length} 个文件 · {unused} 个未使用 · {unresolved} 个待处理
        </p>
      </div>

      {media.length === 0 ? (
        <StudioEmpty>
          暂无媒体。分析带远程图片的素材后，归档结果会出现在这里。
        </StudioEmpty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {media.map((asset) => (
            <StudioCard
              key={asset.archived_url || asset.source_url}
              className="overflow-hidden p-0"
            >
              {asset.archived_url ? (
                // OpenList public URLs are intentionally rendered directly.
                <img
                  src={asset.archived_url}
                  alt=""
                  loading="lazy"
                  className="aspect-video w-full bg-zinc-100 object-cover dark:bg-zinc-800"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-zinc-100 px-6 text-center text-xs text-zinc-400 dark:bg-zinc-800">
                  图片尚未归档
                </div>
              )}
              <div className="grid gap-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <StatusPill value={asset.usage} />
                  <span className="text-xs text-zinc-400">
                    {asset.byte_size
                      ? `${Math.ceil(asset.byte_size / 1024)} KB`
                      : asset.status}
                  </span>
                </div>
                <a
                  href={asset.archived_url || asset.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="line-clamp-2 break-all text-xs text-zinc-500 underline decoration-zinc-300 underline-offset-4"
                >
                  {asset.archived_url || asset.source_url}
                </a>
                <p className="text-xs text-zinc-400">
                  来源素材：
                  {asset.materials.map(({ title }) => title).join('、')}
                </p>
                {asset.usage === 'used' ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    已被 {asset.used_by.length} 篇正式内容引用
                  </p>
                ) : asset.usage === 'unused' ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    未被文章或独立页面引用，可人工检查后清理
                  </p>
                ) : (
                  <p className="break-words text-xs text-red-600 dark:text-red-400">
                    {asset.error || '等待归档或已由站主明确忽略'}
                  </p>
                )}
              </div>
            </StudioCard>
          ))}
        </div>
      )}
    </section>
  )
}
