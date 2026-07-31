'use client'

import { useMemo, useState } from 'react'

import { API_URL, GATEWAY_URL } from '~/constants/env'

import { StudioButton } from './primitives'
import { nativeConsoleUrl } from './unified-admin'

const gatewayUrl = () => GATEWAY_URL || API_URL.replace(/\/api\/v\d+\/?$/i, '')

interface NativeConsoleSectionProps {
  legacyHash?: string
  onBack: () => void
  onLogout: () => void
}

export function NativeConsoleSection({
  legacyHash = '',
  onBack,
  onLogout,
}: NativeConsoleSectionProps) {
  const [frameVersion, setFrameVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const source = useMemo(
    () => nativeConsoleUrl(gatewayUrl(), legacyHash),
    [legacyHash],
  )

  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#f5f4ef] text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="z-10 border-b border-zinc-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/95 sm:px-6">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-black text-white transition hover:opacity-80 dark:bg-white dark:text-zinc-950"
              aria-label="返回内容生产"
            >
              M
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-tight">
                统一管理后台 <span className="text-zinc-300">/</span> MX Space
                基础管理
              </p>
              <p className="hidden truncate text-xs text-zinc-400 sm:block">
                文章·手记·页面 · 评论·友链·文件 · Core 设置·集成
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StudioButton tone="secondary" onClick={onBack}>
              返回内容生产
            </StudioButton>
            <StudioButton
              tone="ghost"
              onClick={() => {
                setLoading(true)
                setFrameVersion((version) => version + 1)
              }}
            >
              刷新
            </StudioButton>
            <StudioButton
              tone="ghost"
              onClick={() =>
                window.open(source, '_blank', 'noopener,noreferrer')
              }
            >
              新窗口
            </StudioButton>
            <StudioButton tone="ghost" onClick={onLogout}>
              退出
            </StudioButton>
          </div>
        </div>
      </header>

      <div className="relative min-h-[720px] flex-1 bg-white dark:bg-zinc-900">
        {loading && (
          <div className="absolute inset-0 z-[1] flex items-center justify-center bg-white text-sm text-zinc-500 dark:bg-zinc-900">
            正在进入 MX Space 基础管理…
          </div>
        )}
        <iframe
          key={frameVersion}
          src={source}
          title="MX Space 基础管理"
          className="absolute inset-0 size-full border-0"
          allow="clipboard-read; clipboard-write"
          onLoad={() => setLoading(false)}
        />
      </div>
    </main>
  )
}
