'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

import { StudioApiError, studioLogin } from '~/lib/studio-api'

import {
  StudioButton,
  StudioCard,
  StudioInput,
  StudioLabel,
} from './primitives'

export function StudioLogin({
  onSuccess,
}: {
  onSuccess: (token?: string) => void
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      const result = await studioLogin(username, password)
      if (result.user?.role !== 'owner') {
        throw new Error('该账号不是站点所有者')
      }
      onSuccess(result.token)
    } catch (error) {
      setError(
        error instanceof StudioApiError || error instanceof Error
          ? error.message
          : '登录失败',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f4ef] px-5 py-12 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="pointer-events-none absolute -left-32 top-0 size-96 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-700/10" />
      <div className="pointer-events-none absolute -right-32 bottom-0 size-[28rem] rounded-full bg-sky-300/25 blur-3xl dark:bg-sky-700/10" />
      <StudioCard className="relative w-full max-w-md border-white/80 bg-white/85 p-8 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="mb-8">
          <div className="mb-5 inline-flex size-11 items-center justify-center rounded-2xl bg-zinc-950 text-lg font-black text-white dark:bg-white dark:text-zinc-950">
            M
          </div>
          <p className="text-xs font-bold tracking-[0.22em] text-zinc-400">
            MARLIN.LOG · TAIFOST + CORE V3
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            站主管理后台
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            使用 Core 站点所有者账号登录。粘贴链接或 Markdown，AI
            会直接交付可编辑的文章初稿。
          </p>
        </div>

        <div className="mb-7 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
          {[
            '链接自动抓取',
            'Markdown 成稿',
            'AI 自动补全',
            '随时修改',
            '一键发布',
            '高级功能可选',
          ].map((capability) => (
            <span
              key={capability}
              className="rounded-xl bg-zinc-100 px-2 py-2 dark:bg-zinc-800"
            >
              {capability}
            </span>
          ))}
        </div>

        <form className="grid gap-5" onSubmit={submit}>
          <StudioLabel label="用户名">
            <StudioInput
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Core 用户名"
              required
            />
          </StudioLabel>
          <StudioLabel label="密码">
            <StudioInput
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </StudioLabel>
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </p>
          )}
          <StudioButton className="mt-1 w-full" disabled={pending}>
            {pending ? '正在登录…' : '进入管理后台'}
          </StudioButton>
        </form>
      </StudioCard>
    </main>
  )
}
