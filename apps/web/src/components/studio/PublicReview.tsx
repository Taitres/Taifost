'use client'

import type { FormEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { studioJson, studioRequest } from '~/lib/studio-api'

import {
  StatusPill,
  StudioButton,
  StudioCard,
  StudioInput,
  StudioLabel,
  StudioTextArea,
} from './primitives'
import type { Revision } from './types'

interface ReviewPreview {
  request: {
    id: string
    status: string
    expires_at: string
  }
  project: { id: string; title: string }
  revision: Revision
}

export function PublicReview({ reviewId }: { reviewId: string }) {
  const [passcode, setPasscode] = useState('')
  const [preview, setPreview] = useState<ReviewPreview | null>(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState('')
  const [magicLink, setMagicLink] = useState(false)
  const autoUnlockAttemptedRef = useRef(false)
  const idempotencyKeyRef = useRef(
    globalThis.crypto?.randomUUID?.() ??
      `review-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  )

  const unlockWithPasscode = useCallback(
    async (value: string) => {
      setPending(true)
      setError('')
      try {
        const result = await studioRequest<ReviewPreview>(
          `/marlin/reviews/${reviewId}/preview`,
          {
            method: 'POST',
            body: studioJson({ passcode: value }),
          },
        )
        setPreview(result)
      } catch (error) {
        setError(error instanceof Error ? error.message : '无法打开审阅')
      } finally {
        setPending(false)
      }
    },
    [reviewId],
  )

  useEffect(() => {
    if (autoUnlockAttemptedRef.current) return
    const value = new URLSearchParams(window.location.search).get('passcode')
    if (!value || !/^\d{6}$/.test(value)) return
    autoUnlockAttemptedRef.current = true
    setMagicLink(true)
    setPasscode(value)
    void unlockWithPasscode(value)
  }, [unlockWithPasscode])

  const unlock = (event: FormEvent) => {
    event.preventDefault()
    void unlockWithPasscode(passcode)
  }

  const decide = async (decision: 'approve' | 'reject') => {
    setPending(true)
    setError('')
    try {
      const result = await studioRequest<{ replayed: boolean }>(
        `/marlin/reviews/${reviewId}/decision`,
        {
          method: 'POST',
          body: studioJson({
            passcode,
            decision,
            comment: comment || undefined,
            idempotency_key: idempotencyKeyRef.current,
          }),
        },
      )
      setDone(
        result.replayed
          ? '该决定已经提交，本次返回原结果。'
          : decision === 'approve'
            ? '已批准这个精确修订。文章尚未自动发布。'
            : '已退回修改。所有者可以创建新修订后重新送审。',
      )
      setPreview((value) =>
        value
          ? {
              ...value,
              request: {
                ...value.request,
                status: decision === 'approve' ? 'approved' : 'rejected',
              },
            }
          : value,
      )
    } catch (error) {
      setError(error instanceof Error ? error.message : '提交失败')
    } finally {
      setPending(false)
    }
  }

  if (!preview) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f4ef] px-5 py-12 dark:bg-zinc-950 dark:text-zinc-100">
        <StudioCard className="w-full max-w-md p-8">
          <p className="text-xs font-bold tracking-[0.2em] text-zinc-400">
            MARLIN REVIEW
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">打开审阅</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {magicLink
              ? '正在验证一次性审核链接。'
              : '输入所有者单独提供的六位口令。'}
          </p>
          <form className="mt-7 grid gap-4" onSubmit={unlock}>
            <StudioLabel label="六位口令">
              <StudioInput
                className="text-center font-mono text-2xl font-black tracking-[0.35em]"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={passcode}
                onChange={(event) =>
                  setPasscode(event.target.value.replaceAll(/\D/g, ''))
                }
                required
              />
            </StudioLabel>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <StudioButton disabled={pending || passcode.length !== 6}>
              {pending ? '正在验证…' : '查看修订'}
            </StudioButton>
          </form>
        </StudioCard>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f4ef] px-5 py-8 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100 sm:px-8 lg:py-14">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="min-w-0 rounded-3xl border border-zinc-200 bg-white px-6 py-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:px-10 sm:py-12">
          <div className="mb-8 border-b border-zinc-100 pb-7 dark:border-zinc-800">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusPill value={preview.request.status} />
              <span className="text-xs text-zinc-400">
                修订 v{preview.revision.version}
              </span>
            </div>
            <p className="text-sm text-zinc-500">{preview.project.title}</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">
              {preview.revision.title}
            </h1>
            {preview.revision.summary && (
              <p className="mt-4 text-lg leading-8 text-zinc-500">
                {preview.revision.summary}
              </p>
            )}
          </div>
          <div className="whitespace-pre-wrap font-serif text-[17px] leading-8 text-zinc-800 dark:text-zinc-200">
            {preview.revision.content}
          </div>
        </article>

        <aside className="h-fit lg:sticky lg:top-8">
          <StudioCard className="grid gap-4 p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                DECISION
              </p>
              <h2 className="mt-1 text-xl font-bold">审阅决定</h2>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                决定只作用于当前修订 ID。批准不等于发布。
              </p>
            </div>
            <StudioLabel label="审阅意见" hint="可选">
              <StudioTextArea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="指出需要修改的事实、结构或表达"
              />
            </StudioLabel>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {done ? (
              <p className="rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                {done}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <StudioButton
                  tone="danger"
                  disabled={pending || preview.request.status !== 'pending'}
                  onClick={() => void decide('reject')}
                >
                  退回修改
                </StudioButton>
                <StudioButton
                  disabled={pending || preview.request.status !== 'pending'}
                  onClick={() => void decide('approve')}
                >
                  批准修订
                </StudioButton>
              </div>
            )}
            <p className="text-xs text-zinc-400">
              到期时间：
              {new Date(preview.request.expires_at).toLocaleString('zh-CN')}
            </p>
          </StudioCard>
        </aside>
      </div>
    </main>
  )
}
