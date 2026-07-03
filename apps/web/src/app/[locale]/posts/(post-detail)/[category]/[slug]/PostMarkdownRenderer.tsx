'use client'

import { useTranslation } from '~/atoms/translation'
import { MainMarkdown } from '~/components/ui/markdown'
import { useCurrentPostDataSelector } from '~/providers/post/CurrentPostDataProvider'

export const PostMarkdownRenderer = () => {
  const text = useCurrentPostDataSelector((data) => data?.text)
  if (!text) return null
  return (
    <MainMarkdown
      allowsScript
      value={text}
      className="min-w-0 overflow-hidden"
    />
  )
}

export const PostTranslationMarkdownRenderer = () => {
  const providerTranslationText = useCurrentPostDataSelector(
    (data) => (data as any)?.translation?.text,
  )
  const atomTranslation = useTranslation()
  const translationText = atomTranslation?.text || providerTranslationText
  if (!translationText) return null
  return (
    <MainMarkdown
      allowsScript
      value={translationText}
      className="min-w-0 overflow-hidden"
    />
  )
}
