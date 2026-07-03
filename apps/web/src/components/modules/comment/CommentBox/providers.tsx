'use client'

import type { CommentModel } from '@mx-space/api-client'
import { atom } from 'jotai'
import type { FC, PropsWithChildren } from 'react'
import { createContext, memo, useEffect, useMemo } from 'react'

import { useBeforeMounted } from '~/hooks/common/use-before-mounted'
import { atomWithSafeStorage } from '~/lib/safe-storage'
import { jotaiStore } from '~/lib/store'

import type { CommentAnchor } from '../types'
import { setCommentActionLeftSlot, useCommentActionLeftSlot } from './hooks'

export const commentStoragePrefix = 'comment-'
export const createInitialValue = () => ({
  refId: atom(''),

  text: atom(''),
  author: atomWithSafeStorage(`${commentStoragePrefix}author`, ''),
  mail: atomWithSafeStorage(`${commentStoragePrefix}mail`, ''),
  url: atomWithSafeStorage(`${commentStoragePrefix}url`, ''),

  avatar: atom(''),
  source: atom(''),

  anchor: atom<CommentAnchor | null>(null),

  // settings
  isWhisper: atomWithSafeStorage(`${commentStoragePrefix}is-whisper`, false),
  syncToRecently: atomWithSafeStorage(
    `${commentStoragePrefix}sync-to-recently`,
    true,
  ),
})
export const CommentBoxContext = createContext<
  ReturnType<typeof createInitialValue>
>(null!)

export const CommentBoxLifeCycleContext = createContext<{
  afterSubmit?: () => void
}>(null!)

export const CommentBoxProvider = (
  props: PropsWithChildren & {
    refId: string
    afterSubmit?: () => void
    initialValue?: string
    anchor?: CommentAnchor | null
  },
) => {
  const { refId, children, afterSubmit, initialValue, anchor } = props

  const ctxValue = useMemo(
    () => ({
      ...createInitialValue(),
      refId: atom(refId),
    }),
    [refId],
  )
  useBeforeMounted(() => {
    if (initialValue) {
      jotaiStore.set(ctxValue.text, initialValue)
    }
    if (anchor) {
      jotaiStore.set(ctxValue.anchor, anchor)
    }
  })
  return (
    <CommentBoxContext key={refId} value={ctxValue}>
      <CommentBoxLifeCycleContext
        value={useMemo(() => ({ afterSubmit }), [afterSubmit])}
      >
        {children}
      </CommentBoxLifeCycleContext>
    </CommentBoxContext>
  )
}

export const CommentCompactContext = createContext(false)

export const CommentIsReplyContext = createContext(false)
export const CommentOriginalRefIdContext = createContext('')
export const CommentCompletedCallbackContext = createContext<
  null | ((comment: CommentModel) => void)
>(null)
export const CommentIsReplyProvider = (
  props: PropsWithChildren<{
    isReply: boolean
    originalRefId: string
    onCompleted?: (comment: CommentModel) => void
  }>,
) => {
  const { isReply, originalRefId, onCompleted, children } = props
  return (
    <CommentOriginalRefIdContext value={originalRefId}>
      <CommentIsReplyContext value={isReply}>
        <CommentCompletedCallbackContext value={onCompleted || null}>
          {children}
        </CommentCompletedCallbackContext>
      </CommentIsReplyContext>
    </CommentOriginalRefIdContext>
  )
}

export const CommentBoxSlotPortal = memo((props: PropsWithChildren) => {
  const { children } = props
  useEffect(() => {
    setCommentActionLeftSlot(children)
    return () => {
      setCommentActionLeftSlot(null)
    }
  }, [children])
  return null
})

export const CommentBoxSlotProvider: FC = memo(() => useCommentActionLeftSlot())

CommentBoxSlotProvider.displayName = 'CommentBoxSlotProvider'
CommentBoxSlotPortal.displayName = 'CommentBoxSlotPortal'
